"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("VODs", "streamId", {
      // Đảm bảo tên bảng là 'VODs' (hoặc tên bảng VOD của bạn nếu khác)
      type: Sequelize.INTEGER,
      allowNull: true, // Cho phép NULL
      references: {
        // Giữ lại references nếu có
        model: "Streams", // Đảm bảo tên bảng Streams là đúng
        key: "id",
      },
      // Các thuộc tính khác của cột nếu có, ví dụ: onDelete, onUpdate
    });
  },

  async down(queryInterface, Sequelize) {
    // Before making it NOT NULL, you might want to handle existing NULLs
    // For example, update NULLs to a default valid streamId or delete rows with NULL streamId
    // This example directly changes it back, which might fail if NULLs exist.
    await queryInterface.changeColumn("VODs", "streamId", {
      type: Sequelize.INTEGER,
      allowNull: false, // Revert to NOT NULL
      references: {
        model: "Streams",
        key: "id",
      },
      // Các thuộc tính khác
    });
  },
};
