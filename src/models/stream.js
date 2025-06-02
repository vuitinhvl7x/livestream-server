import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Stream = sequelize.define(
  "Stream",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users", // Giữ nguyên tham chiếu bằng chuỗi tên bảng
        key: "id",
      },
    },
    streamKey: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("live", "ended"),
      defaultValue: "ended",
      allowNull: false,
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    viewerCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
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
        model: "categories",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    // createdAt and updatedAt are handled by Sequelize timestamps: true
  },
  {
    timestamps: true, // Enable automatic createdAt and updatedAt fields
  }
);

export default Stream;
