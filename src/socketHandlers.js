import jwt from "jsonwebtoken";
// import mongoose from "mongoose"; // Không cần trực tiếp nữa
import dotenv from "dotenv";
import {
  saveChatMessage,
  getChatHistoryByStreamId,
} from "./services/chatService.js";
import {
  getStreamKeyAndStatusById,
  incrementLiveViewerCount,
  decrementLiveViewerCount,
  // getLiveViewerCount, // Không cần trực tiếp ở đây nữa nếu viewer_count_updated gửi count
} from "./services/streamService.js"; // Import stream service functions
import appEmitter from "./utils/appEvents.js"; // Sửa đường dẫn import
import logger from "./utils/logger.js";

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
        logger.error("Socket JWT verification error:", err.message);
        return next(new Error("Authentication error: Invalid token"));
      }
      socket.user = decoded; // Gán thông tin user vào socket
      // Lưu trữ map của roomId (streamId) tới streamKey
      socket.joinedStreamData = new Map(); // Map<roomIdString, streamKeyString>
      next();
    });
  });

  // Lắng nghe sự kiện stream kết thúc từ appEmitter
  appEmitter.on("stream:ended", ({ streamId, streamKey }) => {
    const roomId = streamId; // streamId đã là string từ emitter
    logger.info(
      `'stream:ended' event received in socketHandlers for roomId: ${roomId}, streamKey: ${streamKey}.`
    );
    // Thông báo cho tất cả client trong phòng rằng stream đã kết thúc
    io.to(roomId).emit("stream_ended_notification", {
      roomId: roomId,
      message: `Stream ${streamKey} has ended. Chat is now disabled for this room.`,
    });

    // Buộc tất cả các socket trong phòng này rời khỏi phòng
    // io.socketsLeave(roomId) không được khuyến khích trực tiếp, thay vào đó dùng io.in(roomId).disconnectSockets(true) (Socket.IO v4+)
    // Hoặc lấy danh sách sockets và cho từng cái leave
    const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
    if (socketsInRoom) {
      socketsInRoom.forEach((socketId) => {
        const socketInstance = io.sockets.sockets.get(socketId);
        if (socketInstance) {
          socketInstance.leave(roomId);
          // Xóa dữ liệu phòng đã join khỏi socket đó nếu cần, tuy nhiên sự kiện disconnect của socket đó sẽ tự xử lý joinedStreamData
          logger.info(
            `Socket ${socketId} forcefully left room ${roomId} because stream ended.`
          );
        }
      });
    } else {
      logger.info(
        `No sockets found in room ${roomId} to remove after stream ended.`
      );
    }
    // Hoặc một cách đơn giản hơn nếu chỉ muốn họ không nhận thêm event từ phòng này và để client tự xử lý:
    // io.in(roomId).emit('force_leave_room', { roomId }); // Client sẽ phải lắng nghe sự kiện này và tự gọi socket.leave
    // Tuy nhiên, io.socketsLeave(roomId); hoặc lặp và gọi leave là cách server-side chủ động hơn.
    // Với Socket.IO v4, cách tốt nhất là:
    // io.in(roomId).disconnectSockets(true); // true để đóng kết nối ngầm
    // Nếu bạn dùng io.socketsLeave, nó có thể không hoạt động như mong đợi trong mọi trường hợp.
    // Sử dụng lặp qua các socket và .leave() là một cách an toàn hơn nếu io.socketsLeave() không hoạt động.

    // Xem xét sử dụng io.in(roomId).disconnectSockets(true) cho Socket.IO v4+
    // Dòng dưới đây sẽ cố gắng ngắt kết nối các client trong phòng đó.
    // Điều này cũng sẽ kích hoạt sự kiện 'disconnect' trên từng client, nơi bạn đã có logic dọn dẹp.
    io.in(roomId).disconnectSockets(true);
    logger.info(`Attempted to disconnect sockets in room ${roomId}.`);
  });

  io.on("connection", (socket) => {
    logger.info(
      `User connected: ${socket.id}, UserInfo: ${socket.user?.username}`
    );

    // Sự kiện để tham gia phòng notification cá nhân
    socket.on("join_notification_room", () => {
      if (socket.user && socket.user.id) {
        const userId = socket.user.id.toString();
        const notificationRoom = `notification:${userId}`;
        socket.join(notificationRoom);
        logger.info(
          `User ${socket.user.username} (${socket.id}) joined notification room: ${notificationRoom}`
        );
        socket.emit("notification_room_joined", { room: notificationRoom });
      } else {
        logger.warn(
          `User ${socket.id} tried to join notification room without valid user context.`
        );
        socket.emit("notification_room_join_error", {
          message: "Authentication required to join notification room.",
        });
      }
    });

    socket.on("join_stream_room", async (data) => {
      const { streamId } = data;
      const roomId = streamId?.toString();

      if (!roomId) {
        logger.warn(
          `User ${socket.user.username} (${socket.id}) tried to join with null/undefined streamId`
        );
        socket.emit("room_join_error", { message: "Stream ID is required." });
        return;
      }

      try {
        const streamDetails = await getStreamKeyAndStatusById(streamId);

        if (!streamDetails || !streamDetails.streamKey) {
          logger.warn(
            `Stream not found or streamKey missing for streamId ${roomId} when user ${socket.user.username} (${socket.id}) tried to join.`
          );
          socket.emit("room_join_error", { message: "Stream not found." });
          return;
        }

        const { streamKey, status } = streamDetails;

        if (status !== "live") {
          logger.warn(
            `User ${socket.user.username} (${socket.id}) tried to join stream ${streamKey} (ID: ${roomId}) which is not live (status: ${status}).`
          );
          socket.emit("room_join_error", { message: "Stream is not live." });
          return;
        }

        socket.join(roomId); // Join phòng bằng streamId (roomId)
        socket.joinedStreamData.set(roomId, streamKey); // Lưu lại mapping

        logger.info(
          `User ${socket.user.username} (${socket.id}) joined room (streamId): ${roomId} (maps to streamKey: ${streamKey})`
        );

        // Gửi lịch sử chat gần đây cho user vừa join để tránh race condition.
        try {
          const chatHistory = await getChatHistoryByStreamId(roomId, {
            page: 1,
            limit: 20,
          }); // Lấy 20 tin nhắn gần nhất

          // Gửi riêng cho socket vừa join, ngay cả khi history rỗng.
          socket.emit("recent_chat_history", {
            streamId: roomId,
            messages: chatHistory?.messages || [],
          });

          logger.info(
            `Sent recent chat history to ${socket.user.username} for room ${roomId}.`
          );
        } catch (historyError) {
          logger.error(
            `Error fetching recent chat history for room ${roomId}:`,
            historyError
          );
          // Không cần gửi lỗi cho client ở đây, vì join phòng vẫn thành công.
        }

        const userId = socket.user.id;
        const currentViewers = await incrementLiveViewerCount(
          streamKey,
          userId
        );
        if (currentViewers !== null) {
          // Phát tới phòng có tên là roomId (streamId)
          io.to(roomId).emit("viewer_count_updated", {
            streamId: roomId, // hoặc streamKey tùy theo client muốn định danh thế nào
            count: currentViewers,
          });
        }
        socket.emit("room_joined_successfully", {
          streamId: roomId,
          streamKeyForDev: streamKey,
        }); // Gửi streamId về cho client

        // Optionally, fetch and send recent chat messages or notify others
        // socket.to(streamKey).emit('user_joined_chat', { username: socket.user.username, message: 'has joined the chat.' });
      } catch (error) {
        logger.error(
          `Error during join_stream_room for streamId ${roomId} by user ${socket.user.username} (${socket.id}):`,
          error
        );
        socket.emit("room_join_error", {
          message: "Error joining stream. Please try again.",
        });
      }
    });

    socket.on("chat_message", async (data) => {
      const { streamId, message } = data; // Client gửi streamId (có thể là số hoặc chuỗi)
      const roomId = streamId?.toString(); // roomId chắc chắn là chuỗi, dùng cho tên phòng socket

      if (!roomId || !message) {
        logger.warn(
          "Received chat_message with missing streamId or message:",
          data
        );
        socket.emit("message_error", {
          message: "Stream ID and message are required.",
        });
        return;
      }

      if (!socket.rooms.has(roomId)) {
        logger.warn(
          `User ${socket.user.username} (${socket.id}) sent message to room ${roomId} they are not in.`
        );
        socket.emit("message_error", {
          message: `You are not in room ${roomId}.`,
        });
        return;
      }

      // Lấy streamKey từ map đã lưu nếu cần cho các mục đích khác (không cần cho saveChatMessage nếu nó dùng streamId)
      // const streamKey = socket.joinedStreamData.get(roomId);

      try {
        const savedMessage = await saveChatMessage({
          streamId: roomId, // LUÔN DÙNG roomId (là streamId.toString()) để đảm bảo là chuỗi cho MongoDB
          userId: socket.user.id,
          username: socket.user.username,
          message,
        });

        // Broadcast tin nhắn đến tất cả client trong phòng streamId (roomId)
        io.to(roomId).emit("new_message", {
          userId: savedMessage.userId,
          username: savedMessage.username,
          message: savedMessage.message,
          timestamp: savedMessage.timestamp,
          streamId: roomId, // Trả về streamId (roomId) cho client
        });
      } catch (error) {
        logger.error(
          `Error saving or broadcasting chat message for room ${roomId}:`,
          error
        );
        socket.emit("message_error", {
          message: "Could not process your message.",
        });
      }
    });

    socket.on("leave_stream_room", async (data) => {
      const { streamId } = data;
      const roomId = streamId?.toString();
      if (!roomId) {
        logger.warn(
          `User ${socket.user.username} (${socket.id}) tried to leave with null/undefined streamId`
        );
        return;
      }

      const streamKey = socket.joinedStreamData.get(roomId); // Lấy streamKey từ map

      if (socket.rooms.has(roomId)) {
        socket.leave(roomId);
        if (streamKey) {
          socket.joinedStreamData.delete(roomId); // Xóa mapping
          logger.info(
            `User ${socket.user.username} (${socket.id}) left room (streamId): ${roomId} (was mapped to streamKey: ${streamKey})`
          );

          const userId = socket.user.id;
          const currentViewers = await decrementLiveViewerCount(
            streamKey,
            userId
          );
          if (currentViewers !== null) {
            io.to(roomId).emit("viewer_count_updated", {
              streamId: roomId,
              count: currentViewers,
            });
          }
        } else {
          logger.warn(
            `User ${socket.user.username} (${socket.id}) left room (streamId): ${roomId}, but no streamKey was mapped. No Redis update.`
          );
        }
      } else {
        logger.warn(
          `User ${socket.user.username} (${socket.id}) tried to leave room ${roomId} they were not in.`
        );
      }
    });

    socket.on("disconnect", async () => {
      logger.info(
        `User disconnected: ${socket.id}, UserInfo: ${socket.user?.username}. Cleaning up joined rooms.`
      );
      if (
        socket.user &&
        socket.joinedStreamData &&
        socket.joinedStreamData.size > 0
      ) {
        const userId = socket.user.id;
        for (const [roomId, streamKey] of socket.joinedStreamData.entries()) {
          try {
            logger.info(
              `Processing disconnect for user ${socket.user?.username} from room (streamId): ${roomId} (mapped to streamKey: ${streamKey})`
            );
            const currentViewers = await decrementLiveViewerCount(
              streamKey,
              userId
            );
            if (currentViewers !== null) {
              // Vẫn phát tới phòng dựa trên roomId (streamId)
              io.to(roomId).emit("viewer_count_updated", {
                streamId: roomId,
                count: currentViewers,
              });
              logger.info(
                `Sent viewer_count_updated to room ${roomId} after user ${socket.user?.username} disconnected. New count: ${currentViewers}`
              );
            }
          } catch (error) {
            logger.error(
              `Error decrementing viewer count for streamKey ${streamKey} (room ${roomId}) on disconnect for user ${socket.user?.username}:`,
              error
            );
          }
        }
        socket.joinedStreamData.clear();
      }
    });
  });
};

export default initializeSocketHandlers;
