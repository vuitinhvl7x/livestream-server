import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config(); // Đảm bảo các biến môi trường từ .env được load

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
  process.exit(1); // Thoát ứng dụng nếu JWT_SECRET không được cấu hình
}

/**
 * Middleware xác thực JWT.
 * Kiểm tra token từ header Authorization.
 * Nếu hợp lệ, giải mã và gán thông tin user vào req.user.
 * Nếu không hợp lệ hoặc không có, trả về lỗi 401 hoặc 403.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Lấy token từ "Bearer <token>"

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access token is missing or invalid." });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("JWT verification error:", err.message);
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Access token expired." });
      }
      // Các lỗi khác như JsonWebTokenError (token không hợp lệ, chữ ký sai)
      return res.status(403).json({ message: "Access token is not valid." });
    }

    // Token hợp lệ, gán thông tin user đã giải mã vào req.user
    // Payload của bạn khi tạo token cần chứa các thông tin này (ví dụ: id, username)
    req.user = {
      id: decoded.id,
      username: decoded.username,
      // Thêm các trường khác nếu có trong payload của token
    };
    console.log("User authenticated via JWT:", req.user);
    next();
  });
};

export default authenticateToken;

export function verifyWebhook(req, res, next) {
  const signature = req.headers["x-webhook-signature"];
  // Giả sử bạn sẽ lưu WEBHOOK_SECRET trong file .env
  if (!process.env.WEBHOOK_SECRET) {
    console.error("FATAL ERROR: WEBHOOK_SECRET is not defined in .env file.");
    return res.status(500).json({ message: "Webhook secret not configured." });
  }
  if (signature !== process.env.WEBHOOK_SECRET) {
    console.warn("Invalid webhook signature received:", signature);
    return res.status(401).json({ message: "Invalid webhook signature." });
  }
  next();
}
