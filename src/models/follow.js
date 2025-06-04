import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Follow = sequelize.define(
  "Follow",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    followerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users", // Tên bảng Users
        key: "id",
      },
      onDelete: "CASCADE",
    },
    followingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users", // Tên bảng Users
        key: "id",
      },
      onDelete: "CASCADE",
    },
  },
  {
    timestamps: true,
    // tableName: 'Follows' // Sequelize sẽ tự động đặt tên bảng là 'Follows'
  }
);

export default Follow;
