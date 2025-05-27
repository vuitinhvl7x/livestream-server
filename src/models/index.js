import sequelize from "../config/database.js";
import User from "./user.js";
import Stream from "./stream.js";
import VOD from "./vod.js";

// --- Định nghĩa Associations ---

// User <-> Stream (One-to-Many)
User.hasMany(Stream, {
  foreignKey: "userId",
  as: "streams",
  onDelete: "CASCADE",
});
Stream.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// User <-> VOD (One-to-Many)
User.hasMany(VOD, {
  foreignKey: "userId",
  as: "vods",
  onDelete: "CASCADE",
});
VOD.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// Stream <-> VOD (One-to-Many)
Stream.hasMany(VOD, {
  foreignKey: "streamId",
  as: "vods",
  onDelete: "CASCADE",
});
VOD.belongsTo(Stream, {
  foreignKey: "streamId",
  as: "stream",
});

// --- Export Models và Sequelize Instance ---

export { sequelize, User, Stream, VOD };
