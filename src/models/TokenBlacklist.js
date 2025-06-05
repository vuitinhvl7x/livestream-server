import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const TokenBlacklist = sequelize.define(
  "TokenBlacklist",
  {
    token: {
      type: DataTypes.STRING(512),
      primaryKey: true,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "TokenBlacklist",
    timestamps: false, // Không cần createdAt/updatedAt cho model này
  }
);

export default TokenBlacklist;
