import { VOD, User, Stream } from "../models/index.js";
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
import path from "path";
import { spawn } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const logger = {
  info: console.log,
  error: console.error,
};

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
  let thumbnailFilePath = null;
  // Biến này sẽ chứa kết quả từ một lần gọi uploadToB2AndGetPresignedUrl
  let b2UploadResponse = null;

  try {
    // 0. Kiểm tra file gốc tồn tại
    try {
      await fs.access(originalFilePath);
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

    // 2. Tạo đường dẫn cho file MP4 và Thumbnail
    const baseName = path.basename(
      originalFileName,
      path.extname(originalFileName)
    );
    const tempDir = path.dirname(originalFilePath);

    mp4FilePath = path.join(tempDir, `${baseName}.mp4`);
    // Đặt tên file thumbnail rõ ràng hơn, ví dụ sử dụng baseName của video
    thumbnailFilePath = path.join(tempDir, `${baseName}-thumbnail.jpg`);

    // 3. Chuyển đổi FLV sang MP4
    await convertFlvToMp4(originalFilePath, mp4FilePath);

    // 4. Lấy thời lượng video (từ file MP4 đã convert)
    const durationSeconds = await getVideoDuration(mp4FilePath);

    // 5. Trích xuất Thumbnail (từ file MP4)
    let thumbnailTimestampString;
    if (durationSeconds >= 5) {
      thumbnailTimestampString = "00:00:05.000";
    } else if (durationSeconds >= 1) {
      // For videos between 1s and 5s, take thumbnail at 1s
      thumbnailTimestampString = formatDurationForFFmpeg(1);
    } else if (durationSeconds > 0) {
      // For videos shorter than 1s, take thumbnail at 10% of duration (but at least 0.001s)
      const seekTime = Math.max(0.001, durationSeconds * 0.1);
      thumbnailTimestampString = formatDurationForFFmpeg(seekTime);
    } else {
      // Duration is 0 or invalid
      thumbnailTimestampString = "00:00:00.001";
      logger.warn(
        `Video duration is ${durationSeconds}s. Attempting to extract the earliest possible frame for thumbnail for ${mp4FilePath}.`
      );
    }
    logger.info(
      `Attempting to extract thumbnail for ${mp4FilePath} at ${thumbnailTimestampString} (video duration: ${durationSeconds}s)`
    );
    await extractThumbnail(
      mp4FilePath,
      thumbnailFilePath,
      thumbnailTimestampString
    );

    // 6. Đọc buffers cho video và thumbnail
    logger.info(`Reading MP4 file to buffer: ${mp4FilePath}`);
    const mp4FileBuffer = await fs.readFile(mp4FilePath);

    let thumbnailFileBuffer = null;
    try {
      await fs.access(thumbnailFilePath); // Kiểm tra file thumbnail tồn tại
      logger.info(`Reading thumbnail file to buffer: ${thumbnailFilePath}`);
      thumbnailFileBuffer = await fs.readFile(thumbnailFilePath);
    } catch (thumbAccessError) {
      logger.warn(
        `Thumbnail file at ${thumbnailFilePath} not accessible or does not exist. Proceeding without thumbnail upload.`
      );
      // thumbnailFileBuffer sẽ vẫn là null
    }

    // 7. Chuẩn bị tên file trên B2 và Upload MỘT LẦN
    const timestamp = Date.now();
    const videoFileNameInB2 = `vods/${baseName}-${timestamp}.mp4`;
    let thumbnailFileNameInB2 = null;
    if (thumbnailFileBuffer) {
      thumbnailFileNameInB2 = `vods/thumbnails/${baseName}-thumb-${timestamp}.jpg`;
    }

    const presignedUrlDuration =
      parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS) || 3600 * 24 * 7; // 7 ngày

    logger.info(`Uploading video and thumbnail (if available) to B2...`);
    b2UploadResponse = await uploadToB2AndGetPresignedUrl(
      mp4FileBuffer,
      videoFileNameInB2,
      "video/mp4",
      thumbnailFileBuffer, // Sẽ là null nếu không có thumbnail
      thumbnailFileNameInB2, // Sẽ là null nếu không có thumbnail
      thumbnailFileBuffer ? "image/jpeg" : null, // MIME type cho thumbnail
      durationSeconds,
      presignedUrlDuration
    );

    // Gán thông tin file để có thể xóa nếu bước sau lỗi
    // (Phần này đã có trong try...catch của createVODFromUpload, nhưng ở đây là context khác)

    // 8. Tạo bản ghi VOD trong DB
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

      thumbnailUrl: b2UploadResponse.thumbnail?.url || null,
      thumbnailUrlExpiresAt: b2UploadResponse.thumbnail?.urlExpiresAt || null,
      b2ThumbnailFileId: b2UploadResponse.thumbnail?.b2FileId || null,
      b2ThumbnailFileName: b2UploadResponse.thumbnail?.b2FileName || null,
    };

    logger.info("Creating VOD entry in database with data:", vodData);
    // Nên sử dụng hàm createVOD service để thống nhất logic tạo VOD
    const newVOD = await createVOD(vodData);
    logger.info(`VOD entry created with ID: ${newVOD.id}`);

    return newVOD;
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
        logger.info(
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
    if (
      b2UploadResponse?.thumbnail?.b2FileId &&
      b2UploadResponse?.thumbnail?.b2FileName
    ) {
      try {
        logger.info(
          `Service: Dọn dẹp thumbnail ${b2UploadResponse.thumbnail.b2FileName} trên B2 do lỗi trong processRecordedFileToVOD.`
        );
        await deleteFileFromB2(
          b2UploadResponse.thumbnail.b2FileName,
          b2UploadResponse.thumbnail.b2FileId
        );
      } catch (deleteB2Error) {
        logger.error(
          `Service: Lỗi nghiêm trọng khi dọn dẹp thumbnail ${b2UploadResponse.thumbnail.b2FileName} trên B2:`,
          deleteB2Error
        );
      }
    }
    handleServiceError(error, "xử lý file ghi hình thành VOD");
  } finally {
    // 9. Xóa file tạm trên server (FLV, MP4, Thumbnail)
    const filesToDelete = [
      originalFilePath,
      mp4FilePath,
      thumbnailFilePath,
    ].filter(Boolean);
    for (const filePath of filesToDelete) {
      try {
        if (filePath) {
          // Check if filePath is not null
          await fs.access(filePath); // Check if file exists before trying to delete
          await fs.unlink(filePath);
          logger.info(`Successfully deleted temporary file: ${filePath}`);
        }
      } catch (e) {
        // Nếu file không tồn tại (ví dụ, mp4FilePath chưa được tạo do lỗi convert) thì bỏ qua
        if (e.code !== "ENOENT") {
          logger.error(`Failed to delete temporary file ${filePath}:`, e);
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
    });

    // Kiểm tra các trường bắt buộc cơ bản
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

    const newVOD = await VOD.create({
      userId: vodData.userId,
      title: vodData.title,
      description: vodData.description,
      videoUrl: vodData.videoUrl,
      urlExpiresAt: new Date(vodData.urlExpiresAt), // Đảm bảo là Date object
      b2FileId: vodData.b2FileId,
      b2FileName: vodData.b2FileName,
      durationSeconds: vodData.durationSeconds || 0,

      // Các trường thumbnail mới, cho phép null nếu không có thumbnail
      thumbnailUrl: vodData.thumbnailUrl || null,
      thumbnailUrlExpiresAt: vodData.thumbnailUrlExpiresAt
        ? new Date(vodData.thumbnailUrlExpiresAt)
        : null,
      b2ThumbnailFileId: vodData.b2ThumbnailFileId || null,
      b2ThumbnailFileName: vodData.b2ThumbnailFileName || null,

      // Các trường tùy chọn liên quan đến stream
      streamId: vodData.streamId || null,
      streamKey: vodData.streamKey || null,
    });

    logger.info(`VOD created successfully with ID: ${newVOD.id}`);
    return newVOD;
  } catch (error) {
    // Bọc lỗi bằng handleServiceError để chuẩn hóa
    // throw handleServiceError(error, "Failed to create VOD in service");
    // Để đơn giản, tạm thời re-throw lỗi gốc để controller xử lý và log chi tiết hơn
    logger.error("Error in vodService.createVOD:", error);
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
    const { streamId, userId, streamKey, page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (streamId) whereClause.streamId = streamId;
    if (userId) whereClause.userId = userId;
    if (streamKey) whereClause.streamKey = streamKey;

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
        "b2ThumbnailFileId",
        "b2ThumbnailFileName",
        "durationSeconds",
        "createdAt",
        "userId",
        "streamId",
        "streamKey",
        "urlExpiresAt",
        "b2FileName",
      ],
      include: [
        { model: User, as: "user", attributes: ["id", "username"] },
        // { model: Stream, as: 'stream', attributes: ['id', 'title'] }, // Có thể bỏ nếu đã có streamKey
      ],
    });

    // Logic làm mới pre-signed URL nếu cần (ví dụ, chỉ làm mới khi GET chi tiết)
    // Ở đây chỉ trả về, client sẽ tự quyết định có cần refresh không.

    return {
      vods: rows,
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
 * @returns {Promise<VOD|null>} Đối tượng VOD hoặc null nếu không tìm thấy.
 */
const getVODById = async (vodId) => {
  try {
    let vod = await VOD.findByPk(vodId, {
      include: [
        { model: User, as: "user", attributes: ["id", "username"] },
        {
          model: Stream,
          as: "stream",
          attributes: ["id", "title", "streamKey"],
        },
      ],
    });
    if (!vod) {
      throw new AppError("VOD không tìm thấy.", 404);
    }

    // Kiểm tra và làm mới pre-signed URL nếu cần
    // Ví dụ: làm mới nếu URL hết hạn trong vòng 1 giờ tới
    const presignedUrlDuration =
      parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS) || 3600 * 24 * 7; // 7 ngày
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 3600 * 1000);

    if (!vod.urlExpiresAt || new Date(vod.urlExpiresAt) < oneHourFromNow) {
      if (vod.b2FileName) {
        logger.info(
          `Pre-signed URL for VOD ${vodId} (file: ${vod.b2FileName}) is expired or expiring soon. Refreshing...`
        );
        const newViewableUrl = await generatePresignedUrlForExistingFile(
          vod.b2FileName,
          presignedUrlDuration
        );
        vod.videoUrl = newViewableUrl;
        vod.urlExpiresAt = new Date(Date.now() + presignedUrlDuration * 1000);

        // Làm mới cả thumbnail nếu có
        if (vod.thumbnail && vod.thumbnail.includes("?Authorization=")) {
          // Giả sử thumbnail cũng là pre-signed
          // Cần logic để lấy b2FileName của thumbnail, hiện tại chưa lưu riêng
          // Tạm thời bỏ qua refresh thumbnail hoặc giả sử thumbnail có URL public/thời hạn dài hơn
          // Nếu thumbnail cũng từ B2 và private, bạn cần lưu b2FileName của thumbnail riêng.
        }

        await vod.save();
        logger.info(
          `Refreshed pre-signed URL for VOD ${vodId}. New expiry: ${vod.urlExpiresAt}`
        );
      } else {
        logger.warn(
          `VOD ${vodId} needs URL refresh but b2FileName is missing.`
        );
      }
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
 * @param {Buffer} data.videoFileBuffer
 * @param {string} data.originalVideoFileName
 * @param {string} data.videoMimeType
 * @param {Buffer} [data.thumbnailFileBuffer] - Buffer thumbnail do người dùng cung cấp (tùy chọn)
 * @param {string} [data.originalThumbnailFileName] - Tên file thumbnail gốc từ người dùng (tùy chọn)
 * @param {string} [data.thumbnailMimeType] - MIME type của thumbnail từ người dùng (tùy chọn)
 * @returns {Promise<VOD>} Đối tượng VOD đã được tạo.
 */
const createVODFromUpload = async ({
  userId,
  title,
  description,
  videoFileBuffer,
  originalVideoFileName,
  videoMimeType,
  thumbnailFileBuffer, // Từ client hoặc null
  originalThumbnailFileName, // Từ client hoặc tên mặc định nếu tạo tự động
  thumbnailMimeType, // Từ client hoặc 'image/png' nếu tạo tự động
}) => {
  let b2VideoFileIdToDelete = null;
  let b2VideoFileNameToDelete = null;
  let b2ThumbFileIdToDelete = null;
  let b2ThumbFileNameToDelete = null;
  let generatedThumbnailBuffer = null; // Buffer cho thumbnail tự tạo

  try {
    logger.info(
      `Service: Bắt đầu xử lý upload VOD từ local cho user: ${userId}, video: ${originalVideoFileName}`
    );

    // 1. Lấy thời lượng video
    let durationSeconds = 0;
    try {
      durationSeconds = await getVideoDuration(videoFileBuffer);
      logger.info(`Service: Thời lượng video: ${durationSeconds} giây.`);
    } catch (durationError) {
      logger.error("Service: Không thể lấy thời lượng video:", durationError);
      // Quyết định: có thể throw lỗi hoặc tiếp tục với duration 0
      // throw new AppError("Không thể xác định thời lượng video.", 500);
    }

    // 2. Xử lý Thumbnail
    let finalThumbnailBuffer = thumbnailFileBuffer;
    let finalThumbnailMimeType = thumbnailMimeType;
    let finalOriginalThumbnailFileName = originalThumbnailFileName;

    if (!finalThumbnailBuffer) {
      logger.info("Service: Không có thumbnail từ user, đang tạo tự động...");
      try {
        generatedThumbnailBuffer = await generateThumbnailFromVideo(
          videoFileBuffer,
          `thumb_${path.parse(originalVideoFileName).name}.png`,
          "00:00:01"
        );
        finalThumbnailBuffer = generatedThumbnailBuffer;
        finalThumbnailMimeType = "image/png";
        finalOriginalThumbnailFileName = `thumb_${
          path.parse(originalVideoFileName).name
        }.png`;
        logger.info("Service: Đã tạo thumbnail tự động.");
      } catch (thumbError) {
        logger.error("Service: Lỗi khi tạo thumbnail tự động:", thumbError);
        // Không throw lỗi, VOD vẫn có thể được tạo mà không có thumbnail
      }
    }

    // 3. Chuẩn bị tên file cho B2
    const timestamp = Date.now();
    const videoFileNameInB2 = `users/${userId}/vods/${timestamp}_${originalVideoFileName}`;
    let thumbnailFileNameInB2 = null;
    if (finalThumbnailBuffer && finalOriginalThumbnailFileName) {
      const thumbExt = path.extname(finalOriginalThumbnailFileName) || ".png";
      thumbnailFileNameInB2 = `users/${userId}/vods/${timestamp}_${
        path.parse(originalVideoFileName).name
      }_thumb${thumbExt}`;
    }

    // 4. Upload lên B2
    logger.info("Service: Bắt đầu upload file lên B2...");
    const b2Response = await uploadToB2AndGetPresignedUrl(
      videoFileBuffer,
      videoFileNameInB2,
      videoMimeType,
      finalThumbnailBuffer, // Có thể là null
      thumbnailFileNameInB2, // Có thể là null
      finalThumbnailMimeType, // Có thể là null
      durationSeconds
    );
    logger.info(
      `Service: Upload lên B2 thành công: Video - ${
        b2Response.video.b2FileName
      }, Thumbnail - ${b2Response.thumbnail?.b2FileName || "N/A"}`
    );

    // Gán để có thể xóa nếu bước sau lỗi
    b2VideoFileIdToDelete = b2Response.video?.b2FileId;
    b2VideoFileNameToDelete = b2Response.video?.b2FileName;
    b2ThumbFileIdToDelete = b2Response.thumbnail?.b2FileId;
    b2ThumbFileNameToDelete = b2Response.thumbnail?.b2FileName;

    // 5. Tạo bản ghi VOD trong DB (gọi hàm createVOD hiện tại)
    const vodToCreate = {
      userId,
      title,
      description,
      videoUrl: b2Response.video.url,
      urlExpiresAt: b2Response.video.urlExpiresAt,
      b2FileId: b2Response.video.b2FileId,
      b2FileName: b2Response.video.b2FileName,
      durationSeconds: b2Response.video.durationSeconds,
      thumbnailUrl: b2Response.thumbnail?.url,
      thumbnailUrlExpiresAt: b2Response.thumbnail?.urlExpiresAt,
      b2ThumbnailFileId: b2Response.thumbnail?.b2FileId,
      b2ThumbnailFileName: b2Response.thumbnail?.b2FileName,
    };

    const newVOD = await createVOD(vodToCreate);
    logger.info(`Service: VOD đã được tạo trong DB với ID: ${newVOD.id}`);
    return newVOD;
  } catch (error) {
    logger.error("Service: Lỗi trong createVODFromUpload:", error);
    // Logic dọn dẹp file trên B2 nếu đã upload nhưng gặp lỗi
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
    // Re-throw lỗi để controller có thể gửi response phù hợp
    if (error instanceof AppError) throw error;
    throw new AppError(`Lỗi khi xử lý upload VOD: ${error.message}`, 500);
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
};
