"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const process = require("process");
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/config.json")[env];
const db = {};
const dotenv = require("dotenv");
dotenv.config();

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      dialect: config.dialect,
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      dialectOptions: config.dialectOptions || {},
    }
  );
}

const modelsDir = path.join(__dirname, "../src/models");

fs.readdirSync(modelsDir)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 &&
      file.slice(-3) === ".js" &&
      file.indexOf(".test.js") === -1
    );
  })
  .forEach(async (file) => {
    try {
      const modelModule = await import(
        path.join(modelsDir, file).replace(/\\/g, "/")
      );
      const model = modelModule.default(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
    } catch (err) {
      console.error(`Error importing model ${file}:`, err);
    }
  });

async function initializeModels() {
  const files = fs.readdirSync(modelsDir).filter((file) => {
    return (
      file.indexOf(".") !== 0 &&
      file.slice(-3) === ".js" &&
      file.indexOf(".test.js") === -1
    );
  });

  for (const file of files) {
    try {
      const modulePath = path.join(modelsDir, file);
      const moduleURL = "file:///" + modulePath.replace(/\\/g, "/");
      const modelModule = await import(moduleURL);

      if (typeof modelModule.default === "function") {
        const model = modelModule.default(sequelize, Sequelize.DataTypes);
        db[model.name] = model;
      } else {
        console.warn(
          `Model file ${file} does not have a default export function.`
        );
      }
    } catch (err) {
      console.error(`Error importing model ${file}:`, err);
    }
  }

  Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) {
      db[modelName].associate(db);
    }
  });
}

(async () => {
  const files = fs.readdirSync(modelsDir).filter((file) => {
    return (
      file.indexOf(".") !== 0 &&
      file.slice(-3) === ".js" &&
      file.indexOf(".test.js") === -1
    );
  });

  for (const file of files) {
    try {
      const modulePath = path.join(modelsDir, file);
      const moduleURL = "file:///" + modulePath.replace(/\\/g, "/");
      const modelModule = await import(moduleURL);
      if (
        modelModule.default &&
        typeof modelModule.default.init === "function"
      ) {
        const model = modelModule.default;
        if (
          typeof model === "function" &&
          model.prototype instanceof Sequelize.Model
        ) {
          db[model.name] = model;
        } else if (modelModule.default.name && modelModule.default.sequelize) {
          db[modelModule.default.name] = modelModule.default;
        } else if (typeof modelModule.default === "function") {
          const definedModel = modelModule.default;
          if (definedModel.name && definedModel.sequelize) {
            db[definedModel.name] = definedModel;
          } else {
            console.warn(
              `Model ${file} default export is a function but not directly a Sequelize model. Manual call may be needed if it's a factory.`
            );
          }
        }
      }
    } catch (err) {
      console.error(`Error processing model file ${file} for db object:`, err);
    }
  }

  Object.keys(db).forEach((modelName) => {
    if (db[modelName] && db[modelName].associate) {
      db[modelName].associate(db);
    }
  });
})();

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
