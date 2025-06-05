import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { TokenBlacklist } from "../models/index.js";

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
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Lấy token từ "Bearer <token>"

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access token is missing or invalid." });
  }

  try {
    // Kiểm tra xem token có trong blacklist không
    const blacklistedToken = await TokenBlacklist.findByPk(token);
    if (blacklistedToken) {
      return res
        .status(401)
        .json({ message: "Token has been invalidated. Please log in again." });
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
        role: decoded.role,
        // Thêm các trường khác nếu có trong payload của token
      };

      // Gắn token và payload vào request để có thể sử dụng ở bước sau (ví dụ: logout)
      req.token = token;
      req.tokenPayload = decoded;

      console.log("User authenticated via JWT:", req.user);
      next();
    });
  } catch (error) {
    console.error("Error during token authentication:", error);
    return res
      .status(500)
      .json({ message: "Internal server error during authentication." });
  }
};

export default authenticateToken;

// User for production stage
// export function verifyWebhook(req, res, next) {
//   const signature = req.headers["x-webhook-signature"];
//   // Giả sử bạn sẽ lưu WEBHOOK_SECRET trong file .env
//   if (!process.env.WEBHOOK_SECRET) {
//     console.error("FATAL ERROR: WEBHOOK_SECRET is not defined in .env file.");
//     return res.status(500).json({ message: "Webhook secret not configured." });
//   }
//   if (signature !== process.env.WEBHOOK_SECRET) {
//     console.warn("Invalid webhook signature received:", signature);
//     return res.status(401).json({ message: "Invalid webhook signature." });
//   }
//   next();
// }

export function verifyWebhookTokenInParam(req, res, next) {
  const receivedToken = req.params.webhookToken;
  const expectedToken = process.env.WEBHOOK_SECRET_TOKEN;

  if (!expectedToken) {
    console.error(
      "FATAL ERROR: WEBHOOK_SECRET_TOKEN is not defined in .env file."
    );
    return res
      .status(500)
      .json({ message: "Webhook secret token not configured on server." });
  }

  if (receivedToken === expectedToken) {
    next();
  } else {
    console.warn("Invalid webhook token received in URL param:", receivedToken);
    return res.status(403).json({ message: "Invalid webhook token." });
  }
}
