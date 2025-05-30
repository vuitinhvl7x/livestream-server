// src/utils/errorHandler.js

// Lớp lỗi tùy chỉnh để có thể thêm statusCode và các thông tin khác
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true; // Lỗi có thể dự đoán được, không phải bug của lập trình viên

    Error.captureStackTrace(this, this.constructor);
  }
}

// Hàm helper để xử lý lỗi trong các service
const handleServiceError = (error, contextMessage) => {
  if (error instanceof AppError) {
    // Nếu lỗi đã là AppError, chỉ cần log thêm context và re-throw
    console.error(`AppError in ${contextMessage}:`, error.message);
    throw error;
  }

  // Nếu là lỗi khác (ví dụ: lỗi từ thư viện, lỗi hệ thống)
  console.error(`Unexpected error in ${contextMessage}:`, error);
  // Chuyển thành AppError với thông báo chung chung hơn để không lộ chi tiết lỗi nhạy cảm
  throw new AppError(
    `Lỗi xảy ra khi ${contextMessage}. Vui lòng thử lại sau. Chi tiết: ${error.message}`,
    500
  );
};

export { AppError, handleServiceError };
