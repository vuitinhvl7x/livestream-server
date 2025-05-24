import { getChatHistoryByStreamId } from "../services/chatService.js";

export const getChatHistory = async (req, res) => {
  try {
    const { streamId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    // const skip = (page - 1) * limit; // Logic skip sẽ do service xử lý

    if (!streamId) {
      return res.status(400).json({ message: "Stream ID is required." });
    }
    // Gọi service để lấy lịch sử chat
    const result = await getChatHistoryByStreamId(streamId, { page, limit });

    // const messages = await ChatMessage.find({ streamId })
    //   .sort({ timestamp: -1 })
    //   .skip(skip)
    //   .limit(limit)
    //   .lean();

    // const totalMessages = await ChatMessage.countDocuments({ streamId });
    // const totalPages = Math.ceil(totalMessages / limit);

    res.status(200).json({
      message: "Chat history fetched successfully",
      data: result.messages, // Service đã reverse() nếu cần
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      totalMessages: result.totalMessages,
    });
  } catch (error) {
    console.error("Error fetching chat history in controller:", error);
    res
      .status(500)
      .json({ message: "Error fetching chat history", error: error.message });
  }
};
