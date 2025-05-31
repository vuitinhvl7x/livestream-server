import { body, param } from "express-validator";

// Validator cho việc tạo/upload VOD thủ công bởi admin
const manualUploadVOD = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Tiêu đề VOD không được để trống.")
    .isLength({ min: 3, max: 255 })
    .withMessage("Tiêu đề VOD phải từ 3 đến 255 ký tự."),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Mô tả không được vượt quá 5000 ký tự."),

  // Các trường này là bắt buộc khi upload thủ công VOD đã có trên B2
  body("videoUrl")
    .trim()
    .notEmpty()
    .withMessage("videoUrl (pre-signed URL từ B2) không được để trống.")
    .isURL()
    .withMessage("videoUrl phải là một URL hợp lệ."),
  body("urlExpiresAt")
    .notEmpty()
    .withMessage(
      "urlExpiresAt (thời điểm hết hạn của videoUrl) không được để trống."
    )
    .isISO8601()
    .withMessage("urlExpiresAt phải là một ngày hợp lệ theo định dạng ISO8601.")
    .toDate(), // Chuyển đổi thành Date object
  body("b2FileId")
    .trim()
    .notEmpty()
    .withMessage("b2FileId (ID file trên B2) không được để trống."),
  body("b2FileName")
    .trim()
    .notEmpty()
    .withMessage("b2FileName (tên file trên B2) không được để trống."),
  body("durationSeconds")
    .notEmpty()
    .withMessage(
      "durationSeconds (thời lượng video tính bằng giây) không được để trống."
    )
    .isInt({ gt: 0 })
    .withMessage("durationSeconds phải là một số nguyên dương.")
    .toInt(),

  // Các trường tùy chọn
  body("streamId")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("streamId (nếu có) phải là một số nguyên dương.")
    .toInt(),
  body("streamKey")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("streamKey (nếu có) không được để trống."),
  body("thumbnail")
    .optional()
    .trim()
    .isURL()
    .withMessage("Thumbnail (nếu có) phải là một URL hợp lệ."),
  // userId sẽ được lấy từ token xác thực, không cần validate ở đây
];

// Validator cho việc upload VOD từ file local
const uploadLocalVOD = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Tiêu đề VOD không được để trống.")
    .isLength({ min: 3, max: 255 })
    .withMessage("Tiêu đề VOD phải từ 3 đến 255 ký tự."),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Mô tả không được vượt quá 5000 ký tự."),
  // Các trường tùy chọn khác có thể thêm sau nếu cần
  // File video sẽ được xử lý bởi multer, không cần validate ở đây
  // streamId, streamKey, userId sẽ được xử lý trong controller
];

export const vodValidationRules = {
  manualUploadVOD, // Đổi tên từ createVOD để rõ ràng hơn
  uploadLocalVOD,
};
