// Ví dụ sử dụng fluent-ffmpeg (cần cài đặt: npm install fluent-ffmpeg)
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import os from "os";
import path from "path";

/**
 * Lấy thời lượng của video từ đường dẫn file.
 * @param {string} filePath Đường dẫn đến file video.
 * @returns {Promise<number>} Thời lượng video tính bằng giây.
 */
export async function getVideoDurationInSeconds(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(
          new Error(
            `Lỗi khi lấy thông tin video (ffprobe) từ ${filePath}: ${err.message}. Đảm bảo ffmpeg đã được cài đặt và trong PATH.`
          )
        );
      }
      if (metadata && metadata.format && metadata.format.duration) {
        resolve(parseFloat(metadata.format.duration));
      } else {
        reject(
          new Error(
            `Không tìm thấy thông tin thời lượng trong metadata video cho file ${filePath}.`
          )
        );
      }
    });
  });
}

/**
 * Tạo thumbnail từ video file tại một thời điểm cụ thể.
 * @param {string} videoFilePath Đường dẫn đến file video.
 * @param {string} outputFileName Tên file cho thumbnail (ví dụ: thumb.png).
 * @param {string | number} timestamp Thời điểm để chụp thumbnail (ví dụ: '00:00:01' hoặc 1 (giây)).
 * @returns {Promise<Buffer>} Buffer của file thumbnail.
 */
export async function generateThumbnailFromVideo(
  videoFilePath,
  outputFileName, // Sẽ được lưu vào os.tmpdir()
  timestamp
) {
  return new Promise((resolve, reject) => {
    const tempThumbPath = path.join(os.tmpdir(), outputFileName); // Đường dẫn đầy đủ cho thumbnail tạm

    ffmpeg(videoFilePath)
      .on("error", (err) => {
        reject(
          new Error(
            `Lỗi ffmpeg khi tạo thumbnail từ ${videoFilePath}: ${err.message}`
          )
        );
      })
      .on("end", () => {
        fs.readFile(tempThumbPath, (readErr, thumbBuffer) => {
          // Xóa file thumbnail tạm sau khi đã đọc vào buffer
          fs.unlink(tempThumbPath, (unlinkErr) => {
            if (unlinkErr) {
              console.error(
                `Lỗi khi xóa file thumbnail tạm ${tempThumbPath}:`,
                unlinkErr
              );
            }
          });
          if (readErr) {
            return reject(
              new Error(
                `Không thể đọc file thumbnail tạm ${tempThumbPath}: ${readErr.message}`
              )
            );
          }
          resolve(thumbBuffer);
        });
      })
      .screenshots({
        timestamps: [timestamp],
        filename: outputFileName, // ffmpeg sẽ lưu file này vào folder chỉ định bên dưới
        folder: os.tmpdir(), // Thư mục để ffmpeg lưu thumbnail tạm thời
        size: "320x240", // Kích thước thumbnail, có thể tùy chỉnh
      });
  });
}
