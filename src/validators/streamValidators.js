import { body, param, query } from "express-validator";

export const validateCreateStream = [
  body("title")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage("Title must be a string between 3 and 255 characters"),
  body("description")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(
      "Description must be a string with a maximum of 1000 characters"
    ),
];

export const validateUpdateStream = [
  param("streamId")
    .isInt({ gt: 0 })
    .withMessage("Stream ID must be a positive integer"),
  body("title")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage("Title must be a string between 3 and 255 characters"),
  body("description")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(
      "Description must be a string with a maximum of 1000 characters"
    ),
  body("status")
    .optional()
    .isIn(["live", "ended"])
    .withMessage("Status must be either 'live' or 'ended'"),
];

export const validateGetStreams = [
  query("status")
    .optional()
    .isIn(["live", "ended"])
    .withMessage("Status must be either 'live' or 'ended'"),
  query("page")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Page must be a positive integer")
    .toInt(), // Chuyển đổi thành số nguyên
  query("limit")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Limit must be a positive integer")
    .toInt(), // Chuyển đổi thành số nguyên
];

export const validateGetStreamById = [
  param("streamId")
    .isInt({ gt: 0 })
    .withMessage("Stream ID must be a positive integer")
    .toInt(), // Chuyển đổi thành số nguyên
];
