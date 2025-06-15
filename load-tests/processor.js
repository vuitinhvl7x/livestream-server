"use strict";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Do đang ở trong ES Module, cần dùng cách này để lấy __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đọc và phân tích file CSV chỉ một lần khi script bắt đầu
const users = fs
  .readFileSync(path.join(__dirname, "users2.csv"), "utf8")
  .split("\n") // Tách file thành các dòng
  .slice(1) // Bỏ qua dòng header
  .filter((line) => line.trim() !== "") // Bỏ qua các dòng trống
  .map((line) => {
    // Phân tích một dòng CSV, xử lý trường hợp message có dấu phẩy bên trong dấu ngoặc kép
    const match = line.match(/(.*?),"(.*)"/);
    if (match) {
      return {
        username: match[1],
        message_content: match[2].replace(/""/g, '"'), // Thay thế "" thành "
      };
    }
    // Fallback cho trường hợp không có dấu ngoặc kép (ít khả năng xảy ra)
    const parts = line.split(",");
    return {
      username: parts[0],
      message_content: parts[1],
    };
  });

export function setRandomUser(context, events, done) {
  // Chọn một người dùng ngẫu nhiên từ danh sách đã đọc
  const randomUser = users[Math.floor(Math.random() * users.length)];

  // Gán username và message vào context của người dùng ảo hiện tại
  context.vars.username = randomUser.username;
  context.vars.message_content = randomUser.message_content;

  // Báo cho Artillery tiếp tục
  return done();
}
