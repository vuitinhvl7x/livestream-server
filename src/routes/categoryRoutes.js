import express from "express";
import * as categoryController from "../controllers/categoryController.js";
import {
  validateGetCategoriesQuery,
  validateGetCategoryParams,
  validateSearchCategoriesByTagParams,
} from "../validators/categoryValidators.js";
// import authMiddleware from "../middlewares/authMiddleware.js"; // Assuming you have this

const router = express.Router();

// Public routes
router.get("/", validateGetCategoriesQuery, categoryController.getCategories);

/**
 * @route   GET /api/categories/search
 * @desc    Tìm kiếm Categories theo tag.
 * @access  Public
 */
router.get(
  "/search",
  validateSearchCategoriesByTagParams,
  categoryController.searchCategoriesByTag
);

router.get(
  "/:categoryIdOrSlug",
  validateGetCategoryParams,
  categoryController.getCategoryDetails
);

// Routes requiring authentication (e.g., if users can suggest categories or some other interaction)
// router.post("/suggest", authMiddleware, ...categoryController.suggestCategory);

export default router;
