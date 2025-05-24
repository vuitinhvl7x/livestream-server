import ChatMessage from "../models/mongo/ChatMessage.js";

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
      console.log(
        `Chat message from ${messageData.username} for stream ${messageData.streamId} (not saved - MongoDB not configured).`
      );
      // Trả về dữ liệu gốc với timestamp giả lập nếu không lưu DB
      return { ...messageData, timestamp: new Date() };
    }

    const chatEntry = new ChatMessage(messageData);
    await chatEntry.save();
    console.log(
      `Message from ${messageData.username} in room ${messageData.streamId} saved to DB.`
    );
    return chatEntry.toObject(); // Trả về plain object
  } catch (error) {
    console.error("Error saving chat message in service:", error);
    throw new Error("Failed to save chat message: " + error.message);
  }
};

/**
 * Lấy lịch sử chat cho một stream cụ thể với phân trang.
 * @param {string} streamId - ID của stream.
 * @param {object} paginationOptions - Tùy chọn phân trang { page, limit }.
 * @returns {Promise<object>} Bao gồm danh sách tin nhắn, tổng số trang, trang hiện tại.
 * @throws {Error} Nếu có lỗi khi truy vấn.
 */
export const getChatHistoryByStreamId = async (streamId, paginationOptions) => {
  const { page = 1, limit = 50 } = paginationOptions;
  const skip = (page - 1) * limit;

  try {
    if (!process.env.MONGODB_URI) {
      console.warn(
        "Attempted to get chat history, but MONGODB_URI is not set."
      );
      return {
        messages: [],
        totalPages: 0,
        currentPage: page,
        totalMessages: 0,
      };
    }

    const messages = await ChatMessage.find({ streamId })
      .sort({ timestamp: -1 }) // Sắp xếp mới nhất lên đầu (cho query)
      .skip(skip)
      .limit(limit)
      .lean(); // .lean() để trả về plain JS objects

    const totalMessages = await ChatMessage.countDocuments({ streamId });
    const totalPages = Math.ceil(totalMessages / limit);

    return {
      messages: messages.reverse(), // Đảo ngược lại để client hiển thị từ cũ -> mới
      totalPages,
      currentPage: page,
      totalMessages,
    };
  } catch (error) {
    console.error("Error fetching chat history in service:", error);
    throw new Error("Failed to fetch chat history: " + error.message);
  }
};
