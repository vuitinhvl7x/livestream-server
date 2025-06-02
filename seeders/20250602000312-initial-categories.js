"use strict";

import slugify from "slugify";

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    const categoriesData = [
      {
        name: "Gaming",
        slug: slugify("Gaming", {
          lower: true,
          strict: true,
          remove: /[*+~.()\'"!:@]/g,
        }),
        description: "All about video games and eSports.",
        thumbnailUrl:
          "https://via.placeholder.com/150/0000FF/808080?Text=Gaming",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Music",
        slug: slugify("Music", {
          lower: true,
          strict: true,
          remove: /[*+~.()\'"!:@]/g,
        }),
        description: "Live music performances, DJ sets, and more.",
        thumbnailUrl:
          "https://via.placeholder.com/150/FF0000/FFFFFF?Text=Music",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Dota 2",
        slug: slugify("Dota 2", {
          lower: true,
          strict: true,
          remove: /[*+~.()\'"!:@]/g,
        }),
        description: "The battlefield of the Ancients awaits.",
        thumbnailUrl:
          "https://via.placeholder.com/150/008000/FFFFFF?Text=Dota+2",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Just Chatting",
        slug: slugify("Just Chatting", {
          lower: true,
          strict: true,
          remove: /[*+~.()\'"!:@]/g,
        }),
        description: "Hang out, talk, and connect with the community.",
        thumbnailUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await queryInterface.bulkInsert("Categories", categoriesData, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Categories", null, {});
  },
};
