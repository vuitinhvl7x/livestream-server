import {
  createCategoryService,
  updateCategoryService,
  deleteCategoryService,
  getCategoriesService,
  getCategoryDetailsService,
  searchCategoriesByTagService,
} from "../services/categoryService.js";
import { validationResult, matchedData } from "express-validator";
import { AppError } from "../utils/errorHandler.js";
import fs from "fs/promises";

const logger = {
  info: console.log,
  error: console.error,
};

export const createCategory = async (req, res, next) => {
  let thumbnailFilePathTemp = null;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      if (req.file) await fs.unlink(req.file.path);
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }

    const validatedData = matchedData(req);
    const userIdForPath = req.user?.id; // Or some other logic for B2 path

    const servicePayload = {
      ...validatedData, // name, description, slug (optional), tags (optional)
      thumbnailFilePath: req.file?.path,
      originalThumbnailFileName: req.file?.originalname,
      thumbnailMimeType: req.file?.mimetype,
      userIdForPath: "_admin_created", // Example path segment for admin-created categories
    };
    if (req.file) thumbnailFilePathTemp = req.file.path;

    const category = await createCategoryService(servicePayload);

    if (thumbnailFilePathTemp) {
      try {
        await fs.unlink(thumbnailFilePathTemp);
      } catch (unlinkError) {
        logger.error(
          "Controller: Error deleting temp thumbnail after category creation:",
          unlinkError
        );
      }
    }

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    if (thumbnailFilePathTemp) {
      try {
        await fs.unlink(thumbnailFilePathTemp);
      } catch (e) {
        logger.error("Cleanup error:", e);
      }
    }
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  let thumbnailFilePathTemp = null;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      if (req.file) await fs.unlink(req.file.path);
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }

    const { categoryIdOrSlug } = req.params;
    const validatedData = matchedData(req);

    const servicePayload = {
      ...validatedData, // name, description, slug (optional), tags (optional)
      thumbnailFilePath: req.file?.path,
      originalThumbnailFileName: req.file?.originalname,
      thumbnailMimeType: req.file?.mimetype,
      userIdForPath: "_admin_updated",
    };
    if (req.file) thumbnailFilePathTemp = req.file.path;

    const category = await updateCategoryService(
      categoryIdOrSlug,
      servicePayload
    );

    if (thumbnailFilePathTemp) {
      try {
        await fs.unlink(thumbnailFilePathTemp);
      } catch (e) {
        logger.error("Cleanup error:", e);
      }
    }

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    if (thumbnailFilePathTemp) {
      try {
        await fs.unlink(thumbnailFilePathTemp);
      } catch (e) {
        logger.error("Cleanup error:", e);
      }
    }
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }
    const { categoryIdOrSlug } = req.params;
    await deleteCategoryService(categoryIdOrSlug);
    res
      .status(200)
      .json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }
    const { page, limit } = matchedData(req, { locations: ["query"] });
    const result = await getCategoriesService({ page, limit });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getCategoryDetails = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }
    const { categoryIdOrSlug } = req.params;
    const category = await getCategoryDetailsService(categoryIdOrSlug);
    if (!category) {
      throw new AppError("Category not found", 404);
    }
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const searchCategoriesByTag = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }

    const {
      tag,
      page = 1,
      limit = 10,
    } = matchedData(req, { locations: ["query"] });

    const result = await searchCategoriesByTagService({
      tag,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    res.status(200).json({
      success: true,
      message: "Categories fetched successfully by tag",
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      tagSearched: tag,
      categories: result.categories,
    });
  } catch (error) {
    logger.error("Controller: Error searching categories by tag:", error);
    next(error);
  }
};
