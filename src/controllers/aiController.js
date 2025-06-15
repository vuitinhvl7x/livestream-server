import * as openaiService from "../services/openaiService.js";
import * as chatService from "../services/chatService.js";
import logger from "../utils/logger.js";
import { validationResult } from "express-validator";

/**
 * Controller để lấy danh sách các model AI có sẵn.
 */
export const getAIModels = async (req, res, next) => {
  try {
    const models = await openaiService.getAvailableModels();
    res.status(200).json({
      message: "Successfully retrieved available AI models.",
      data: models,
    });
  } catch (error) {
    logger.error("[AI Controller] Error getting AI models:", error);
    next(error);
  }
};

/**
 * Controller để tóm tắt lịch sử chat của một stream.
 */
export const summarizeStreamChat = async (req, res, next) => {
  // 1. Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { streamId } = req.params;
    const {
      model = process.env.OPENAI_DEFAULT_SUMMARY_MODEL || "gpt-4o-mini",
      numMessages = parseInt(process.env.OPENAI_MAX_SUMMARY_MESSAGES, 10) ||
        100,
    } = req.body;

    // 2. Gọi hàm service duy nhất để xử lý tất cả logic
    const result = await openaiService.getSummary(streamId, model, numMessages);

    // 3. Xử lý kết quả từ service
    if (result.error) {
      return res.status(result.status || 500).json({ message: result.message });
    }

    // 4. Trả về kết quả thành công
    res.status(200).json({
      message: "Chat summary generated successfully.",
      data: {
        modelUsed: model,
        summary: result.summary,
      },
    });
  } catch (error) {
    logger.error(
      `[AI Controller] Error summarizing chat for stream ${req.params.streamId}:`,
      error
    );
    next(new Error("An error occurred while generating the summary."));
  }
};
