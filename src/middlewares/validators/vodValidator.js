import { body, param } from "express-validator";

const createVOD = [
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
  body("videoUrl")
    .trim()
    .notEmpty()
    .withMessage("videoUrl không được để trống.")
    .isURL()
    .withMessage("videoUrl phải là một URL hợp lệ."),
  body("streamId")
    .notEmpty()
    .withMessage("streamId không được để trống.")
    .isInt({ gt: 0 })
    .withMessage("streamId phải là một số nguyên dương."),
  // userId sẽ được lấy từ token, không cần validate ở đây nếu vậy
  // Hoặc nếu webhook gửi userId, thì validate ở đây
  // body('userId')
  //   .if((value, { req }) => !req.user) // Chỉ validate nếu không có req.user (ví dụ: webhook)
  //   .notEmpty().withMessage('userId không được để trống khi không có token xác thực.')
  //   .isInt({ gt: 0 }).withMessage('userId phải là một số nguyên dương.'),
  body("thumbnail")
    .optional()
    .trim()
    .isURL()
    .withMessage("Thumbnail phải là một URL hợp lệ."),
  body("duration")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Thời lượng video phải là một số nguyên dương (giây)."),
];

export const vodValidationRules = {
  createVOD,
};
