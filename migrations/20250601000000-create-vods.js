"use strict";
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("VODs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      streamId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Streams", // Tên bảng Streams
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
      },
      videoUrl: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      thumbnail: {
        type: Sequelize.STRING,
      },
      duration: {
        type: Sequelize.INTEGER, // Đơn vị: giây
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
    await queryInterface.addIndex("VODs", ["streamId"]);
    await queryInterface.addIndex("VODs", ["userId"]);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("VODs");
  },
};
