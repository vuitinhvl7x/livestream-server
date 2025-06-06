import { Sequelize } from "sequelize";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import logger from "../utils/logger.js";
dotenv.config();

// Determine the environment
const env = process.env.NODE_ENV || "development";

// Construct the path to config.json
// Assuming the script is run from the project root or src, and config.json is in config/
let configPath;
if (fs.existsSync(path.join(process.cwd(), "config", "config.json"))) {
  configPath = path.join(process.cwd(), "config", "config.json");
} else if (
  fs.existsSync(path.join(process.cwd(), "..", "config", "config.json"))
) {
  // If run from src/
  configPath = path.join(process.cwd(), "..", "config", "config.json");
} else {
  throw new Error("Could not find config/config.json. CWD: " + process.cwd());
}

// Read and parse config.json
const configFile = fs.readFileSync(configPath, "utf8");
const config = JSON.parse(configFile)[env];

if (!config || !config.dialect) {
  throw new Error(
    `Database configuration for environment '${env}' not found or dialect is missing in config/config.json`
  );
}

const sequelize = new Sequelize(
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
  }
);

export default sequelize;
