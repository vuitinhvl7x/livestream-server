// generate_tokens.js
import dotenv from "dotenv";
dotenv.config(); // Đảm bảo các biến môi trường từ .env được load

// Import các module cần thiết từ dự án của bạn
// Đảm bảo đường dẫn chính xác từ thư mục gốc của server
import { User, sequelize } from "../src/models/index.js";
import { loginUser } from "../src/services/userService.js";
import fs from "fs/promises";
import path from "path";

// --- CẤU HÌNH ---
const NUM_TOKENS_TO_GENERATE = 300; // <-- SỐ LƯỢNG TOKEN BẠN MUỐN TẠO
const DEFAULT_PASSWORD = "password123"; // <-- MẬT KHẨU CỦA CÁC TÀI KHOẢN TEST
const OUTPUT_FILE = path.resolve("./load-tests/tokens.csv"); // <-- Tên và đường dẫn file CSV đầu ra

async function generateTokensCsv() {
  console.log("Bắt đầu quá trình tạo JWT tokens...");
  try {
    // Kiểm tra kết nối database
    await sequelize.authenticate();
    console.log("Kết nối PostgreSQL thành công.");

    // Lấy danh sách người dùng từ database
    // Lấy số lượng người dùng cần thiết, sắp xếp theo ID để có tính lặp lại nếu cần
    const users = await User.findAll({
      attributes: ["username"],
      limit: NUM_TOKENS_TO_GENERATE,
      order: [["id", "ASC"]], // Sắp xếp để có thể lấy một tập hợp cố định
    });

    if (users.length === 0) {
      console.warn(
        "Không tìm thấy người dùng nào trong database. Vui lòng đảm bảo bạn đã chạy seeder hoặc tạo người dùng."
      );
      return;
    }
    console.log(`Đã tìm thấy ${users.length} người dùng để tạo token.`);

    const tokenEntries = [];
    tokenEntries.push("username,token"); // Thêm header cho file CSV

    for (const user of users) {
      try {
        // Gọi service loginUser để lấy token
        const { token } = await loginUser(user.username, DEFAULT_PASSWORD);
        tokenEntries.push(`${user.username},${token}`);
        // console.log(`Đã tạo token cho: ${user.username}`); // Bỏ comment để xem chi tiết
      } catch (loginError) {
        console.error(
          `Lỗi khi đăng nhập và lấy token cho người dùng ${user.username}:`,
          loginError.message
        );
      }
    }

    // Ghi dữ liệu vào file CSV
    await fs.writeFile(OUTPUT_FILE, tokenEntries.join("\n"), "utf8");
    console.log(
      `Đã tạo thành công ${
        tokenEntries.length - 1
      } JWT tokens và lưu vào file: ${OUTPUT_FILE}`
    );
  } catch (error) {
    console.error("Đã xảy ra lỗi trong quá trình tạo token:", error);
  } finally {
    // Đóng kết nối database
    await sequelize.close();
    console.log("Đã đóng kết nối database.");
  }
}

// Chạy hàm tạo token
generateTokensCsv();
