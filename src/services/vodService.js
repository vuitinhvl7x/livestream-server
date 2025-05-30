import { VOD, User, Stream } from "../models/index.js";
import { AppError, handleServiceError } from "../utils/errorHandler.js";
import {
  uploadToB2AndGetPresignedUrl,
  deleteFileFromB2,
  generatePresignedUrlForExistingFile,
} from "../lib/b2.service.js";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const logger = {
  info: console.log,
  error: console.error,
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
  let uploadedVideoInfo = null;
  let uploadedThumbnailInfo = null;
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
    ); // streamkey
    const tempDir = path.dirname(originalFilePath); // /mnt/recordings/live

    mp4FilePath = path.join(tempDir, `${baseName}.mp4`);
    thumbnailFilePath = path.join(tempDir, `${baseName}-thumbnail.jpg`);

    // 3. Chuyển đổi FLV sang MP4
    await convertFlvToMp4(originalFilePath, mp4FilePath);

    // 4. Lấy thời lượng video (từ file MP4 đã convert)
    const durationSeconds = await getVideoDuration(mp4FilePath);

    // 5. Trích xuất Thumbnail (từ file MP4)
    await extractThumbnail(mp4FilePath, thumbnailFilePath);

    // 6. Upload MP4 lên B2
    const mp4FileNameInB2 = `vods/${baseName}-${Date.now()}.mp4`;
    const presignedUrlDuration =
      parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS) || 3600 * 24 * 7; // 7 ngày

    logger.info(`Uploading ${mp4FilePath} to B2 as ${mp4FileNameInB2}...`);
    uploadedVideoInfo = await uploadToB2AndGetPresignedUrl(
      mp4FilePath,
      mp4FileNameInB2, // Tên file trên B2
      presignedUrlDuration
    );

    // 7. Upload Thumbnail lên B2 (nếu có)
    let thumbnailUrlOnB2 = null;
    if (thumbnailFilePath) {
      try {
        await fs.access(thumbnailFilePath); // Kiểm tra file thumbnail tồn tại
        const thumbnailFileNameInB2 = `vods/thumbnails/${baseName}-${Date.now()}.jpg`;
        logger.info(
          `Uploading ${thumbnailFilePath} to B2 as ${thumbnailFileNameInB2}...`
        );
        // Thumbnails có thể public hoặc pre-signed tùy nhu cầu. Hiện tại đang dùng pre-signed.
        uploadedThumbnailInfo = await uploadToB2AndGetPresignedUrl(
          thumbnailFilePath,
          thumbnailFileNameInB2,
          presignedUrlDuration
        );
        thumbnailUrlOnB2 = uploadedThumbnailInfo.viewableUrl;
      } catch (thumbUploadError) {
        logger.error(
          "Failed to upload thumbnail to B2, proceeding without it:",
          thumbUploadError
        );
        // Không throw lỗi nếu thumbnail thất bại, VOD vẫn có thể được tạo
      }
    }

    // 8. Tạo bản ghi VOD trong DB
    const vodData = {
      streamId: stream.id,
      userId: stream.userId,
      streamKey: streamKey,
      title: stream.title || `VOD for ${streamKey}`, // Lấy title từ stream hoặc mặc định
      description: stream.description || "",
      videoUrl: uploadedVideoInfo.viewableUrl,
      urlExpiresAt: new Date(Date.now() + presignedUrlDuration * 1000),
      b2FileId: uploadedVideoInfo.b2FileId,
      b2FileName: uploadedVideoInfo.b2FileName,
      thumbnail: thumbnailUrlOnB2, // URL thumbnail trên B2
      durationSeconds,
    };

    logger.info("Creating VOD entry in database with data:", vodData);
    const newVOD = await VOD.create(vodData);
    logger.info(`VOD entry created with ID: ${newVOD.id}`);

    return newVOD;
  } catch (error) {
    logger.error(
      `Error in processRecordedFileToVOD for streamKey ${streamKey}:`,
      error
    );
    // Xử lý lỗi cụ thể hơn nếu cần
    handleServiceError(error, "xử lý file ghi hình thành VOD"); // Re-throws AppError
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
    const {
      streamId,
      userId,
      title,
      description,
      videoUrl, // Đây là URL đã có sẵn (ví dụ từ upload thủ công lên B2)
      urlExpiresAt, // Cần cung cấp nếu videoUrl là pre-signed
      b2FileId,
      b2FileName,
      thumbnail,
      durationSeconds,
      streamKey,
    } = vodData;

    // Kiểm tra streamId và userId nếu được cung cấp
    if (streamId) {
      const stream = await Stream.findByPk(streamId);
      if (!stream) {
        throw new AppError("Stream không tồn tại.", 404);
      }
    }
    if (userId) {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new AppError("Người dùng không tồn tại.", 404);
      }
    }
    if (!userId && streamId) {
      // Cố gắng lấy userId từ streamId
      const stream = await Stream.findByPk(streamId);
      if (stream && stream.userId) vodData.userId = stream.userId;
      else throw new AppError("Không thể xác định User ID cho VOD này.", 400);
    } else if (!userId && !streamId) {
      throw new AppError("Cần cung cấp userId hoặc streamId để tạo VOD.", 400);
    }

    if (!videoUrl || !urlExpiresAt || !b2FileName) {
      throw new AppError(
        "Cần cung cấp videoUrl, urlExpiresAt, và b2FileName cho VOD upload thủ công.",
        400
      );
    }

    const newVOD = await VOD.create({
      streamId,
      userId: vodData.userId, // Đã được cập nhật ở trên nếu cần
      title,
      description,
      videoUrl,
      urlExpiresAt,
      b2FileId,
      b2FileName,
      thumbnail,
      durationSeconds,
      streamKey,
    });

    return newVOD;
  } catch (error) {
    handleServiceError(error, "tạo VOD thủ công");
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
        "videoUrl", // Sẽ là pre-signed URL
        "thumbnail",
        "durationSeconds",
        "createdAt",
        "userId",
        "streamId",
        "streamKey",
        "urlExpiresAt", // Gửi kèm để client biết khi nào URL hết hạn
        "b2FileName", // Gửi kèm để client/admin có thể yêu cầu refresh URL
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

export const vodService = {
  createVOD,
  getVODs,
  getVODById,
  deleteVOD,
  processRecordedFileToVOD,
  refreshVODUrl, // Thêm hàm này để có thể gọi từ controller
};
