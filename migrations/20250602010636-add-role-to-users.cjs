"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "role", {
      type: Sequelize.ENUM("user", "admin"),
      allowNull: false,
      defaultValue: "user",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Users", "role");
    // If you need to remove the ENUM type itself on PostgreSQL, you might need raw SQL:
    // await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Users_role";');
  },
};
