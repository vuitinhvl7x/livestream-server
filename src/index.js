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
// Import chat routes and handlers if they are created later
import chatRoutes from "./routes/chatRoutes.js";
import initializeSocketHandlers from "./socketHandlers.js";

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
app.use("/api/streams", streamRoutes);
app.use("/api/webhook", webhookRoutes);
app.use("/api/chat", chatRoutes);

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
