import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema({
  streamId: {
    type: String,
    required: true,
    index: true, // Index để query nhanh hơn theo streamId
  },
  userId: {
    type: String, // Hoặc mongoose.Schema.Types.ObjectId nếu User cũng trong Mongo và bạn muốn reference
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Tránh lỗi OverwriteModelError nếu model đã được compile (thường xảy ra khi dùng nodemon)
const ChatMessage =
  mongoose.models.ChatMessage ||
  mongoose.model("ChatMessage", chatMessageSchema);

export default ChatMessage;
