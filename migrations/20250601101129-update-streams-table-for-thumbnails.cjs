"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Check if the old 'thumbnail' column exists before trying to rename
      const tableDescription = await queryInterface.describeTable("Streams", {
        transaction,
      });
      if (tableDescription.thumbnail) {
        await queryInterface.renameColumn(
          "Streams",
          "thumbnail",
          "thumbnailUrl",
          { transaction }
        );
      } else if (!tableDescription.thumbnailUrl) {
        // If 'thumbnail' doesn't exist and 'thumbnailUrl' also doesn't, then add 'thumbnailUrl'
        // This case might happen if a previous migration failed or was partially applied
        await queryInterface.addColumn(
          "Streams",
          "thumbnailUrl",
          {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          { transaction }
        );
      }
      // If tableDescription.thumbnailUrl already exists and thumbnail does not, we assume rename was done or it was created correctly.

      await queryInterface.addColumn(
        "Streams",
        "thumbnailUrlExpiresAt",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "Streams",
        "b2ThumbnailFileId",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "Streams",
        "b2ThumbnailFileName",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn("Streams", "b2ThumbnailFileName", {
        transaction,
      });
      await queryInterface.removeColumn("Streams", "b2ThumbnailFileId", {
        transaction,
      });
      await queryInterface.removeColumn("Streams", "thumbnailUrlExpiresAt", {
        transaction,
      });

      // Check if 'thumbnailUrl' exists before trying to rename it back to 'thumbnail'
      const tableDescription = await queryInterface.describeTable("Streams", {
        transaction,
      });
      if (tableDescription.thumbnailUrl) {
        await queryInterface.renameColumn(
          "Streams",
          "thumbnailUrl",
          "thumbnail",
          { transaction }
        );
      }
      // If 'thumbnailUrl' doesn't exist, we assume 'thumbnail' is already there or neither exists, so no action for this column.
    });
  },
};
