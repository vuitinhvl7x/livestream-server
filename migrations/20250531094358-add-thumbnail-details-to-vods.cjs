"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("VODs", "thumbnailUrl", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("VODs", "thumbnailUrlExpiresAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("VODs", "b2ThumbnailFileId", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("VODs", "b2ThumbnailFileName", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("VODs", "thumbnailUrl");
    await queryInterface.removeColumn("VODs", "thumbnailUrlExpiresAt");
    await queryInterface.removeColumn("VODs", "b2ThumbnailFileId");
    await queryInterface.removeColumn("VODs", "b2ThumbnailFileName");
  },
};
