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
  body("categoryId")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Category ID must be a positive integer")
    .toInt(),
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
  body("categoryId")
    .optional({ nullable: true })
    .isInt({ gt: 0 })
    .withMessage("Category ID must be a positive integer or null")
    .toInt(),
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
    .toInt(),
  query("limit")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Limit must be a positive integer")
    .toInt(),
  query("categoryId")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Category ID must be a positive integer")
    .toInt(),
  query("userId")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("User ID must be a positive integer")
    .toInt(),
];

export const validateGetStreamById = [
  param("streamId")
    .isInt({ gt: 0 })
    .withMessage("Stream ID must be a positive integer")
    .toInt(),
];

export const validateStreamSearchParams = [
  query("tag")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Search tag must be a string if provided.")
    .trim(),
  query("searchQuery")
    .optional()
    .isString()
    .trim()
    .withMessage("Search query must be a string."),
  query("streamerUsername")
    .optional()
    .isString()
    .trim()
    .withMessage("Streamer username must be a string."),
  query("page")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Page must be a positive integer")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Limit must be a positive integer")
    .toInt(),
  (req, res, next) => {
    const { tag, searchQuery, streamerUsername } = req.query;
    if (!tag && !searchQuery && !streamerUsername) {
      return res.status(400).json({
        errors: [
          {
            type: "query",
            msg: "At least one search criteria (tag, searchQuery, or streamerUsername) must be provided.",
            path: "query",
            location: "query",
          },
        ],
      });
    }
    next();
  },
];
