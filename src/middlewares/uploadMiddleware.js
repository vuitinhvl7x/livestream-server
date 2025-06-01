import multer from "multer";
import path from "path";
import fs from "fs"; // Thêm fs để kiểm tra và tạo thư mục
import dotenv from "dotenv"; // Thêm dotenv

dotenv.config(); // Tải biến môi trường

// Đọc đường dẫn thư mục tạm từ biến môi trường
const tempUploadDir = process.env.TMP_UPLOAD_DIR;

console.log(`Thư mục upload tạm thời được cấu hình là: ${tempUploadDir}`); // Ghi log để kiểm tra

// Đảm bảo thư mục uploads/tmp tồn tại
if (!fs.existsSync(tempUploadDir)) {
  try {
    fs.mkdirSync(tempUploadDir, { recursive: true });
    console.log(`Thư mục tạm được tạo tại: ${tempUploadDir}`);
  } catch (err) {
    console.error(`Lỗi khi tạo thư mục tạm tại ${tempUploadDir}:`, err);
    throw new Error(`Không thể tạo thư mục upload tạm: ${tempUploadDir}`);
  }
}

// Cấu hình lưu trữ cho multer (lưu vào ổ đĩa)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempUploadDir); // Thư mục lưu file tạm
  },
  filename: function (req, file, cb) {
    // Tạo tên file duy nhất để tránh ghi đè, giữ lại phần extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// Hàm kiểm tra loại file (chỉ chấp nhận video và ảnh cho các field tương ứng)
const fileFilter = (req, file, cb) => {
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
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 500, // Giới hạn kích thước file: 500MB
  },
});

export default upload;
