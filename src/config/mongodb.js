import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "../utils/logger.js"; // Import logger

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

export const connectMongoDB = async () => {
  if (!MONGODB_URI) {
    logger.warn(
      "MONGODB_URI not found in .env. Chat features requiring MongoDB will be unavailable."
    );
    return false; // Trả về false nếu không có URI
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      // Các options như useNewUrlParser, useUnifiedTopology, useCreateIndex, useFindAndModify
      // không còn cần thiết trong Mongoose 6+ và có thể gây lỗi nếu dùng.
    });
    logger.info("MongoDB connected successfully for chat logs.");
    return true; // Trả về true nếu kết nối thành công
  } catch (err) {
    logger.error("MongoDB connection error:", err);
    // Thoát ứng dụng nếu không kết nối được DB quan trọng này (tùy chọn)
    // process.exit(1);
    return false; // Trả về false nếu có lỗi
  }
};

// Lắng nghe các sự kiện kết nối (tùy chọn, để debug)
mongoose.connection.on("disconnected", () => {
  logger.info("MongoDB disconnected.");
});

mongoose.connection.on("reconnected", () => {
  logger.info("MongoDB reconnected.");
});
