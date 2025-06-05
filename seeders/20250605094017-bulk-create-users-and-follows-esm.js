"use strict";

import bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

let db;
try {
  // Giả định thư mục gốc của project chứa thư mục seeders và src
  // Đường dẫn từ seeders/your-file.js đến src/models/index.js sẽ là ../src/models/index.js
  db = require("../src/models/index.js");
  console.log("Successfully loaded models from '../src/models/index.js'");
} catch (e) {
  console.error(
    "Failed to load models from '../src/models/index.js'. Ensure the path is correct and models/index.js exists and is valid.",
    e
  );
  throw new Error(
    "Could not load database models for seeder. Path: ../src/models/index.js"
  );
}

const User = db.User;
const Follow = db.Follow;

if (!User || !Follow) {
  throw new Error(
    "User or Follow model is undefined. Check model imports in seeder (loaded from models/index.js)."
  );
}

export default {
  async up(queryInterface, Sequelize) {
    const targetUsername = "domixi";
    const numberOfFollowersToCreate = 10000;
    const defaultPassword = "password123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    console.log(`Looking for user "${targetUsername}"...`);
    let domixiUser = await User.findOne({
      where: { username: targetUsername },
    });

    if (!domixiUser) {
      console.warn(`User "${targetUsername}" not found. Creating this user...`);
      try {
        domixiUser = await User.create({
          username: targetUsername,
          password: await bcrypt.hash("domixiSecurePassword123!", 10),
          displayName: "Domixi",
          role: "user",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(
          `User "${targetUsername}" created with ID: ${domixiUser.id}`
        );
      } catch (error) {
        console.error(`Failed to create user "${targetUsername}":`, error);
        throw new Error(
          `User "${targetUsername}" not found and could not be created.`
        );
      }
    } else {
      console.log(`User "${targetUsername}" found with ID: ${domixiUser.id}`);
    }

    const domixiUserId = domixiUser.id;

    const usersToCreate = [];
    console.log(
      `Preparing to create ${numberOfFollowersToCreate} new users...`
    );
    for (let i = 0; i < numberOfFollowersToCreate; i++) {
      const uniqueSuffix = `_${Date.now()}_${i}`;
      // Giới hạn độ dài username và loại bỏ ký tự không hợp lệ
      const baseUsername = faker.internet
        .userName()
        .replace(/[^a-zA-Z0-9_.]/g, "")
        .substring(0, 20);
      usersToCreate.push({
        username: `${baseUsername}${uniqueSuffix}`,
        password: hashedPassword,
        displayName: faker.person.fullName(),
        avatarUrl: faker.image.avatar(),
        bio: faker.lorem.sentence(),
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log(
      `Attempting to bulk create ${usersToCreate.length} new users...`
    );
    let createdUsers;
    try {
      createdUsers = await User.bulkCreate(usersToCreate, {
        validate: true,
        returning: true,
      });
      console.log(
        `Successfully created ${createdUsers.length} new users via User.bulkCreate.`
      );
    } catch (userCreationError) {
      console.error(
        "Error during User.bulkCreate. Details:",
        userCreationError.message
      );
      if (userCreationError.errors) {
        userCreationError.errors.forEach((err) =>
          console.error(
            "Validation error:",
            err.message,
            "for field:",
            err.path
          )
        );
      }

      console.log(
        "Attempting fallback: queryInterface.bulkInsert (IDs won't be returned directly)."
      );
      await queryInterface.bulkInsert("Users", usersToCreate, {});
      console.log(
        "Fallback queryInterface.bulkInsert executed. Manually verify user creation and IDs."
      );
      const usernames = usersToCreate.map((u) => u.username);
      createdUsers = await User.findAll({ where: { username: usernames } });
      if (createdUsers.length !== usersToCreate.length) {
        console.warn(
          `FALLBACK: Retrieved ${createdUsers.length} users, expected ${usersToCreate.length}. Follows might be incomplete.`
        );
      } else {
        console.log(
          `FALLBACK: Successfully retrieved ${createdUsers.length} users.`
        );
      }
    }

    if (!createdUsers || createdUsers.length === 0) {
      console.error(
        "No users were created or IDs could not be retrieved. Cannot proceed to create follows."
      );
      throw new Error("Failed to create new users or retrieve their IDs.");
    }

    console.log(
      `Preparing to create follow relationships for ${createdUsers.length} users...`
    );
    const validCreatedUsers = createdUsers.filter((user) => user && user.id);
    const followsToCreate = validCreatedUsers.map((follower) => ({
      followerId: follower.id,
      followingId: domixiUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    if (followsToCreate.length > 0) {
      await queryInterface.bulkInsert("Follows", followsToCreate, {});
      console.log(
        `Successfully made ${followsToCreate.length} users follow "${targetUsername}".`
      );
    } else {
      console.warn(
        "No valid created users with IDs found to create follow relationships. This might happen if User.bulkCreate failed and fallback also had issues retrieving users."
      );
    }
    console.log("Seeder 'up' function completed.");
  },

  async down(queryInterface, Sequelize) {
    console.log("Executing down for seeder: bulk-create-users-and-follows-esm");
    const targetUsername = "domixi";

    const domixiUser = await User.findOne({
      where: { username: targetUsername },
    });
    if (domixiUser) {
      console.log(
        'Attempting to delete follows for user "' +
          targetUsername +
          '" (ID: ' +
          domixiUser.id +
          ")"
      );
      const result = await queryInterface.bulkDelete(
        "Follows",
        { followingId: domixiUser.id },
        {}
      );
      console.log("Follow records deletion result for domixi:", result);
    } else {
      console.log(
        'User "' +
          targetUsername +
          '" not found, skipping deletion of follow records.'
      );
    }

    console.warn(
      "`down` seeder (ESM) executed. Follows for domixi might have been removed. Bulk user deletion is not automatically performed by this down method for safety."
    );
  },
};
