"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("VODs", "durationSeconds", {
      type: Sequelize.FLOAT,
      allowNull: true, // Hoặc false tùy theo logic của bạn, nhưng nên giữ nguyên từ model
    });
  },

  async down(queryInterface, Sequelize) {
    // Nếu bạn muốn rollback, hãy đổi lại thành INTEGER
    // Cẩn thận: việc đổi từ FLOAT sang INTEGER có thể gây mất dữ liệu (phần thập phân)
    await queryInterface.changeColumn("VODs", "durationSeconds", {
      type: Sequelize.INTEGER,
      allowNull: true, // Giữ nguyên từ model gốc trước khi thay đổi
    });
  },
};
