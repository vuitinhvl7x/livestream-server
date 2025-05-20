import { body } from "express-validator";

export const validateUserRegistration = [
  body("username")
    .isString()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long"),
  body("password")
    .isString()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

export const validateUserLogin = [
  body("username").isString().notEmpty().withMessage("Username is required"),
  // Không cần isLength cho username khi login, chỉ cần tồn tại
  body("password")
    .isString()
    .notEmpty() // Mật khẩu không được rỗng khi login
    .withMessage("Password is required"),
  // Không cần isLength cho password khi login, backend sẽ check hash
];

// Hoặc nếu bạn muốn dùng chung một validator cho cả register và login
// (như file userRoutes.js hiện tại đang làm):
export const validateUserPayload = [
  body("username")
    .isString()
    .bail() // Dừng nếu là non-string để các check sau không lỗi
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3 })
    .withMessage(
      "Username must be at least 3 characters long for registration. For login, only non-empty is checked by this rule if applied broadly."
    ),
  body("password")
    .isString()
    .bail()
    .isLength({ min: 6 })
    .withMessage(
      "Password must be at least 6 characters long for registration. For login, only non-empty is checked if you use a simpler rule."
    ),
];
