import jwt from "jsonwebtoken";
// import mongoose from "mongoose"; // Không cần trực tiếp nữa
import dotenv from "dotenv";
import { saveChatMessage } from "./services/chatService.js"; 

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
// const MONGODB_URI = process.env.MONGODB_URI; // Không cần trực tiếp nữa

// Kết nối MongoDB đã chuyển sang src/config/mongodb.js và gọi ở src/index.js

// Định nghĩa Schema và Model cho ChatMessage đã chuyển sang src/models/mongo/ChatMessage.js
// const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema);

const initializeSocketHandlers = (io) => {
  // Middleware xác thực JWT cho Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token; // Client gửi token qua socket.handshake.auth
    if (!token) {
      return next(new Error("Authentication error: Token not provided"));
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error("Socket JWT verification error:", err.message);
        return next(new Error("Authentication error: Invalid token"));
      }
      socket.user = decoded; // Gán thông tin user vào socket
      next();
    });
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}, UserInfo:`, socket.user);

    socket.on("join_stream_room", (streamId) => {
      if (!streamId) {
        console.warn(
          `User ${socket.user.username} (${socket.id}) tried to join null/undefined streamId`
        );
        // Có thể gửi lại lỗi cho client
        // socket.emit('error_joining_room', { message: 'Stream ID is required.' });
        return;
      }
      socket.join(streamId);
      console.log(
        `User ${socket.user.username} (${socket.id}) joined room: ${streamId}`
      );
      // Thông báo cho những người khác trong phòng (tùy chọn)
      // socket.to(streamId).emit('user_joined_chat', { username: socket.user.username, message: 'has joined the chat.' });
    });

    socket.on("chat_message", async (data) => {
      const { streamId, message } = data;
      if (!streamId || !message) {
        console.warn(
          "Received chat_message with missing streamId or message:",
          data
        );
        // socket.emit('error_sending_message', { message: 'Stream ID and message are required.' });
        return;
      }

      if (!socket.rooms.has(streamId)) {
        console.warn(
          `User ${socket.user.username} (${socket.id}) sent message to room ${streamId} they are not in.`
        );
        // Có thể join họ vào phòng nếu đó là ý đồ, hoặc báo lỗi
        // Hoặc đơn giản là không xử lý nếu user không ở trong phòng đó
        // socket.emit('error_sending_message', { message: \`You are not in room ${streamId}.\` });
        return;
      }

      try {
        // Gọi service để lưu tin nhắn
        const savedMessage = await saveChatMessage({
          streamId,
          userId: socket.user.id,
          username: socket.user.username,
          message,
        });

        // Broadcast tin nhắn đến tất cả client trong phòng (bao gồm cả người gửi)
        io.to(streamId).emit("new_message", {
          userId: savedMessage.userId, // Sử dụng dữ liệu từ tin nhắn đã lưu/xử lý
          username: savedMessage.username,
          message: savedMessage.message,
          timestamp: savedMessage.timestamp, // Gửi timestamp từ server (sau khi lưu)
          streamId: savedMessage.streamId,
        });
      } catch (error) {
        console.error("Error saving or broadcasting chat message:", error);
        // Có thể gửi lỗi về cho client gửi
        // socket.emit('error_sending_message', { message: 'Could not process your message.' });
      }
    });

    socket.on("leave_stream_room", (streamId) => {
      if (streamId && socket.rooms.has(streamId)) {
        socket.leave(streamId);
        console.log(
          `User ${socket.user.username} (${socket.id}) left room: ${streamId}`
        );
        // Thông báo cho những người khác trong phòng (tùy chọn)
        // socket.to(streamId).emit('user_left_chat', { username: socket.user.username, message: 'has left the chat.' });
      }
    });

    socket.on("disconnect", () => {
      console.log(
        `User disconnected: ${socket.id}, UserInfo:`,
        socket.user?.username
      );
      // Tự động rời khỏi các phòng khi ngắt kết nối
      // Socket.IO tự xử lý việc này, nhưng bạn có thể thêm logic tùy chỉnh nếu cần
    });
  });
};

export default initializeSocketHandlers;
