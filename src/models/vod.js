import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const VOD = sequelize.define(
  "VOD",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    streamId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Streams", // Giữ nguyên tham chiếu bằng chuỗi tên bảng
        key: "id",
      },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users", // Giữ nguyên tham chiếu bằng chuỗi tên bảng
        key: "id",
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    videoUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    thumbnail: {
      type: DataTypes.STRING,
    },
    duration: {
      type: DataTypes.INTEGER, // Đơn vị: giây
    },
    // createdAt và updatedAt được Sequelize quản lý tự động nếu timestamps: true
  },
  {
    modelName: "VOD",
    timestamps: true, // Mặc định là true, Sequelize sẽ tự thêm createdAt và updatedAt
    // tableName: 'VODs' // Nếu bạn muốn tên bảng khác với tên model (số nhiều của modelName)
  }
);

export default VOD;
