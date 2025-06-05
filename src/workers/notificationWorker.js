import { Worker } from "bullmq";
import redisClient from "../lib/redis.js";
import notificationService from "../services/notificationService.js";
import logger from "../utils/logger.js";

const queueName = "notification-tasks";

const worker = new Worker(
  queueName,
  async (job) => {
    const { actionType, actorUser, entity, followers, messageTemplate } =
      job.data;
    logger.info(
      `Processing job ${job.id} for action: ${actionType}, entity: ${entity?.id}, actor: ${actorUser?.id}, ${followers.length} followers.`
    );

    let relatedEntityType = null;
    if (actionType === "stream_started") {
      relatedEntityType = "stream";
    } else if (actionType === "new_vod") {
      relatedEntityType = "vod";
    } else if (actionType === "new_follower") {
      relatedEntityType = "user"; // Theo mô tả của createNotification
    } else {
      logger.warn(
        `Job ${job.id}: Unknown actionType: ${actionType}. Skipping.`
      );
      return { success: false, reason: "unknown_action_type" };
    }

    let successfulNotifications = 0;
    let failedNotifications = 0;

    for (const follower of followers) {
      if (!follower || !follower.id) {
        logger.warn(
          `Job ${job.id}: Invalid follower data:`,
          follower,
          `Skipping.`
        );
        failedNotifications++;
        continue;
      }

      try {
        // Theo Bước 5 của task.md, createNotification cần:
        // userId, type, message, relatedEntityId, relatedEntityType, creatorUsername, actorUserId, entityTitle
        const notificationResult = await notificationService.createNotification(
          follower.id, // userId (của người nhận thông báo - follower)
          actionType, // type (stream_started, new_vod, new_follower)
          messageTemplate, // message (hoặc message được tạo từ template này)
          entity?.id || (actionType === "new_follower" ? actorUser?.id : null), // relatedEntityId (ID của stream/VOD, hoặc actor nếu là new_follower)
          relatedEntityType, // relatedEntityType ("stream", "vod", "user")
          actorUser?.username, // creatorUsername (username của người tạo ra hành động)
          actorUser?.id, // actorUserId (ID của người tạo ra hành động)
          entity?.title // entityTitle (tiêu đề của stream/VOD)
        );

        if (notificationResult && notificationResult.success) {
          logger.info(
            `Job ${job.id}: Notification sent successfully to follower ${follower.id} for entity ${entity?.id}.`
          );
          successfulNotifications++;
        } else {
          logger.error(
            `Job ${job.id}: Failed to send notification to follower ${follower.id} for entity ${entity?.id}. Reason: ${notificationResult?.reason}`
          );
          failedNotifications++;
        }
      } catch (error) {
        logger.error(
          `Job ${job.id}: Error processing follower ${follower.id} for entity ${entity?.id}:`,
          error
        );
        failedNotifications++;
      }
    }
    logger.info(
      `Job ${job.id} finished. Successful: ${successfulNotifications}, Failed: ${failedNotifications} for action: ${actionType}, entity: ${entity?.id}`
    );
    return {
      success: true,
      processed: followers.length,
      successful: successfulNotifications,
      failed: failedNotifications,
    };
  },
  {
    connection: redisClient,
    concurrency: 4, // Xử lý 4 jobs đồng thời
    removeOnComplete: { count: 1000 }, // Giữ lại 1000 job hoàn thành gần nhất
    removeOnFail: { count: 5000 }, // Giữ lại 5000 job thất bại gần nhất
  }
);

worker.on("completed", (job, result) => {
  logger.info(`Worker: Job ${job.id} has completed. Result:`, result);
});

worker.on("failed", (job, err) => {
  logger.error(
    `Worker: Job ${job.id} has failed with error: ${err.message}`,
    err.stack
  );
});

worker.on("error", (err) => {
  logger.error("Worker: Encountered an error:", err);
});

logger.info("Notification worker started successfully.");

export default worker;
