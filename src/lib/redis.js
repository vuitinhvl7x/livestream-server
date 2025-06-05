import Redis from "ioredis";
import dotenv from "dotenv";
import logger from "../utils/logger.js";

dotenv.config();

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

redisClient.on("connect", async () => {
  logger.info("Connected to Redis successfully!");
  // Kiểm tra kết nối bằng ping
  try {
    const pong = await redisClient.ping();
    logger.info("Redis ping response:", pong); // pong sẽ là "PONG"
  } catch (pingError) {
    logger.error("Redis ping failed:", pingError);
  }
});

redisClient.on("error", (err) => {
  logger.error("Could not connect to Redis:", err);
  // Cân nhắc việc xử lý lỗi ở đây, ví dụ: thoát ứng dụng hoặc chạy ở chế độ không cache
});

export default redisClient;
