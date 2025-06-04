import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
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
// Import category routes
import categoryRoutes from "./routes/categoryRoutes.js";
import categoryAdminRoutes from "./routes/admin/categoryAdminRoutes.js";
import followRoutes from "./routes/followRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO server
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

setNotificationServiceIo(io);

// Middleware
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
// Add category routes
app.use("/api/categories", categoryRoutes);
app.use("/api/admin/categories", categoryAdminRoutes);

// Base route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Livestream API" });
});

// Database connection and server start
const PORT = process.env.PORT || 5000;

// Initialize Socket.IO handlers (example, actual implementation might differ)
initializeSocketHandlers(io);

// Kết nối cơ sở dữ liệu
const startServer = async () => {
  try {
    await sequelize.sync();
    console.log("Database (PostgreSQL/Sequelize) connected successfully.");

    await connectMongoDB(); // Kết nối MongoDB

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Socket.IO initialized and listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to connect to the database(s):", error);
    process.exit(1); // Thoát nếu không kết nối được DB chính
  }
};

startServer();
