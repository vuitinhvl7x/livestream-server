// scripts/assignAdmin.js
import { User } from "./src/models/index.js"; // Đảm bảo đường dẫn này chính xác
import sequelize from "./src/config/database.js"; // Đảm bảo đường dẫn này chính xác

// !!! THAY ĐỔI USERNAME Ở ĐÂY !!!
const usernameToMakeAdmin = "YOUR_TARGET_USERNAME"; // <-- Thay thế bằng username của người dùng bạn muốn gán quyền admin

if (usernameToMakeAdmin === "YOUR_TARGET_USERNAME") {
  console.error(
    "Vui lòng cập nhật biến 'usernameToMakeAdmin' trong file scripts/assignAdmin.js với username thực tế."
  );
  process.exit(1);
}

const assignAdminRole = async () => {
  console.log(
    `Đang cố gắng gán vai trò 'admin' cho người dùng: ${usernameToMakeAdmin}`
  );
  try {
    // Không cần sequelize.sync() ở đây nếu bạn đã chạy migrations
    // await sequelize.sync();

    const user = await User.findOne({
      where: { username: usernameToMakeAdmin },
    });

    if (user) {
      if (user.role === "admin") {
        console.log(`Người dùng ${usernameToMakeAdmin} đã là admin.`);
      } else {
        user.role = "admin";
        await user.save();
        console.log(
          `Người dùng ${usernameToMakeAdmin} đã được cập nhật vai trò thành công thành 'admin'.`
        );
      }
    } else {
      console.log(
        `Không tìm thấy người dùng với username: ${usernameToMakeAdmin}.`
      );
    }
  } catch (error) {
    console.error("Lỗi khi gán vai trò admin:", error);
  } finally {
    console.log("Đang đóng kết nối cơ sở dữ liệu...");
    await sequelize.close();
    console.log("Đã đóng kết nối cơ sở dữ liệu.");
  }
};

assignAdminRole();
