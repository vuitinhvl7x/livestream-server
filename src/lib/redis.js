import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3, // Optional: configure retry strategy
  enableReadyCheck: true,
});

redisClient.on("connect", () => {
  console.log("Connected to Redis successfully!");
});

redisClient.on("error", (err) => {
  console.error("Could not connect to Redis:", err);
  // Cân nhắc việc xử lý lỗi ở đây, ví dụ: thoát ứng dụng hoặc chạy ở chế độ không cache
});

export default redisClient;
