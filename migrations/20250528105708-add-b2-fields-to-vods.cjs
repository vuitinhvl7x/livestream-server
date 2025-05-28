"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("VODs", "streamKey", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.changeColumn("VODs", "videoUrl", {
      type: Sequelize.TEXT,
      allowNull: false,
    });

    await queryInterface.addColumn("VODs", "urlExpiresAt", {
      type: Sequelize.DATE,
      allowNull: false,
    });

    await queryInterface.addColumn("VODs", "b2FileId", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("VODs", "b2FileName", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    try {
      const tableDescription = await queryInterface.describeTable("VODs");
      if (tableDescription.duration) {
        await queryInterface.renameColumn(
          "VODs",
          "duration",
          "durationSeconds"
        );
        console.log("Renamed column 'duration' to 'durationSeconds'.");
      } else if (tableDescription.durationSeconds) {
        console.log(
          "Column 'durationSeconds' already exists or 'duration' does not exist. No rename needed for duration."
        );
      } else {
        await queryInterface.addColumn("VODs", "durationSeconds", {
          type: Sequelize.INTEGER,
          allowNull: true,
        });
        console.log(
          "Added column 'durationSeconds' as 'duration' did not exist."
        );
      }
    } catch (error) {
      console.warn(
        "Could not rename 'duration' to 'durationSeconds'. This might be okay if the column was already renamed or never existed. Error:",
        error.message
      );
      const tableDescription = await queryInterface.describeTable("VODs");
      if (!tableDescription.durationSeconds) {
        await queryInterface.addColumn("VODs", "durationSeconds", {
          type: Sequelize.INTEGER,
          allowNull: true,
        });
        console.log(
          "Added column 'durationSeconds' due to rename error and it not existing."
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("VODs", "streamKey");

    await queryInterface.changeColumn("VODs", "videoUrl", {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.removeColumn("VODs", "urlExpiresAt");
    await queryInterface.removeColumn("VODs", "b2FileId");
    await queryInterface.removeColumn("VODs", "b2FileName");

    try {
      const tableDescription = await queryInterface.describeTable("VODs");
      if (tableDescription.durationSeconds) {
        await queryInterface.renameColumn(
          "VODs",
          "durationSeconds",
          "duration"
        );
        console.log("Reverted column 'durationSeconds' to 'duration'.");
      } else if (tableDescription.duration) {
        console.log(
          "Column 'duration' already exists or 'durationSeconds' does not exist. No rename needed for durationSeconds reversion."
        );
      }
    } catch (error) {
      console.warn(
        "Could not revert 'durationSeconds' to 'duration'.",
        error.message
      );
    }
  },
};
