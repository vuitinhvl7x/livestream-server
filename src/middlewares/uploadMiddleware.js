import multer from "multer";
import path from "path";

// Cấu hình lưu trữ cho multer (lưu vào bộ nhớ)
const storage = multer.memoryStorage(); // Lưu file vào buffer trong memory

// Hàm kiểm tra loại file (chỉ chấp nhận video)
const videoFileFilter = (req, file, cb) => {
  const allowedVideoMimeTypes = [
    "video/mp4",
    "video/mpeg",
    "video/quicktime", // .mov
    "video/x-msvideo", // .avi
    "video/x-flv", // .flv
    "video/webm",
    "video/x-matroska", // .mkv
  ];
  const allowedImageMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (
    file.fieldname === "videoFile" &&
    allowedVideoMimeTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else if (
    file.fieldname === "thumbnailFile" &&
    allowedImageMimeTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Định dạng file không hợp lệ cho field ${file.fieldname}. Kiểm tra lại các định dạng được chấp nhận.`
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 1024 * 1024 * 500, // Giới hạn kích thước file: 500MB
  },
});

export default upload;
