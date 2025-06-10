import { body, param, query } from "express-validator";

export const validateCreateCategory = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name cannot be empty.")
    .isLength({ min: 2, max: 100 })
    .withMessage("Category name must be between 2 and 100 characters."),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(
      "Description must be a string with a maximum of 1000 characters."
    ),
  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array.")
    .custom((tags) => {
      if (!tags.every((tag) => typeof tag === "string")) {
        throw new Error("Each tag must be a string.");
      }
      return true;
    }),
  // thumbnailFile will be handled by multer and service layer
];

export const validateUpdateCategory = [
  param("categoryIdOrSlug")
    .notEmpty()
    .withMessage("Category ID or Slug must be provided in URL path."),
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Category name cannot be empty.")
    .isLength({ min: 2, max: 100 })
    .withMessage("Category name must be between 2 and 100 characters."),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(
      "Description must be a string with a maximum of 1000 characters."
    ),
  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array.")
    .custom((tags) => {
      if (!tags.every((tag) => typeof tag === "string")) {
        throw new Error("Each tag must be a string.");
      }
      return true;
    }),
  // thumbnailFile will be handled by multer and service layer
];

export const validateGetCategoryParams = [
  // For getting a single category by ID or Slug
  param("categoryIdOrSlug")
    .notEmpty()
    .withMessage("Category ID or Slug must be provided in URL path."),
];

export const validateGetCategoriesQuery = [
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
];

export const validateSearchCategoriesByTagParams = [
  query("tag")
    .trim()
    .notEmpty()
    .withMessage("Search tag cannot be empty.")
    .isString()
    .withMessage("Search tag must be a string."),
  // Optional pagination for categories search results
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
];

export const validateSearchCategoriesByNameQuery = [
  query("q")
    .trim()
    .notEmpty()
    .withMessage("Search query 'q' cannot be empty.")
    .isString()
    .withMessage("Search query 'q' must be a string."),
  // Optional pagination for categories search results
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
];
