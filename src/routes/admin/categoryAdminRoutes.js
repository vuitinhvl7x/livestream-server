import express from "express";
import * as categoryController from "../../controllers/categoryController.js";
import {
  validateCreateCategory,
  validateUpdateCategory,
  validateGetCategoryParams,
} from "../../validators/categoryValidators.js";
import authMiddleware from "../../middlewares/authMiddleware.js";
import { adminCheckMiddleware } from "../../middlewares/adminCheckMiddleware.js";
import upload from "../../middlewares/uploadMiddleware.js";

const router = express.Router();

// All routes in this file are protected by authMiddleware and adminCheckMiddleware
router.use(authMiddleware);
router.use(adminCheckMiddleware);

router.post(
  "/",
  upload.single("thumbnailFile"), // Middleware for single file upload
  validateCreateCategory,
  categoryController.createCategory
);

router.put(
  "/:categoryIdOrSlug",
  upload.single("thumbnailFile"),
  validateUpdateCategory,
  categoryController.updateCategory
);

router.delete(
  "/:categoryIdOrSlug",
  validateGetCategoryParams, // Just to validate param format
  categoryController.deleteCategory
);

// Admin can also use the public GET routes, but they are defined in categoryRoutes.js
// If admin needs a special version of GET, define it here.

export default router;
