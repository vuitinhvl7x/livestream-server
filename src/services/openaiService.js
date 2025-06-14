import { OpenAI } from "openai";
import { encode } from "gpt-tokenizer";
import logger from "../utils/logger.js";
import redisClient from "../lib/redis.js";
import * as chatService from "./chatService.js"; // Import chatService để sử dụng

// Khởi tạo client OpenAI với cấu hình từ biến môi trường
// Điều này cho phép chúng ta sử dụng một API endpoint khác (HelixMind) thay vì API mặc định của OpenAI
const openai = new OpenAI({
  baseURL: process.env.OPENAI_API_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
});

// Chuyển sang sử dụng gpt-tokenizer.
// Thư viện này là pure-js và tương thích tốt với ESM.
// Nó sử dụng bộ mã hóa cl100k_base theo mặc định, giống như tiktoken.
// Chúng ta chỉ cần gọi `encode(text).length` để đếm token.

/**
 * Tạo một key cache duy nhất cho một yêu cầu tóm tắt.
 * Key này KHÔNG nên chứa numMessages nếu logic của bạn luôn lấy limit theo numMessages.
 * Nếu numMessages thay đổi, cache sẽ miss, đó là hành vi đúng.
 * @param {string|number} streamId - ID của stream.
 * @param {string} model - Model được sử dụng.
 * @param {number} numMessages - Số lượng tin nhắn được yêu cầu tóm tắt.
 * @returns {string} Key cache cho Redis.
 */
const getSummaryCacheKey = (streamId, model, numMessages) => {
  return `ai:summary:${streamId}:${model}:${numMessages}`;
};

/**
 * Lấy danh sách các model AI có sẵn từ OpenAI API.
 * Lọc ra để chỉ giữ lại các model thường dùng cho việc sinh text hoặc embedding.
 * @returns {Promise<Array<string>>} Một mảng chứa ID của các model có sẵn.
 */
export const getAvailableModels = async () => {
  try {
    const response = await openai.models.list();
    const models = response.data;

    // Lọc danh sách models để chỉ giữ lại các model có thể dùng để chat/tóm tắt.
    // Cách làm này tốt hơn việc lọc theo tên, vì nó sẽ tự động nhận diện các model mới.
    const filteredModels = models
      .filter((model) => model.type === "chat")
      .map((model) => model.id);

    logger.info(
      `[OpenAI Service] Fetched ${filteredModels.length} available models.`
    );
    return filteredModels;
  } catch (error) {
    logger.error("[OpenAI Service] Error fetching available models:", error);
    // Trả về một mảng trống hoặc một mảng mặc định nếu API lỗi
    return ["gpt-3.5-turbo", "gpt-4"];
  }
};

/**
 * Hàm nội bộ để thực sự gọi API OpenAI và tạo tóm tắt từ một danh sách tin nhắn.
 */
async function _generateSummaryFromMessages(model, messages, maxRequestTokens) {
  try {
    const systemPrompt = `You are a helpful assistant that summarizes chat conversations in Vietnamese. Provide a concise summary of the following chat messages. The summary should be in clear, natural-sounding Vietnamese.`;

    const systemPromptTokens = encode(systemPrompt).length;
    let currentTokens = systemPromptTokens;
    const chatMessagesForAPI = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const formattedMessage = `${msg.username}: ${msg.message}`;
      const messageTokens = encode(formattedMessage).length;
      if (currentTokens + messageTokens > maxRequestTokens) {
        break;
      }
      currentTokens += messageTokens;
      chatMessagesForAPI.unshift({ role: "user", content: formattedMessage });
    }

    if (chatMessagesForAPI.length === 0) {
      return "Không có tin nhắn nào để tóm tắt hoặc tin nhắn quá dài.";
    }

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        ...chatMessagesForAPI,
      ],
      temperature: 0.5,
      max_tokens: 1000,
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    logger.error(
      "[OpenAI Service] Error generating summary from messages:",
      error
    );
    throw new Error("Failed to generate summary due to an API error.");
  }
}

/**
 * Hàm chính để lấy bản tóm tắt, có tích hợp logic cache TTL và cache-invalidation.
 * @returns {Promise<object>} Trả về object chứa summary hoặc thông tin lỗi.
 */
export const getSummary = async (streamId, model, numMessages) => {
  const cacheKey = getSummaryCacheKey(streamId, model, numMessages);
  const ttl = parseInt(process.env.AI_SUMMARY_CACHE_TTL_SECONDS, 10) || 180;
  const newMessageThreshold = 50;

  // 1. Kiểm tra cache
  try {
    const cachedDataString = await redisClient.get(cacheKey);
    if (cachedDataString) {
      const cachedData = JSON.parse(cachedDataString);

      // 2. Nếu có cache, kiểm tra số tin nhắn mới
      const newMessagesCount = await chatService.countMessagesAfterTimestamp(
        streamId,
        cachedData.lastMessageTimestamp
      );

      if (newMessagesCount < newMessageThreshold) {
        logger.info(
          `[AI Summary] Cache HIT for key: ${cacheKey}. New messages: ${newMessagesCount} < ${newMessageThreshold}.`
        );
        return { summary: cachedData.summary }; // Cache hợp lệ
      } else {
        logger.info(
          `[AI Summary] Cache STALE for key: ${cacheKey}. New messages: ${newMessagesCount} >= ${newMessageThreshold}. Regenerating.`
        );
      }
    }
  } catch (error) {
    logger.error(`[AI Summary] Redis GET error for key ${cacheKey}:`, error);
  }

  // 3. Nếu Cache Miss hoặc Stale, bắt đầu quá trình tạo mới
  logger.info(
    `[AI Summary] Cache MISS or STALE for key: ${cacheKey}. Fetching new data.`
  );

  const chatHistory = await chatService.getChatHistoryByStreamId(streamId, {
    limit: numMessages,
  });
  if (!chatHistory || chatHistory.messages.length === 0) {
    return {
      error: true,
      status: 404,
      message: "No chat history found for this stream to summarize.",
    };
  }

  const messagesToSummarize = chatHistory.messages;
  // Lấy timestamp của tin nhắn cuối cùng để lưu vào cache
  const lastMessageTimestamp =
    messagesToSummarize[messagesToSummarize.length - 1].timestamp;

  // 4. Gọi hàm nội bộ để tạo tóm tắt
  const maxTokens =
    parseInt(process.env.OPENAI_MAX_TOKENS_PER_REQUEST, 10) || 19000;
  const newSummary = await _generateSummaryFromMessages(
    model,
    messagesToSummarize,
    maxTokens
  );

  // 5. Lưu object mới vào cache
  try {
    const dataToCache = {
      summary: newSummary,
      lastMessageTimestamp: lastMessageTimestamp,
    };
    await redisClient.setex(cacheKey, ttl, JSON.stringify(dataToCache));
    logger.info(
      `[AI Summary] Cache SET for key: ${cacheKey} with TTL: ${ttl}s`
    );
  } catch (redisError) {
    logger.error(
      `[AI Summary] Redis SETEX error for key ${cacheKey}:`,
      redisError
    );
  }

  return { summary: newSummary };
};
