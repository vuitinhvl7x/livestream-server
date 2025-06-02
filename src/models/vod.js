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
      allowNull: true,
      references: {
        model: "Streams",
        key: "id",
      },
    },
    streamKey: {
      // Thêm streamKey để dễ dàng liên kết với thông tin từ Nginx webhook
      type: DataTypes.STRING,
      allowNull: true, // Hoặc false nếu bạn luôn có và yêu cầu streamKey
      // unique: true, // Cân nhắc nếu streamKey phải là duy nhất
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
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
      // Sẽ lưu pre-signed URL
      type: DataTypes.TEXT, // Pre-signed URLs có thể dài
      allowNull: false,
    },
    urlExpiresAt: {
      // Thời điểm pre-signed URL hết hạn
      type: DataTypes.DATE,
      allowNull: false,
    },
    b2FileId: {
      // ID file trên B2
      type: DataTypes.STRING,
      allowNull: true, // Hoặc false nếu đây là thông tin bắt buộc sau khi upload
    },
    b2FileName: {
      // Tên file trên B2
      type: DataTypes.STRING,
      allowNull: true, // Hoặc false
    },
    thumbnailUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    thumbnailUrlExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    b2ThumbnailFileId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    b2ThumbnailFileName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "categories", // Tên bảng Categories
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    durationSeconds: {
      // Đổi tên từ duration để rõ ràng hơn là giây
      type: DataTypes.FLOAT, // Đơn vị: giây (thay đổi từ INTEGER sang FLOAT)
    },
    // createdAt và updatedAt được Sequelize quản lý tự động nếu timestamps: true
  },
  {
    modelName: "VOD",
    timestamps: true,
    // tableName: 'VODs'
  }
);

export default VOD;
