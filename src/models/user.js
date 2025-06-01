import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const User = sequelize.define(
  "User",
  {
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    avatarUrl: {
      type: DataTypes.STRING, // URL to the avatar image (e.g., stored on B2)
      allowNull: true,
    },
    avatarUrlExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    b2AvatarFileId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    b2AvatarFileName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT, // For longer text
      allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);

export default User;
