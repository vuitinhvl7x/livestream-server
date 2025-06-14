import ChatMessage from "../models/mongo/ChatMessage.js";
import logger from "../utils/logger.js";

/**
 * Lưu một tin nhắn chat mới vào MongoDB.
 * @param {object} messageData - Dữ liệu tin nhắn bao gồm streamId, userId, username, message.
 * @returns {Promise<object>} Tin nhắn đã lưu.
 * @throws {Error} Nếu có lỗi khi lưu.
 */
export const saveChatMessage = async (messageData) => {
  try {
    // Chỉ lưu nếu MONGODB_URI được cấu hình (nghĩa là MongoDB đã kết nối)
    if (!process.env.MONGODB_URI) {
      logger.info(
        `Chat message from ${messageData.username} for stream ${messageData.streamId} (not saved - MongoDB not configured).`
      );
      // Trả về dữ liệu gốc với timestamp giả lập nếu không lưu DB
      return { ...messageData, timestamp: new Date() };
    }

    const chatEntry = new ChatMessage(messageData);
    await chatEntry.save();
    logger.info(
      `Message from ${messageData.username} in room ${messageData.streamId} saved to DB.`
    );
    return chatEntry.toObject(); // Trả về plain object
  } catch (error) {
    logger.error("Error saving chat message in service:", error);
    throw new Error("Failed to save chat message: " + error.message);
  }
};

/**
 * Lấy lịch sử chat cho một stream cụ thể, hỗ trợ phân trang kiểu "tải thêm" (cursor-based).
 * @param {string} streamId - ID của stream.
 * @param {object} options - Tùy chọn truy vấn.
 * @param {number} [options.limit=50] - Số lượng tin nhắn tối đa cần lấy.
 * @param {string|Date} [options.before=null] - Cursor (timestamp) để lấy các tin nhắn cũ hơn.
 * @returns {Promise<object>} Chỉ chứa mảng tin nhắn { messages: [...] }.
 * @throws {Error} Nếu có lỗi khi truy vấn.
 */
export const getChatHistoryByStreamId = async (
  streamId,
  { limit = 50, before = null }
) => {
  try {
    if (!process.env.MONGODB_URI) {
      logger.warn("Attempted to get chat history, but MONGODB_URI is not set.");
      return { messages: [] };
    }

    const query = { streamId };

    // Nếu có cursor 'before', tìm các tin nhắn có timestamp nhỏ hơn (cũ hơn).
    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    const messages = await ChatMessage.find(query)
      .sort({ timestamp: -1 }) // Luôn lấy những tin mới nhất trong tập kết quả
      .limit(limit)
      .lean(); // .lean() để trả về plain JS objects

    // Kết quả trả về đang là [mới nhất, ..., cũ nhất]
    // Đảo ngược lại để client có thể dễ dàng chèn vào đầu danh sách [cũ nhất, ..., mới nhất]
    return {
      messages: messages.reverse(),
    };
  } catch (error) {
    logger.error("Error fetching chat history in service:", error);
    throw new Error("Failed to fetch chat history: " + error.message);
  }
};
