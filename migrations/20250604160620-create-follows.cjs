"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Follows", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      followerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users", // Tên bảng Users
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      followingId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users", // Tên bảng Users
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
    // Thêm unique constraint để đảm bảo một người không thể follow cùng một người nhiều lần
    await queryInterface.addConstraint("Follows", {
      fields: ["followerId", "followingId"],
      type: "unique",
      name: "unique_follow_constraint",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint(
      "Follows",
      "unique_follow_constraint"
    );
    await queryInterface.dropTable("Follows");
  },
};
