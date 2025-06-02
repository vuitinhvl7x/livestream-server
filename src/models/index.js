import sequelize from "../config/database.js";
import User from "./user.js";
import Stream from "./stream.js";
import VOD from "./vod.js";
import Category from "./category.js";

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

// Category <-> Stream (One-to-Many)
Category.hasMany(Stream, {
  foreignKey: "categoryId",
  as: "streams",
  onDelete: "SET NULL",
});
Stream.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category",
});

// Category <-> VOD (One-to-Many)
Category.hasMany(VOD, {
  foreignKey: "categoryId",
  as: "categoryVods",
  onDelete: "SET NULL",
});
VOD.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category",
});

// --- Export Models và Sequelize Instance ---

export { sequelize, User, Stream, VOD, Category };
