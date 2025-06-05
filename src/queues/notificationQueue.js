import { Queue } from "bullmq";
import redisClient from "../lib/redis.js";

const queueName = "notification-tasks";

// Khởi tạo Queue với kết nối Redis và các tùy chọn
const notificationQueue = new Queue(queueName, {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3, // Số lần thử lại job nếu thất bại
    backoff: {
      type: "exponential", // Kiểu backoff: exponential, fixed
      delay: 1000, // Thời gian chờ ban đầu (ms)
    },
    removeOnComplete: {
      // Tự động xóa job khi hoàn thành
      count: 5000, // Giữ lại 5000 jobs hoàn thành gần nhất
      age: 24 * 3600, // Giữ lại jobs hoàn thành trong 24 giờ (tính bằng giây)
    },
    removeOnFail: {
      // Giữ lại 1000 job thất bại gần nhất
      count: 5000, // Giữ lại 5000 job thất bại gần nhất
      age: 7 * 24 * 3600, // Giữ job lỗi trong 7 ngày
    },
  },
});

notificationQueue.on("waiting", (jobId) => {
  console.log(`A job with ID ${jobId} is waiting.`);
});

notificationQueue.on("active", (job) => {
  console.log(`Job ${job.id} is now active.`);
});

notificationQueue.on("completed", (job, result) => {
  console.log(`Job ${job.id} completed with result ${result}`);
});

notificationQueue.on("failed", (job, err) => {
  console.log(`Job ${job.id} failed with error ${err.message}`);
});

export default notificationQueue;
