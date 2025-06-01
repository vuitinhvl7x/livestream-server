"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "avatarUrlExpiresAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("Users", "b2AvatarFileId", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("Users", "b2AvatarFileName", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Users", "avatarUrlExpiresAt");
    await queryInterface.removeColumn("Users", "b2AvatarFileId");
    await queryInterface.removeColumn("Users", "b2AvatarFileName");
  },
};
