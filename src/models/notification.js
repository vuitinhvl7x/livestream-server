import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users", // Tên bảng Users
        key: "id",
      },
      onDelete: "CASCADE",
    },
    type: {
      type: DataTypes.ENUM("new_follower", "stream_started", "new_vod"),
      allowNull: false,
    },
    message: {
      type: DataTypes.STRING, // Hoặc DataTypes.JSON nếu bạn muốn lưu chi tiết phức tạp
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    relatedEntityId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Có thể null nếu không có thực thể liên quan trực tiếp
    },
    relatedEntityType: {
      type: DataTypes.STRING, // 'user', 'stream', 'vod'
      allowNull: true,
    },
  },
  {
    timestamps: true,
    // tableName: 'Notifications' // Sequelize sẽ tự động đặt tên bảng là 'Notifications'
  }
);

export default Notification;
