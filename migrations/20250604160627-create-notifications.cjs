"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Notifications", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users", // Tên bảng Users
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      type: {
        type: Sequelize.ENUM("new_follower", "stream_started", "new_vod"),
        allowNull: false,
      },
      message: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      isRead: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      relatedEntityId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      relatedEntityType: {
        type: Sequelize.STRING, // 'user', 'stream', 'vod'
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
    // Thêm index
    await queryInterface.addIndex("Notifications", ["userId"]);
    await queryInterface.addIndex("Notifications", ["userId", "isRead"]);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("Notifications", ["userId", "isRead"]);
    await queryInterface.removeIndex("Notifications", ["userId"]);
    await queryInterface.dropTable("Notifications");
  },
};
