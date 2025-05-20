import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./user.js"; // Import User model for association

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
        model: User, // Reference the User model directly
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
      allowNull: true, // Or provide a defaultValue: 'Default Stream Title'
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
    thumbnail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // createdAt and updatedAt are handled by Sequelize timestamps: true
  },
  {
    timestamps: true, // Enable automatic createdAt and updatedAt fields
  }
);

// Define associations
// A User can have many Streams
User.hasMany(Stream, {
  foreignKey: "userId",
  as: "streams", // Optional: alias for the association
});
// A Stream belongs to a User
Stream.belongsTo(User, {
  foreignKey: "userId",
  as: "user", // Optional: alias for the association
});

export default Stream;
