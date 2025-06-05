import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

redisClient.on("connect", async () => {
  console.log("Connected to Redis successfully!");
  // Kiểm tra kết nối bằng ping
  try {
    const pong = await redisClient.ping();
    console.log("Redis ping response:", pong); // pong sẽ là "PONG"
  } catch (pingError) {
    console.error("Redis ping failed:", pingError);
  }
});

redisClient.on("error", (err) => {
  console.error("Could not connect to Redis:", err);
  // Cân nhắc việc xử lý lỗi ở đây, ví dụ: thoát ứng dụng hoặc chạy ở chế độ không cache
});

export default redisClient;
