import dotenv from "dotenv";
dotenv.config();

import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import sequelize from "./config/database.js";
import { connectMongoDB } from "./config/mongodb.js";
import userRoutes from "./routes/userRoutes.js";
import streamRoutes from "./routes/streamRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import vodRoutes from "./routes/vodRoutes.js";
import initializeSocketHandlers from "./socketHandlers.js";
import { setIoInstance as setNotificationServiceIo } from "./services/notificationService.js";
import morgan from "morgan";
// Import category routes
import categoryRoutes from "./routes/categoryRoutes.js";
import categoryAdminRoutes from "./routes/admin/categoryAdminRoutes.js";
import followRoutes from "./routes/followRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import aiRoutes from "./routes/aiRoutes.js"; // Import AI routes
// Import BullMQ Worker
import notificationWorker from "./workers/notificationWorker.js"; // Worker sẽ tự khởi động khi được import
// Import logger
import logger from "./utils/logger.js";
// Import Bull Board
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { ExpressAdapter } from "@bull-board/express";
// Import your queue
import notificationQueue from "./queues/notificationQueue.js";
import expressStatusMonitor from "express-status-monitor";

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO server FIRST
const io = new Server(server, {
  path: "/app/socket.io",
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

// THEN, pass the io instance to the monitor
app.use(expressStatusMonitor({ io: io }));

setNotificationServiceIo(io);

// Bull Board setup
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(notificationQueue)],
  serverAdapter: serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());

// Middleware
// app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/social", followRoutes);
app.use("/api/streams", streamRoutes);
app.use("/api/webhook", webhookRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/vod", vodRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ai", aiRoutes); // Sử dụng AI routes
// Add category routes
app.use("/api/categories", categoryRoutes);
app.use("/api/admin/categories", categoryAdminRoutes);

// Base route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Livestream API" });
});

// Database connection and server start
const PORT = process.env.PORT || 5000;
const LOCAL_IP = "0.0.0.0";

// Initialize Socket.IO handlers (example, actual implementation might differ)
initializeSocketHandlers(io);

// Kết nối cơ sở dữ liệu
const startServer = async () => {
  try {
    await sequelize.sync();
    logger.info("Database (PostgreSQL/Sequelize) connected successfully.");

    await connectMongoDB(); // Kết nối MongoDB
    // logger.info("MongoDB connected successfully."); // Thêm log cho MongoDB nếu connectMongoDB không có log riêng
    server.listen(PORT, LOCAL_IP, () => {
      logger.info(`Server is running on http://${LOCAL_IP}:${PORT}`);
      logger.info(
        `Socket.IO initialized and listening on ws://${LOCAL_IP}:${PORT}`
      );
      // Log xác nhận worker đã được load và (ngầm) khởi động
      if (notificationWorker) {
        logger.info("Notification Worker has been loaded and is running.");
      }
      // Log cho Bull Board
      logger.info(
        `Bull Board is available at http://${LOCAL_IP}:${PORT}/admin/queues`
      );
      logger.info(
        `Express Status Monitor is available at http://${LOCAL_IP}:${PORT}/status`
      );
    });
  } catch (error) {
    logger.error(
      "Unable to connect to the database(s) or start server:",
      error
    );
    process.exit(1); // Thoát nếu không kết nối được DB chính
  }
};

startServer();
