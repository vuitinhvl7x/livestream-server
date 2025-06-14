import { validationResult } from "express-validator";

/**
 * Middleware để xử lý kết quả validation từ express-validator.
 * Nếu có lỗi, nó sẽ gửi phản hồi 400 Bad Request với chi tiết lỗi.
 * Nếu không, nó sẽ chuyển sang middleware tiếp theo.
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed.",
      errors: errors.array(),
    });
  }
  next();
};

export default validateRequest;
