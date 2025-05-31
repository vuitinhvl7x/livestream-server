// Ví dụ sử dụng fluent-ffmpeg (cần cài đặt: npm install fluent-ffmpeg)
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import os from "os";
import path from "path";

/**
 * Lấy thời lượng của video từ buffer.
 * @param {Buffer} videoBuffer Buffer của file video.
 * @returns {Promise<number>} Thời lượng video tính bằng giây.
 * Cần cài đặt ffmpeg và fluent-ffmpeg trên server.
 */
export async function getVideoDurationInSeconds(videoBuffer) {
  return new Promise((resolve, reject) => {
    // Tạo file tạm từ buffer để ffmpeg có thể đọc
    // Đảm bảo tên file có phần mở rộng phù hợp nếu thư viện cần, nhưng thường ffprobe tự phát hiện
    const tempFileName = `temp-video-${Date.now()}`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    fs.writeFile(tempFilePath, videoBuffer, (err) => {
      if (err) {
        return reject(
          new Error(`Không thể tạo file tạm cho video: ${err.message}`)
        );
      }

      ffmpeg.ffprobe(tempFilePath, (err, metadata) => {
        // Xóa file tạm sau khi dùng, bất kể thành công hay thất bại
        fs.unlink(tempFilePath, (unlinkErr) => {
          if (unlinkErr) {
            // Ghi log lỗi xóa file tạm nhưng không ảnh hưởng đến kết quả ffprobe
            console.error(`Lỗi khi xóa file tạm ${tempFilePath}:`, unlinkErr);
          }
        });

        if (err) {
          return reject(
            new Error(
              `Lỗi khi lấy thông tin video (ffprobe): ${err.message}. Đảm bảo ffmpeg đã được cài đặt và trong PATH.`
            )
          );
        }
        if (metadata && metadata.format && metadata.format.duration) {
          resolve(parseFloat(metadata.format.duration));
        } else {
          reject(
            new Error(
              "Không tìm thấy thông tin thời lượng trong metadata video."
            )
          );
        }
      });
    });
  });
}

/**
 * Tạo thumbnail từ video buffer tại một thời điểm cụ thể.
 * @param {Buffer} videoBuffer Buffer của file video.
 * @param {string} outputFileName Tên file cho thumbnail (ví dụ: thumb.png).
 * @param {string | number} timestamp Thời điểm để chụp thumbnail (ví dụ: '00:00:01' hoặc 1 (giây)).
 * @returns {Promise<Buffer>} Buffer của file thumbnail.
 */
export async function generateThumbnailFromVideo(
  videoBuffer,
  outputFileName,
  timestamp
) {
  return new Promise((resolve, reject) => {
    const tempVideoFileName = `temp-video-thumb-${Date.now()}`;
    const tempVideoPath = path.join(os.tmpdir(), tempVideoFileName);
    const tempThumbPath = path.join(os.tmpdir(), outputFileName);

    fs.writeFile(tempVideoPath, videoBuffer, (writeErr) => {
      if (writeErr) {
        return reject(
          new Error(`Không thể tạo file video tạm: ${writeErr.message}`)
        );
      }

      ffmpeg(tempVideoPath)
        .on("error", (err) => {
          fs.unlink(tempVideoPath, () => {}); // Xóa file video tạm
          reject(new Error(`Lỗi ffmpeg khi tạo thumbnail: ${err.message}`));
        })
        .on("end", () => {
          fs.unlink(tempVideoPath, () => {}); // Xóa file video tạm
          fs.readFile(tempThumbPath, (readErr, thumbBuffer) => {
            fs.unlink(tempThumbPath, () => {}); // Xóa file thumbnail tạm
            if (readErr) {
              return reject(
                new Error(
                  `Không thể đọc file thumbnail tạm: ${readErr.message}`
                )
              );
            }
            resolve(thumbBuffer);
          });
        })
        .screenshots({
          timestamps: [timestamp],
          filename: outputFileName,
          folder: os.tmpdir(),
          size: "320x240", // Kích thước thumbnail, có thể tùy chỉnh
        });
    });
  });
}
