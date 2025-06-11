import { VOD, User, Stream, Category } from "../models/index.js";
import { AppError, handleServiceError } from "../utils/errorHandler.js";
import {
  uploadToB2AndGetPresignedUrl,
  deleteFileFromB2,
  generatePresignedUrlForExistingFile,
} from "../lib/b2.service.js";
import {
  getVideoDurationInSeconds,
  generateThumbnailFromVideo,
} from "../utils/videoUtils.js";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { spawn } from "child_process";
import dotenv from "dotenv";
import { Readable } from "stream";
import { Op } from "sequelize";
import { Sequelize } from "sequelize";
import redisClient from "../lib/redis.js";
import notificationService from "./notificationService.js";
import logger from "../utils/logger.js";
import notificationQueue from "../queues/notificationQueue.js";
import followService from "./followService.js";

dotenv.config();

// Cache để lưu trữ lượt xem gần đây (vodId -> Map(userIdOrIp -> timestamp))
// const recentViewsCache = new Map(); // Loại bỏ cache Map trong bộ nhớ
const VIEW_COOLDOWN_MS = 5 * 60 * 1000; // 5 phút (tính bằng mili giây)

// Helper function to format duration for FFmpeg timestamp
const formatDurationForFFmpeg = (totalSecondsParam) => {
  let totalSeconds = totalSecondsParam;
  if (totalSeconds < 0) totalSeconds = 0; // Ensure non-negative

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  // Ensure milliseconds are calculated from the fractional part of totalSeconds
  const milliseconds = Math.floor(
    (totalSeconds - Math.floor(totalSeconds)) * 1000
  );

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(3, "0")}.${String(milliseconds).padStart(
    3,
    "0"
  )}`;
};

// Helper function to run FFmpeg/FFprobe commands
const runFFCommand = (command, args) => {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args);
    let output = "";
    let errorOutput = "";

    process.stdout.on("data", (data) => {
      output += data.toString();
    });

    process.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(
          new AppError(
            `FFmpeg/FFprobe command '${command} ${args.join(
              " "
            )}' failed with code ${code}: ${errorOutput}`,
            500
          )
        );
      }
    });

    process.on("error", (err) => {
      reject(
        new AppError(
          `Failed to start FFmpeg/FFprobe command '${command}': ${err.message}`,
          500
        )
      );
    });
  });
};

// Helper function to get video duration using ffprobe
const getVideoDuration = async (filePath) => {
  try {
    const args = [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ];
    const durationStr = await runFFCommand("ffprobe", args);
    const duration = parseFloat(durationStr);
    if (isNaN(duration)) {
      throw new AppError("Could not parse video duration from ffprobe.", 500);
    }
    return Math.round(duration); // Trả về giây, làm tròn
  } catch (error) {
    logger.error(`Error getting video duration for ${filePath}:`, error);
    throw error; // Re-throw để hàm gọi xử lý
  }
};

// Helper function to convert FLV to MP4
const convertFlvToMp4 = async (flvPath, mp4Path) => {
  try {
    // -y: overwrite output files without asking
    // -c:v copy -c:a copy: try to copy codecs first, faster if compatible
    // if not compatible, ffmpeg will transcode. Add specific codec options if needed.
    const args = ["-i", flvPath, "-c:v", "copy", "-c:a", "aac", "-y", mp4Path];
    // Using more robust conversion:
    // const args = ['-i', flvPath, '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-y', mp4Path];
    logger.info(`Converting ${flvPath} to ${mp4Path}...`);
    await runFFCommand("ffmpeg", args);
    logger.info(`Converted ${flvPath} to ${mp4Path} successfully.`);
    return mp4Path;
  } catch (error) {
    logger.error(`Error converting FLV to MP4 for ${flvPath}:`, error);
    // Fallback or specific error handling can be added here
    if (error.message.includes("failed with code 1")) {
      // Common error if codecs are incompatible for direct copy. Try transcoding.
      logger.warn("Initial conversion failed, trying with re-encoding...");
      const transcodeArgs = [
        "-i",
        flvPath,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        "-y",
        mp4Path,
      ];
      try {
        await runFFCommand("ffmpeg", transcodeArgs);
        logger.info(`Re-encoded ${flvPath} to ${mp4Path} successfully.`);
        return mp4Path;
      } catch (transcodeError) {
        logger.error(`Re-encoding also failed for ${flvPath}:`, transcodeError);
        throw transcodeError;
      }
    }
    throw error;
  }
};

// Helper function to extract thumbnail
const extractThumbnail = async (
  videoPath,
  thumbnailPath,
  timestamp = "00:00:05.000"
) => {
  try {
    const args = [
      "-i",
      videoPath,
      "-ss",
      timestamp, // Seek to 5 seconds
      "-vframes",
      "1", // Extract one frame
      "-vf",
      "scale=640:-1", // Scale width to 640px, height auto
      "-y", // Overwrite if exists
      thumbnailPath,
    ];
    logger.info(
      `Extracting thumbnail from ${videoPath} to ${thumbnailPath}...`
    );
    await runFFCommand("ffmpeg", args);
    logger.info(`Extracted thumbnail to ${thumbnailPath} successfully.`);
    return thumbnailPath;
  } catch (error) {
    logger.error(`Error extracting thumbnail from ${videoPath}:`, error);
    throw error;
  }
};

/**
 * Tăng lượt xem cho VOD nếu người dùng chưa xem trong khoảng thời gian cooldown.
 * @param {number} vodId - ID của VOD.
 * @param {string} userIdOrIp - ID người dùng hoặc địa chỉ IP.
 */
const incrementVodViewCount = async (vodId, userIdOrIp) => {
  try {
    const redisKey = `vod_view_cooldown:${vodId}:${userIdOrIp}`;
    logger.info(`Service: [VOD-${vodId}] Checking Redis for key: ${redisKey}`);
    const keyExists = await redisClient.exists(redisKey);
    logger.info(
      `Service: [VOD-${vodId}] Redis key ${redisKey} exists? ${
        keyExists === 1 ? "Yes" : "No"
      }`
    );

    if (keyExists === 1) {
      // redisClient.exists trả về 1 nếu key tồn tại, 0 nếu không
      logger.info(
        `Service: [VOD-${vodId}] View count for by ${userIdOrIp} not incremented due to Redis cooldown.`
      );
      return;
    }

    logger.info(
      `Service: [VOD-${vodId}] Attempting to increment viewCount in DB.`
    );
    const incrementResult = await VOD.increment("viewCount", {
      by: 1,
      where: { id: vodId },
    });

    let affectedRowsCount = 0;
    if (
      Array.isArray(incrementResult) &&
      incrementResult.length > 1 &&
      typeof incrementResult[1] === "number"
    ) {
      affectedRowsCount = incrementResult[1];
    } else if (typeof incrementResult === "number") {
      // Một số trường hợp cũ hơn hoặc dialect khác
      affectedRowsCount = incrementResult;
    } else if (
      Array.isArray(incrementResult) &&
      incrementResult.length > 0 &&
      Array.isArray(incrementResult[0]) &&
      typeof incrementResult[0][1] === "number"
    ) {
      // trường hợp trả về dạng [[instance, changed_boolean_or_count], metadata_count]
      // hoặc [[result_array], count ] - đây là một phỏng đoán dựa trên sự đa dạng của Sequelize
      // Thử lấy từ metadata nếu có dạng phức tạp hơn [[...], count]
      if (
        incrementResult.length > 1 &&
        typeof incrementResult[1] === "number"
      ) {
        affectedRowsCount = incrementResult[1];
      } else if (
        incrementResult[0].length > 1 &&
        typeof incrementResult[0][1] === "number"
      ) {
        // Nếu phần tử đầu tiên là một mảng và phần tử thứ hai của mảng đó là số
        affectedRowsCount = incrementResult[0][1];
      }
    }
    // Fallback: Nếu không chắc, và không có lỗi, có thể coi là thành công nếu VOD tồn tại
    // Tuy nhiên, để an toàn, chúng ta dựa vào affectedRowsCount.

    logger.info(
      `Service: [VOD-${vodId}] affectedRowsCount from DB increment: ${affectedRowsCount}`
    );

    if (affectedRowsCount > 0) {
      logger.info(
        `Service: [VOD-${vodId}] Setting Redis cooldown key: ${redisKey} for ${VIEW_COOLDOWN_MS}ms`
      );
      await redisClient.set(redisKey, "1", "PX", VIEW_COOLDOWN_MS);
      logger.info(
        `Service: [VOD-${vodId}] Incremented view count by ${userIdOrIp}. Cooldown key set in Redis.`
      );
    } else {
      logger.error(
        `Service: [VOD-${vodId}] VOD not found or view count not incremented in DB. affectedRowsCount: ${affectedRowsCount}`
      );
    }
  } catch (error) {
    logger.error(
      `Service: [VOD-${vodId}] Error in incrementVodViewCount for ${userIdOrIp}:`,
      error
    );
    if (error.message.toLowerCase().includes("redis")) {
      logger.error(
        `Service: [VOD-${vodId}] Redis error during view count increment. Proceeding without setting cooldown key.`
      );
    }
  }
};

/**
 * Xử lý file video đã ghi (FLV), chuyển đổi sang MP4, upload lên B2,
 * trích xuất thumbnail, lấy duration, và lưu thông tin VOD vào DB.
 * @param {object} params
 * @param {string} params.streamKey - Khóa của stream.
 * @param {string} params.originalFilePath - Đường dẫn tuyệt đối của file FLV gốc trên server.
 * @param {string} params.originalFileName - Tên file gốc (ví dụ: streamkey.flv).
 * @returns {Promise<VOD>} Đối tượng VOD đã được tạo.
 */
const processRecordedFileToVOD = async ({
  streamKey,
  originalFilePath, // e.g., /mnt/recordings/live/streamkey.flv
  originalFileName, // e.g., streamkey.flv
}) => {
  let mp4FilePath = null;
  // let thumbnailFilePath = null; // Biến này sẽ được thay thế bằng extractedThumbnailTempPath nếu cần
  let b2UploadResponse = null;
  const tempFilesToDeleteOnError = []; // Lưu các file tạm đã tạo để xóa nếu có lỗi sớm

  try {
    // 0. Kiểm tra file gốc tồn tại
    try {
      await fs.access(originalFilePath);
      tempFilesToDeleteOnError.push(originalFilePath); // Thêm vào đây để xóa nếu các bước sau lỗi
    } catch (e) {
      throw new AppError(
        `Original recorded file not found at ${originalFilePath}`,
        404
      );
    }

    // 1. Lấy thông tin Stream từ DB
    const stream = await Stream.findOne({ where: { streamKey } });
    if (!stream) {
      throw new AppError(`Stream with key ${streamKey} not found.`, 404);
    }
    if (!stream.userId) {
      throw new AppError(
        `User ID not found for stream ${streamKey}. Cannot create VOD without owner.`,
        400
      );
    }
    const streamCategoryId = stream.categoryId;

    // 2. Tạo đường dẫn cho file MP4
    const baseName = path.basename(
      originalFileName,
      path.extname(originalFileName)
    );
    const tempDir = path.dirname(originalFilePath);
    mp4FilePath = path.join(tempDir, `${baseName}.mp4`);
    await convertFlvToMp4(originalFilePath, mp4FilePath);
    tempFilesToDeleteOnError.push(mp4FilePath); // Thêm mp4 vào danh sách xóa nếu lỗi

    // 3. Lấy thời lượng video (từ file MP4 đã convert)
    const durationSeconds = await getVideoDurationInSeconds(mp4FilePath);

    // 4. Xử lý Thumbnail
    let finalVodThumbnailInfo = {
      url: null,
      urlExpiresAt: null,
      b2FileId: null,
      b2FileName: null,
    };
    let localThumbnailToUploadPath = null; // Path của file thumbnail tạm sẽ được upload nếu được extract mới
    const timestampForUpload = Date.now();
    const presignedUrlDuration =
      parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS) || 3600 * 24 * 7;

    // Ưu tiên thumbnail từ Stream gốc
    if (stream.b2ThumbnailFileName && stream.b2ThumbnailFileId) {
      logger.info(
        `Service: Ưu tiên sử dụng thumbnail có sẵn từ Stream gốc: ${stream.b2ThumbnailFileName}`
      );
      finalVodThumbnailInfo.b2FileId = stream.b2ThumbnailFileId;
      finalVodThumbnailInfo.b2FileName = stream.b2ThumbnailFileName;

      const imagePresignedUrlDuration =
        parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS_IMAGES) ||
        presignedUrlDuration;
      try {
        finalVodThumbnailInfo.url = await generatePresignedUrlForExistingFile(
          stream.b2ThumbnailFileName,
          imagePresignedUrlDuration
        );
        finalVodThumbnailInfo.urlExpiresAt = new Date(
          Date.now() + imagePresignedUrlDuration * 1000
        );
        logger.info(
          `Service: Đã tạo pre-signed URL cho thumbnail từ Stream: ${finalVodThumbnailInfo.url}`
        );
      } catch (presignError) {
        logger.error(
          `Service: Lỗi khi tạo pre-signed URL cho thumbnail từ Stream (${stream.b2ThumbnailFileName}): ${presignError.message}. Sẽ thử extract thumbnail mới.`
        );
        // Reset để fallback về extract mới
        finalVodThumbnailInfo = {
          url: null,
          urlExpiresAt: null,
          b2FileId: null,
          b2FileName: null,
        };
      }
    }

    // Nếu không có thumbnail từ stream (hoặc có lỗi), thì extract mới
    if (!finalVodThumbnailInfo.b2FileName) {
      logger.info(
        "Service: Stream gốc không có thumbnail hợp lệ hoặc không thể tạo URL. Tiến hành trích xuất thumbnail mới."
      );
      const extractedThumbnailTempPath = path.join(
        tempDir,
        `${baseName}-extracted-thumbnail-${timestampForUpload}.jpg`
      );

      let thumbnailTimestampString;
      if (durationSeconds >= 5) {
        thumbnailTimestampString = "00:00:05.000";
      } else if (durationSeconds >= 1) {
        thumbnailTimestampString = formatDurationForFFmpeg(1);
      } else if (durationSeconds > 0) {
        const seekTime = Math.max(0.001, durationSeconds * 0.1);
        thumbnailTimestampString = formatDurationForFFmpeg(seekTime);
      } else {
        thumbnailTimestampString = "00:00:00.001";
        logger.warn(
          `Video duration is ${durationSeconds}s. Attempting to extract the earliest possible frame for thumbnail for ${mp4FilePath}.`
        );
      }
      logger.info(
        `Service: Trích xuất thumbnail cho ${mp4FilePath} tại ${thumbnailTimestampString}`
      );
      try {
        await extractThumbnail(
          mp4FilePath,
          extractedThumbnailTempPath,
          thumbnailTimestampString
        );
        localThumbnailToUploadPath = extractedThumbnailTempPath;
        tempFilesToDeleteOnError.push(extractedThumbnailTempPath); // Thêm vào danh sách xóa nếu lỗi
        logger.info(
          `Service: Thumbnail mới đã được trích xuất tại: ${localThumbnailToUploadPath}`
        );
      } catch (extractErr) {
        logger.error(
          `Service: Lỗi khi trích xuất thumbnail mới từ video ${mp4FilePath}: ${extractErr.message}. VOD sẽ không có thumbnail.`
        );
        localThumbnailToUploadPath = null;
      }
    }

    // 5. Chuẩn bị stream và thông tin file để upload
    logger.info(`Preparing streams for MP4 file: ${mp4FilePath}`);
    const mp4FileSize = fsSync.statSync(mp4FilePath).size;
    const mp4FileStream = fsSync.createReadStream(mp4FilePath);
    const videoFileNameInB2 = `vods/${baseName}-${timestampForUpload}.mp4`;

    let thumbnailFileStreamForUpload = null;
    let thumbnailFileSizeForUpload = 0;
    let thumbnailFileNameInB2ForUpload = null;
    let thumbnailMimeTypeForUpload = null;

    if (localThumbnailToUploadPath) {
      try {
        await fs.access(localThumbnailToUploadPath);
        thumbnailFileSizeForUpload = fsSync.statSync(
          localThumbnailToUploadPath
        ).size;
        if (thumbnailFileSizeForUpload > 0) {
          thumbnailFileStreamForUpload = fsSync.createReadStream(
            localThumbnailToUploadPath
          );
          thumbnailFileNameInB2ForUpload = `vods/thumbnails/${baseName}-thumb-${timestampForUpload}.jpg`;
          thumbnailMimeTypeForUpload = "image/jpeg";
        } else {
          logger.warn(
            `Service: File thumbnail trích xuất ${localThumbnailToUploadPath} có kích thước 0. Sẽ không upload thumbnail.`
          );
        }
      } catch (thumbAccessErrorOnUpload) {
        logger.error(
          `Service: Không thể truy cập file thumbnail trích xuất ${localThumbnailToUploadPath} để upload: ${thumbAccessErrorOnUpload.message}. Sẽ không upload thumbnail.`
        );
        // Đảm bảo stream và tên file là null nếu không thể truy cập
        thumbnailFileStreamForUpload = null;
        thumbnailFileNameInB2ForUpload = null;
      }
    }

    logger.info(
      `Uploading video stream and thumbnail stream (if extracted) to B2...`
    );
    b2UploadResponse = await uploadToB2AndGetPresignedUrl(
      mp4FileStream,
      mp4FileSize,
      videoFileNameInB2,
      "video/mp4",
      thumbnailFileStreamForUpload,
      thumbnailFileSizeForUpload,
      thumbnailFileNameInB2ForUpload,
      thumbnailMimeTypeForUpload,
      durationSeconds,
      presignedUrlDuration
    );

    // 6. Tạo bản ghi VOD trong DB
    const vodData = {
      streamId: stream.id,
      userId: stream.userId,
      streamKey: streamKey,
      title: stream.title || `VOD for ${streamKey}`,
      description: stream.description || "",
      videoUrl: b2UploadResponse.video.url,
      urlExpiresAt: b2UploadResponse.video.urlExpiresAt,
      b2FileId: b2UploadResponse.video.b2FileId,
      b2FileName: b2UploadResponse.video.b2FileName,
      durationSeconds,
      categoryId: streamCategoryId,
      thumbnailUrl: null, // Default to null
      thumbnailUrlExpiresAt: null,
      b2ThumbnailFileId: null,
      b2ThumbnailFileName: null,
    };

    if (finalVodThumbnailInfo.b2FileName) {
      // Ưu tiên thumbnail từ stream nếu đã lấy được
      vodData.thumbnailUrl = finalVodThumbnailInfo.url;
      vodData.thumbnailUrlExpiresAt = finalVodThumbnailInfo.urlExpiresAt;
      vodData.b2ThumbnailFileId = finalVodThumbnailInfo.b2FileId;
      vodData.b2ThumbnailFileName = finalVodThumbnailInfo.b2FileName;
    } else if (
      b2UploadResponse.thumbnail &&
      b2UploadResponse.thumbnail.b2FileName
    ) {
      // Nếu đã upload thumbnail mới thành công
      vodData.thumbnailUrl = b2UploadResponse.thumbnail.url;
      vodData.thumbnailUrlExpiresAt = b2UploadResponse.thumbnail.urlExpiresAt;
      vodData.b2ThumbnailFileId = b2UploadResponse.thumbnail.b2FileId;
      vodData.b2ThumbnailFileName = b2UploadResponse.thumbnail.b2FileName;
    }

    logger.info("Creating VOD entry in database with data:", {
      ...vodData,
      videoUrl: "HIDDEN",
      thumbnailUrl: vodData.thumbnailUrl ? "HIDDEN" : null,
    });
    const newVod = await createVOD(vodData);
    logger.info(`Service: VOD đã được tạo trong DB với ID: ${newVod.id}`);

    // 7. Dọn dẹp file tạm (FLV, MP4, thumbnail nếu được extract mới)
    // File FLV gốc (originalFilePath) thường sẽ được xóa bởi script gọi processRecordedFileToVOD
    // (ví dụ: script hook của nginx-rtmp sau khi stream kết thúc và file đã được xử lý)
    // Tuy nhiên, nếu nó được thêm vào tempFilesToDeleteOnError ở đầu, nó sẽ được xóa ở đây nếu không có lỗi nào khác.
    // Không xóa originalFilePath ở đây nữa, để cho script ngoài quản lý.
    // Chỉ xóa mp4FilePath và localThumbnailToUploadPath (nếu có)
    if (mp4FilePath) {
      fs.unlink(mp4FilePath).catch((err) =>
        logger.warn(
          `Failed to delete temporary MP4 file ${mp4FilePath}: ${err}`
        )
      );
    }
    if (localThumbnailToUploadPath) {
      // Đã được thêm vào tempFilesToDeleteOnError nếu được tạo
      // fs.unlink(localThumbnailToUploadPath).catch((err) => logger.warn(`Failed to delete temporary thumbnail file ${localThumbnailToUploadPath}: ${err}`));
      // Không cần xóa lại ở đây vì nó đã có trong tempFilesToDeleteOnError và sẽ được xử lý ở khối catch nếu có lỗi trước đó,
      // hoặc sẽ được xóa sau nếu thành công (logic này nên được xem lại)
      // Hiện tại, ta sẽ xóa nó một cách tường minh nếu nó được tạo và không có lỗi gì nghiêm trọng trước đó.
      // Quyết định: Sẽ xóa localThumbnailToUploadPath ở cuối nếu nó được tạo.
      // Điều này đã được xử lý bởi logic `tempFilesToDeleteOnError` và khối catch.
      // Nếu không có lỗi, chúng ta vẫn nên dọn dẹp.
      // File thumbnail đã được upload, file tạm trên disk không cần nữa.
      fs.unlink(localThumbnailToUploadPath).catch((err) =>
        logger.warn(
          `Failed to delete temporary extracted thumbnail file ${localThumbnailToUploadPath}: ${err}`
        )
      );
    }

    logger.info(
      `Service: Xử lý VOD từ file ghi ${originalFileName} thành công. VOD ID: ${newVod.id}`
    );
    return newVod;
  } catch (error) {
    logger.error(
      `Error in processRecordedFileToVOD for streamKey ${streamKey}:`,
      error
    );
    // Logic dọn dẹp file trên B2 nếu đã upload nhưng gặp lỗi
    if (
      b2UploadResponse?.video?.b2FileId &&
      b2UploadResponse?.video?.b2FileName
    ) {
      try {
        logger.warn(
          // Changed to warn as it's a cleanup action
          `Service: Dọn dẹp video ${b2UploadResponse.video.b2FileName} trên B2 do lỗi trong processRecordedFileToVOD.`
        );
        await deleteFileFromB2(
          b2UploadResponse.video.b2FileName,
          b2UploadResponse.video.b2FileId
        );
      } catch (deleteB2Error) {
        logger.error(
          `Service: Lỗi nghiêm trọng khi dọn dẹp video ${b2UploadResponse.video.b2FileName} trên B2:`,
          deleteB2Error
        );
      }
    }
    // Chỉ xóa thumbnail nếu nó được upload MỚI cho VOD này (tức là không phải thumbnail kế thừa)
    if (
      b2UploadResponse?.thumbnail?.b2FileId &&
      b2UploadResponse?.thumbnail?.b2FileName
      // Không cần check finalVodThumbnailInfo.b2FileName !== b2UploadResponse.thumbnail.b2FileName
      // vì nếu finalVodThumbnailInfo có giá trị thì thumbnailFileStreamForUpload sẽ null,
      // và b2UploadResponse.thumbnail sẽ không có giá trị.
    ) {
      try {
        logger.warn(
          // Changed to warn
          `Service: Dọn dẹp thumbnail (mới upload) ${b2UploadResponse.thumbnail.b2FileName} trên B2 do lỗi trong processRecordedFileToVOD.`
        );
        await deleteFileFromB2(
          b2UploadResponse.thumbnail.b2FileName,
          b2UploadResponse.thumbnail.b2FileId
        );
      } catch (deleteB2Error) {
        logger.error(
          `Service: Lỗi nghiêm trọng khi dọn dẹp thumbnail (mới upload) ${b2UploadResponse.thumbnail.b2FileName} trên B2:`,
          deleteB2Error
        );
      }
    }
    handleServiceError(error, "xử lý file ghi hình thành VOD");
  } finally {
    // 9. Xóa file tạm trên server (FLV, MP4, Thumbnail nếu được extract)
    // tempFilesToDeleteOnError đã chứa các file cần xóa
    logger.info("Service: Bắt đầu dọn dẹp file tạm trên server...");
    for (const filePath of tempFilesToDeleteOnError) {
      try {
        if (filePath) {
          await fs.access(filePath);
          await fs.unlink(filePath);
          logger.info(`Successfully deleted temporary file: ${filePath}`);
        }
      } catch (e) {
        if (e.code !== "ENOENT") {
          logger.error(`Failed to delete temporary file ${filePath}:`, e);
        } else {
          logger.info(
            `Temporary file ${filePath} not found for deletion (already deleted or never created).`
          );
        }
      }
    }
  }
};

/**
 * Tạo một bản ghi VOD mới. (Hàm này có thể dùng cho admin upload thủ công)
 * @param {object} vodData - Dữ liệu cho VOD mới.
 * @returns {Promise<VOD>} Đối tượng VOD đã được tạo.
 */
const createVOD = async (vodData) => {
  try {
    logger.info("Attempting to create VOD with data:", {
      userId: vodData.userId,
      title: vodData.title,
      streamId: vodData.streamId,
      videoUrlExists: !!vodData.videoUrl,
      thumbnailUrlExists: !!vodData.thumbnailUrl,
      b2FileId: vodData.b2FileId,
      b2ThumbnailFileId: vodData.b2ThumbnailFileId,
      categoryId: vodData.categoryId,
    });

    if (
      !vodData.userId ||
      !vodData.title ||
      !vodData.videoUrl ||
      !vodData.urlExpiresAt ||
      !vodData.b2FileId ||
      !vodData.b2FileName
    ) {
      throw new AppError(
        "Missing required fields for VOD creation (userId, title, videoUrl, urlExpiresAt, b2FileId, b2FileName).",
        400
      );
    }

    if (vodData.categoryId) {
      const category = await Category.findByPk(vodData.categoryId);
      if (!category) {
        throw new AppError(
          `Category with ID ${vodData.categoryId} not found.`,
          400
        );
      }
    }

    const newVOD = await VOD.create({
      userId: vodData.userId,
      title: vodData.title,
      description: vodData.description,
      videoUrl: vodData.videoUrl,
      urlExpiresAt: new Date(vodData.urlExpiresAt),
      b2FileId: vodData.b2FileId,
      b2FileName: vodData.b2FileName,
      durationSeconds: vodData.durationSeconds || 0,
      thumbnailUrl: vodData.thumbnailUrl || null,
      thumbnailUrlExpiresAt: vodData.thumbnailUrlExpiresAt
        ? new Date(vodData.thumbnailUrlExpiresAt)
        : null,
      b2ThumbnailFileId: vodData.b2ThumbnailFileId || null,
      b2ThumbnailFileName: vodData.b2ThumbnailFileName || null,
      streamId: vodData.streamId || null,
      streamKey: vodData.streamKey || null,
      categoryId: vodData.categoryId || null,
    });

    logger.info(`VOD created successfully with ID: ${newVOD.id}`);

    // Gửi thông báo cho followers
    if (newVOD.userId) {
      const actorUser = await User.findByPk(newVOD.userId, {
        attributes: ["id", "username", "displayName", "avatarUrl"],
      });
      if (actorUser) {
        logger.info(
          `New VOD created (ID: ${newVOD.id}), preparing to notify followers of user ${actorUser.username} (ID: ${actorUser.id}) via BullMQ`
        );
        try {
          const allFollows = await followService.getFollowersInternal(
            actorUser.id
          );
          const followers = allFollows
            .map((follow) => follow.follower) // Lấy object follower từ mỗi mục follow
            .filter((follower) => follower && follower.id && follower.username); // Lọc những follower hợp lệ

          if (followers.length > 0) {
            const batchSize = 10; // Or your preferred batch size
            for (let i = 0; i < followers.length; i += batchSize) {
              const batch = followers.slice(i, i + batchSize);
              const jobData = {
                actionType: "new_vod",
                actorUser: {
                  // Consistent with streamService
                  id: actorUser.id,
                  username: actorUser.username,
                  displayName: actorUser.displayName,
                  avatarUrl: actorUser.avatarUrl,
                },
                entity: { id: newVOD.id, title: newVOD.title },
                followers: batch.map((f) => ({
                  // Send only necessary follower info
                  id: f.id,
                  username: f.username,
                })),
                messageTemplate: `${
                  actorUser.displayName || actorUser.username
                } has published a new VOD: ${newVOD.title || "New Video"}!`,
              };
              await notificationQueue.add(
                "process-notification-batch",
                jobData
              );
              logger.info(
                `Added new_vod notification job to queue for VOD ${
                  newVOD.id
                }, user ${actorUser.id}, batch ${
                  Math.floor(i / batchSize) + 1
                }/${Math.ceil(followers.length / batchSize)}`
              );
            }
            logger.info(
              `Successfully queued all new_vod notification jobs for VOD ${newVOD.id}, user ${actorUser.id}. Total followers: ${followers.length}`
            );
          } else {
            logger.info(
              `User ${actorUser.username} (ID: ${actorUser.id}) has no followers to notify for new VOD ${newVOD.id}.`
            );
          }
        } catch (notifyError) {
          logger.error(
            `Failed to get followers or add notification job for new VOD ${newVOD.id} (user: ${actorUser.id}):`,
            notifyError
          );
        }
      } else {
        logger.warn(
          `Cannot send new_vod notification for VOD ${newVOD.id} because creator user (ID: ${newVOD.userId}) not found.`
        );
      }
    }

    return newVOD;
  } catch (error) {
    logger.error("Error in vodService.createVOD:", error);
    // Giữ nguyên throw error để các hàm gọi (processRecordedFileToVOD, createVODFromUpload) có thể xử lý cleanup nếu cần
    throw error;
  }
};

/**
 * Lấy danh sách VOD với tùy chọn filter và phân trang.
 * @param {object} options - Tùy chọn truy vấn.
 * @returns {Promise<{vods: VOD[], totalItems: number, totalPages: number, currentPage: number}>}
 */
const getVODs = async (options = {}) => {
  try {
    const {
      streamId,
      userId,
      streamKey,
      categoryId,
      page = 1,
      limit = 10,
    } = options;
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (streamId) whereClause.streamId = streamId;
    if (userId) whereClause.userId = userId;
    if (streamKey) whereClause.streamKey = streamKey;
    if (categoryId) whereClause.categoryId = categoryId;

    const { count, rows } = await VOD.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "title",
        "description",
        "viewCount",
        "videoUrl",
        "thumbnailUrl",
        "thumbnailUrlExpiresAt",
        "b2ThumbnailFileId",
        "b2ThumbnailFileName",
        "durationSeconds",
        "createdAt",
        "userId",
        "streamId",
        "streamKey",
        "urlExpiresAt",
        "b2FileName",
        "categoryId",
      ],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "displayName", "avatarUrl"],
        },
        { model: Stream, as: "stream", attributes: ["id", "title"] },
        { model: Category, as: "category", attributes: ["id", "name", "slug"] },
      ],
    });

    // Logic làm mới pre-signed URL nếu cần (ví dụ, chỉ làm mới khi GET chi tiết)
    // Ở đây chỉ trả về, client sẽ tự quyết định có cần refresh không.
    const enrichedVods = rows.map((vod) => {
      const plainVod = vod.get({ plain: true });
      if (plainVod.user) {
        plainVod.user = {
          id: plainVod.user.id,
          username: plainVod.user.username,
          displayName: plainVod.user.displayName,
          avatarUrl: plainVod.user.avatarUrl,
        };
      }
      return plainVod;
    });

    return {
      vods: enrichedVods,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10),
    };
  } catch (error) {
    handleServiceError(error, "lấy danh sách VOD");
  }
};

/**
 * Lấy chi tiết một VOD bằng ID.
 * Sẽ tự động làm mới pre-signed URL nếu nó sắp hết hạn hoặc đã hết hạn.
 * @param {number} vodId - ID của VOD.
 * @param {string} [userIdOrIp] - ID người dùng hoặc địa chỉ IP để theo dõi lượt xem.
 * @returns {Promise<VOD|null>} Đối tượng VOD hoặc null nếu không tìm thấy.
 */
const getVODById = async (vodId, userIdOrIp) => {
  try {
    let vod = await VOD.findByPk(vodId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "displayName", "avatarUrl"],
        },
        {
          model: Stream,
          as: "stream",
          attributes: ["id", "title", "streamKey"],
        },
        { model: Category, as: "category", attributes: ["id", "name", "slug"] },
      ],
    });
    if (!vod) {
      throw new AppError("VOD không tìm thấy.", 404);
    }

    // Tăng lượt xem (bất đồng bộ, không cần await)
    if (userIdOrIp) {
      incrementVodViewCount(vodId, userIdOrIp).catch((err) => {
        logger.error(
          `Service: фоновая ошибка при увеличении счетчика просмотров для VOD ${vodId}:`, // Lỗi nền khi tăng lượt xem
          err
        );
      });
    }

    // Kiểm tra và làm mới pre-signed URL nếu cần
    // Ví dụ: làm mới nếu URL hết hạn trong vòng 1 giờ tới
    const presignedUrlDuration =
      parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS) || 3600 * 24 * 7; // 7 ngày
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 3600 * 1000);

    let urlsRefreshed = false;

    if (!vod.urlExpiresAt || new Date(vod.urlExpiresAt) < oneHourFromNow) {
      if (vod.b2FileName) {
        logger.info(
          `Pre-signed URL for VOD Video ${vodId} (file: ${vod.b2FileName}) is expired or expiring soon. Refreshing...`
        );
        const newViewableUrl = await generatePresignedUrlForExistingFile(
          vod.b2FileName,
          presignedUrlDuration
        );
        vod.videoUrl = newViewableUrl;
        vod.urlExpiresAt = new Date(Date.now() + presignedUrlDuration * 1000);
        urlsRefreshed = true;
        logger.info(
          `Refreshed pre-signed Video URL for VOD ${vodId}. New expiry: ${vod.urlExpiresAt}`
        );
      } else {
        logger.warn(
          `VOD Video ${vodId} needs URL refresh but b2FileName is missing.`
        );
      }
    }

    // Refresh Thumbnail URL if it exists, is a B2 presigned URL, and is expiring
    if (
      vod.thumbnailUrl &&
      vod.b2ThumbnailFileName &&
      (!vod.thumbnailUrlExpiresAt ||
        new Date(vod.thumbnailUrlExpiresAt) < oneHourFromNow)
    ) {
      try {
        // Use B2_PRESIGNED_URL_DURATION_SECONDS_IMAGES for thumbnail refresh duration if available
        const imagePresignedUrlDuration =
          parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS_IMAGES) ||
          presignedUrlDuration;
        logger.info(
          `Pre-signed URL for VOD Thumbnail ${vodId} (file: ${vod.b2ThumbnailFileName}) is expired or expiring soon. Refreshing...`
        );
        const newThumbnailUrl = await generatePresignedUrlForExistingFile(
          vod.b2ThumbnailFileName,
          imagePresignedUrlDuration
        );
        vod.thumbnailUrl = newThumbnailUrl;
        vod.thumbnailUrlExpiresAt = new Date(
          Date.now() + imagePresignedUrlDuration * 1000
        );
        urlsRefreshed = true;
        logger.info(
          `Refreshed pre-signed Thumbnail URL for VOD ${vodId}. New expiry: ${vod.thumbnailUrlExpiresAt}`
        );
      } catch (thumbRefreshError) {
        logger.error(
          `Failed to refresh VOD Thumbnail URL for ${vodId} (file: ${vod.b2ThumbnailFileName}): ${thumbRefreshError.message}`
        );
        // Decide if to proceed with stale URL or throw error
      }
    } else if (
      vod.thumbnailUrl &&
      !vod.b2ThumbnailFileName &&
      (!vod.thumbnailUrlExpiresAt ||
        new Date(vod.thumbnailUrlExpiresAt) < oneHourFromNow)
    ) {
      logger.warn(
        `VOD Thumbnail ${vodId} needs URL refresh but b2ThumbnailFileName is missing.`
      );
    }

    if (urlsRefreshed) {
      await vod.save();
      logger.info(`VOD ${vodId} saved with refreshed URLs.`);
    }

    return vod;
  } catch (error) {
    handleServiceError(error, "lấy chi tiết VOD");
  }
};

/**
 * Xóa một VOD (metadata trong DB và file trên storage).
 * @param {number} vodId - ID của VOD cần xóa.
 * @param {number} requestingUserId - ID của người dùng yêu cầu xóa.
 * @param {boolean} isAdmin - Người dùng có phải là admin không.
 */
const deleteVOD = async (vodId, requestingUserId, isAdmin = false) => {
  try {
    const vod = await VOD.findByPk(vodId);
    if (!vod) {
      throw new AppError("VOD không tìm thấy để xóa.", 404);
    }

    if (!isAdmin && vod.userId !== requestingUserId) {
      throw new AppError("Bạn không có quyền xóa VOD này.", 403);
    }

    // 1. Xóa file trên Backblaze B2 (nếu có b2FileId và b2FileName)
    if (vod.b2FileId && vod.b2FileName) {
      try {
        logger.info(
          `Deleting VOD file from B2: ${vod.b2FileName} (ID: ${vod.b2FileId})`
        );
        await deleteFileFromB2(vod.b2FileName, vod.b2FileId);
        logger.info(`Successfully deleted ${vod.b2FileName} from B2.`);
      } catch (b2Error) {
        // Log lỗi nhưng vẫn tiếp tục xóa bản ghi DB, hoặc throw lỗi tùy theo yêu cầu
        logger.error(
          `Failed to delete VOD file ${vod.b2FileName} from B2. Error: ${b2Error.message}. Proceeding with DB deletion.`
        );
        // throw new AppError(`Lỗi khi xóa file trên B2: ${b2Error.message}`, 500); // Bỏ comment nếu muốn dừng lại khi xóa B2 lỗi
      }
    } else {
      logger.warn(
        `VOD ${vodId} does not have b2FileId or b2FileName. Skipping B2 deletion.`
      );
    }

    // (Tùy chọn) Xóa cả thumbnail trên B2 nếu nó được lưu riêng và có thông tin.

    // 2. Xóa bản ghi VOD khỏi DB
    await vod.destroy();
    logger.info(`VOD record ${vodId} deleted from database successfully.`);
    // Không cần trả về gì, hoặc có thể trả về một thông báo thành công
  } catch (error) {
    handleServiceError(error, "xóa VOD");
  }
};

// Hàm này để refresh URL cho một VOD cụ thể, có thể gọi từ một endpoint riêng
const refreshVODUrl = async (vodId) => {
  try {
    const vod = await VOD.findByPk(vodId);
    if (!vod) {
      throw new AppError("VOD không tìm thấy.", 404);
    }
    if (!vod.b2FileName) {
      throw new AppError(
        "Không có thông tin file trên B2 (b2FileName) để làm mới URL.",
        400
      );
    }

    const presignedUrlDuration =
      parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS) || 3600 * 24 * 7; // 7 ngày
    const newViewableUrl = await generatePresignedUrlForExistingFile(
      vod.b2FileName,
      presignedUrlDuration
    );

    vod.videoUrl = newViewableUrl;
    vod.urlExpiresAt = new Date(Date.now() + presignedUrlDuration * 1000);
    await vod.save();

    logger.info(
      `Successfully refreshed pre-signed URL for VOD ${vodId}. New expiry: ${vod.urlExpiresAt}`
    );
    return {
      id: vod.id,
      videoUrl: vod.videoUrl,
      urlExpiresAt: vod.urlExpiresAt,
    };
  } catch (error) {
    handleServiceError(error, "làm mới URL VOD");
  }
};

/**
 * Xử lý việc tạo VOD từ file upload (local).
 * Bao gồm việc tạo thumbnail (nếu cần), lấy duration, upload lên B2 và lưu DB.
 * @param {object} data
 * @param {number} data.userId
 * @param {string} data.title
 * @param {string} [data.description]
 * @param {string} data.videoFilePath
 * @param {string} data.originalVideoFileName
 * @param {string} data.videoMimeType
 * @param {string} [data.thumbnailFilePath] - Path to thumbnail file (optional)
 * @param {string} [data.originalThumbnailFileName] - Original thumbnail file name (optional)
 * @param {string} [data.thumbnailMimeType] - MIME type of the thumbnail (optional)
 * @param {number} data.categoryId - Category ID for the VOD
 * @returns {Promise<VOD>} Đối tượng VOD đã được tạo.
 */
const createVODFromUpload = async ({
  userId,
  title,
  description,
  videoFilePath,
  originalVideoFileName,
  videoMimeType,
  thumbnailFilePath,
  originalThumbnailFileName,
  thumbnailMimeType,
  categoryId,
}) => {
  let b2VideoFileIdToDelete = null;
  let b2VideoFileNameToDelete = null;
  let b2ThumbFileIdToDelete = null;
  let b2ThumbFileNameToDelete = null;

  try {
    logger.info(
      `Service: Bắt đầu xử lý upload VOD từ file: ${videoFilePath} cho user: ${userId}`
    );

    // 1. Lấy thông tin file video (kích thước, thời lượng)
    const videoStats = await fs.stat(videoFilePath);
    const videoSize = videoStats.size;
    if (videoSize === 0) {
      throw new AppError("Video file is empty.", 400);
    }
    const durationSeconds = await getVideoDurationInSeconds(videoFilePath);
    logger.info(`Service: Thời lượng video: ${durationSeconds} giây.`);

    // 2. Xử lý Thumbnail
    let thumbnailStream = null;
    let thumbnailSize = 0;
    let finalThumbnailMimeType = thumbnailMimeType;
    let finalOriginalThumbnailFileName = originalThumbnailFileName;

    if (thumbnailFilePath) {
      // Người dùng cung cấp thumbnail
      logger.info(
        `Service: Sử dụng thumbnail từ file cung cấp: ${thumbnailFilePath}`
      );
      const thumbStats = await fs.stat(thumbnailFilePath);
      thumbnailSize = thumbStats.size;
      if (thumbnailSize > 0) {
        thumbnailStream = fsSync.createReadStream(thumbnailFilePath);
      }
    } else {
      // Không có thumbnail từ người dùng, thử tạo tự động
      logger.info(
        `Service: Không có thumbnail từ người dùng, thử tạo tự động từ video: ${videoFilePath}`
      );
      const autoThumbnailPath = await generateThumbnailFromVideo(
        videoFilePath,
        durationSeconds
      );
      if (autoThumbnailPath) {
        thumbnailFilePath = autoThumbnailPath; // Cập nhật đường dẫn để xóa sau
        finalOriginalThumbnailFileName = path.basename(autoThumbnailPath);
        finalThumbnailMimeType = "image/jpeg"; // Hoặc image/png tùy theo generateThumbnailFromVideo
        const thumbStats = await fs.stat(autoThumbnailPath);
        thumbnailSize = thumbStats.size;
        if (thumbnailSize > 0) {
          thumbnailStream = fsSync.createReadStream(autoThumbnailPath);
        }
        logger.info(
          `Service: Đã tạo thumbnail tự động tại: ${autoThumbnailPath}`
        );
      } else {
        logger.warn(
          `Service: Không thể tạo thumbnail tự động cho video: ${videoFilePath}`
        );
      }
    }

    // 3. Chuẩn bị tên file trên B2 (Sanitize filenames)
    const safeOriginalVideoFileName = originalVideoFileName.replace(
      /[^a-zA-Z0-9.\-_]/g,
      "_"
    );
    let safeOriginalThumbnailFileName = "";
    if (finalOriginalThumbnailFileName) {
      safeOriginalThumbnailFileName = finalOriginalThumbnailFileName.replace(
        /[^a-zA-Z0-9.\-_]/g,
        "_"
      );
    }

    const videoFileNameInB2 = `users/${userId}/vods/${Date.now()}_${safeOriginalVideoFileName}`;
    let thumbnailFileNameInB2 = null;
    if (thumbnailStream && safeOriginalThumbnailFileName) {
      thumbnailFileNameInB2 = `users/${userId}/vods/thumbnails/${Date.now()}_${safeOriginalThumbnailFileName}`;
    }

    // 4. Tạo video stream
    const videoStream = fsSync.createReadStream(videoFilePath);

    // 5. Upload lên B2
    logger.info("Service: Bắt đầu upload stream file lên B2...");
    const b2Response = await uploadToB2AndGetPresignedUrl(
      videoStream,
      videoSize,
      videoFileNameInB2,
      videoMimeType,
      thumbnailStream,
      thumbnailSize,
      thumbnailFileNameInB2,
      finalThumbnailMimeType,
      durationSeconds
    );
    logger.info(
      `Service: Upload lên B2 thành công: Video - ${
        b2Response.video.b2FileName
      }, Thumbnail - ${b2Response.thumbnail?.b2FileName || "N/A"}`
    );

    b2VideoFileIdToDelete = b2Response.video?.b2FileId;
    b2VideoFileNameToDelete = b2Response.video?.b2FileName;
    b2ThumbFileIdToDelete = b2Response.thumbnail?.b2FileId;
    b2ThumbFileNameToDelete = b2Response.thumbnail?.b2FileName;

    // 6. Tạo bản ghi VOD trong DB
    const vodToCreate = {
      userId,
      title,
      description,
      videoUrl: b2Response.video.url,
      urlExpiresAt: b2Response.video.urlExpiresAt,
      b2FileId: b2Response.video.b2FileId,
      b2FileName: b2Response.video.b2FileName,
      durationSeconds: b2Response.video.durationSeconds,
      thumbnailUrl: null, // Default to null
      thumbnailUrlExpiresAt: null,
      b2ThumbnailFileId: null,
      b2ThumbnailFileName: null,
      categoryId: categoryId,
    };

    if (b2Response.thumbnail && b2Response.thumbnail.url) {
      vodToCreate.thumbnailUrl = b2Response.thumbnail.url;
      vodToCreate.thumbnailUrlExpiresAt = b2Response.thumbnail.urlExpiresAt;
      vodToCreate.b2ThumbnailFileId = b2Response.thumbnail.b2FileId;
      vodToCreate.b2ThumbnailFileName = b2Response.thumbnail.b2FileName;
    } else if (thumbnailStream) {
      // Nếu thumbnail được xử lý (auto-generated hoặc provided) và upload thành công
      // nhưng không có trong b2Response.thumbnail (ví dụ: lỗi logic ở uploadToB2AndGetPresignedUrl)
      // thì cần đảm bảo thông tin này được lưu nếu file thực sự đã lên B2.
      // Tuy nhiên, uploadToB2AndGetPresignedUrl nên trả về thông tin thumbnail nếu nó xử lý thumbnail.
      // Đoạn này giả định rằng nếu thumbnailStream tồn tại, nó ĐÃ được upload và thông tin có trong b2Response.thumbnail
      // Nếu không, cần xem lại logic của uploadToB2AndGetPresignedUrl.
      // Hiện tại, để an toàn, nếu b2Response.thumbnail không có, ta không set các trường thumbnailUrl...
      logger.warn(
        `Service: Thumbnail stream existed but no thumbnail info in B2 response for VOD title: ${title}. Thumbnail might not have been uploaded or processed correctly.`
      );
    }

    logger.info("Creating VOD entry in database with data:", {
      ...vodToCreate,
      videoUrl: "HIDDEN",
      thumbnailUrl: vodToCreate.thumbnailUrl ? "HIDDEN" : null,
    });
    const newVOD = await createVOD(vodToCreate);
    logger.info(`Service: VOD đã được tạo trong DB với ID: ${newVOD.id}`);

    return newVOD;
  } catch (error) {
    logger.error("Service: Lỗi trong createVODFromUpload:", error);
    if (b2VideoFileIdToDelete && b2VideoFileNameToDelete) {
      try {
        logger.info(
          `Service: Dọn dẹp video ${b2VideoFileNameToDelete} trên B2 do lỗi.`
        );
        await deleteFileFromB2(b2VideoFileNameToDelete, b2VideoFileIdToDelete);
      } catch (deleteB2Error) {
        logger.error(
          `Service: Lỗi nghiêm trọng khi dọn dẹp video ${b2VideoFileNameToDelete} trên B2:`,
          deleteB2Error
        );
      }
    }
    if (b2ThumbFileIdToDelete && b2ThumbFileNameToDelete) {
      try {
        logger.info(
          `Service: Dọn dẹp thumbnail ${b2ThumbFileNameToDelete} trên B2 do lỗi.`
        );
        await deleteFileFromB2(b2ThumbFileNameToDelete, b2ThumbFileIdToDelete);
      } catch (deleteB2Error) {
        logger.error(
          `Service: Lỗi nghiêm trọng khi dọn dẹp thumbnail ${b2ThumbFileNameToDelete} trên B2:`,
          deleteB2Error
        );
      }
    }
    if (error instanceof AppError) throw error;
    throw new AppError(`Lỗi khi xử lý upload VOD: ${error.message}`, 500);
  }
};

/**
 * Search for VODs by tag, searchQuery (title, description), and/or uploaderUsername.
 * @param {object} options
 * @param {string} [options.tag] - The tag to search for.
 * @param {string} [options.searchQuery] - Text to search in title and description.
 * @param {string} [options.uploaderUsername] - Username of the VOD uploader.
 * @param {number} [options.page=1] - Current page for pagination.
 * @param {number} [options.limit=10] - Number of items per page.
 * @returns {Promise<{vods: VOD[], totalItems: number, totalPages: number, currentPage: number}>}
 */
const searchVODs = async ({
  tag,
  searchQuery,
  uploaderUsername,
  page = 1,
  limit = 10,
}) => {
  try {
    logger.info(
      `Service: Searching VODs with tag: "${tag}", query: "${searchQuery}", user: "${uploaderUsername}", page: ${page}, limit: ${limit}`
    );
    const offset = (page - 1) * limit;
    const whereClause = {}; // For VOD model
    const includeClauses = [
      {
        model: User,
        as: "user",
        attributes: ["id", "username", "displayName", "avatarUrl"],
      },
      {
        model: Category,
        as: "category",
        attributes: ["id", "name", "slug", "tags"],
      },
      // Không cần include Stream ở đây trừ khi có yêu cầu filter/search cụ thể liên quan đến Stream
      // { model: Stream, as: "stream", attributes: ["id", "title"] },
    ];

    if (tag) {
      const lowercasedTag = tag.toLowerCase().replace(/'/g, "''");
      // Tìm categories chứa tag (không phân biệt chữ hoa chữ thường)
      const categoriesWithTag = await Category.findAll({
        where: Sequelize.literal(
          `EXISTS (SELECT 1 FROM unnest(tags) AS t(tag_element) WHERE LOWER(t.tag_element) = '${lowercasedTag}')`
        ),
        attributes: ["id"],
      });

      if (!categoriesWithTag || categoriesWithTag.length === 0) {
        logger.info(`Service: No categories found with tag: "${tag}" for VODs`);
        return {
          vods: [],
          totalItems: 0,
          totalPages: 0,
          currentPage: parseInt(page, 10),
        };
      }
      const categoryIds = categoriesWithTag.map((cat) => cat.id);
      whereClause.categoryId = { [Op.in]: categoryIds };
    }

    if (searchQuery) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${searchQuery}%` } },
        { description: { [Op.iLike]: `%${searchQuery}%` } },
      ];
    }

    if (uploaderUsername) {
      const userWhere = { username: { [Op.iLike]: `%${uploaderUsername}%` } };
      const userInclude = includeClauses.find((inc) => inc.as === "user");
      if (userInclude) {
        userInclude.where = userWhere;
        userInclude.required = true; // Quan trọng: chỉ trả về VODs có user khớp
      } else {
        // Điều này không nên xảy ra nếu include User luôn được thêm vào
        logger.warn(
          "User include clause not found for uploaderUsername VOD search"
        );
      }
    }

    const { count, rows } = await VOD.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "title",
        "videoUrl",
        "thumbnailUrl",
        "thumbnailUrlExpiresAt",
        "durationSeconds",
        "createdAt",
        "userId",
        "categoryId",
        "urlExpiresAt",
        "viewCount", // Thêm viewCount
      ],
      include: includeClauses,
      distinct: true, // Quan trọng cho count khi dùng include phức tạp
    });

    logger.info(`Service: Found ${count} VODs matching criteria.`);

    // Đảm bảo viewCount có trong kết quả trả về
    const enrichedVods = rows.map((vod) => {
      const plainVod = vod.get({ plain: true });
      if (plainVod.user) {
        plainVod.user = {
          id: plainVod.user.id,
          username: plainVod.user.username,
          displayName: plainVod.user.displayName,
          avatarUrl: plainVod.user.avatarUrl,
        };
      }
      return {
        ...plainVod,
        viewCount: plainVod.viewCount !== undefined ? plainVod.viewCount : 0, // Đảm bảo có giá trị mặc định
        // Đảm bảo category được trả về đúng cấu trúc
        category: plainVod.category
          ? {
              id: plainVod.category.id,
              name: plainVod.category.name,
              slug: plainVod.category.slug,
              // tags: plainVod.category.tags // Bỏ tags nếu không cần thiết ở đây hoặc đã có trong category
            }
          : null,
        user: plainVod.user
          ? {
              id: plainVod.user.id,
              username: plainVod.user.username,
              displayName: plainVod.user.displayName,
              avatarUrl: plainVod.user.avatarUrl,
            }
          : null,
      };
    });

    return {
      vods: enrichedVods,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10),
    };
  } catch (error) {
    logger.error(
      `Service: Error searching VODs with tag "${tag}", query "${searchQuery}", user "${uploaderUsername}":`,
      error
    );
    handleServiceError(error, "search VODs");
  }
};

export const vodService = {
  createVOD,
  createVODFromUpload,
  getVODs,
  getVODById,
  deleteVOD,
  processRecordedFileToVOD,
  refreshVODUrl,
  searchVODs,
};
