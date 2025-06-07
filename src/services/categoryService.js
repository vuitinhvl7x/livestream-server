import { Category, Stream, VOD } from "../models/index.js";
import { AppError, handleServiceError } from "../utils/errorHandler.js";
import {
  uploadToB2AndGetPresignedUrl,
  deleteFileFromB2,
  generatePresignedUrlForExistingFile,
} from "../lib/b2.service.js";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import slugify from "slugify";
import dotenv from "dotenv";
import { Op } from "sequelize";
import logger from "../utils/logger.js";

dotenv.config();

const B2_PRESIGNED_URL_DURATION_IMAGES =
  parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS_IMAGES) ||
  3600 * 24 * 7; // 7 days default

/**
 * Create a new category with an optional thumbnail.
 * @param {object} data - Category data.
 * @param {string} data.name - Category name.
 * @param {string} [data.description] - Category description.
 * @param {string} [data.slug] - Category slug (if provided, otherwise generated from name).
 * @param {string[]} [data.tags] - Array of tags for the category.
 * @param {string} [data.thumbnailFilePath] - Path to temporary thumbnail file.
 * @param {string} [data.originalThumbnailFileName] - Original name of the thumbnail file.
 * @param {string} [data.thumbnailMimeType] - Mime type of the thumbnail.
 * @param {number} [data.userIdForPath] - User ID for B2 path, if applicable (e.g. "global_categories" or specific user).
 * @returns {Promise<Category>} The created category object.
 */
export const createCategoryService = async ({
  name,
  description,
  slug,
  tags,
  thumbnailFilePath,
  originalThumbnailFileName,
  thumbnailMimeType,
  userIdForPath = "_global", // Default path for general categories
}) => {
  let b2ThumbFileIdToDeleteOnError = null;
  let b2ThumbFileNameToDeleteOnError = null;

  try {
    logger.info(`Service: Attempting to create category: ${name}`);

    let thumbnailB2Response = null;

    if (thumbnailFilePath && originalThumbnailFileName && thumbnailMimeType) {
      logger.info(`Service: Thumbnail provided: ${thumbnailFilePath}`);
      const thumbStats = await fs.stat(thumbnailFilePath);
      const thumbnailSize = thumbStats.size;

      if (thumbnailSize > 0) {
        const thumbnailStream = fsSync.createReadStream(thumbnailFilePath);
        const safeOriginalThumbName = originalThumbnailFileName.replace(
          /[^a-zA-Z0-9.\-_]/g,
          "_"
        );
        const thumbnailFileNameInB2 = `categories/${userIdForPath}/thumbnails/${Date.now()}_${safeOriginalThumbName}`;

        const b2Response = await uploadToB2AndGetPresignedUrl(
          null, // videoStream
          0, // videoSize
          null, // videoFileNameInB2
          null, // videoMimeType
          thumbnailStream,
          thumbnailSize,
          thumbnailFileNameInB2,
          thumbnailMimeType,
          null, // durationSeconds (N/A for category thumbnail)
          B2_PRESIGNED_URL_DURATION_IMAGES
        );
        thumbnailB2Response = b2Response.thumbnail;

        if (!thumbnailB2Response || !thumbnailB2Response.url) {
          throw new AppError("Failed to upload category thumbnail to B2.", 500);
        }
        b2ThumbFileIdToDeleteOnError = thumbnailB2Response.b2FileId;
        b2ThumbFileNameToDeleteOnError = thumbnailB2Response.b2FileName;
        logger.info(
          `Service: Category thumbnail uploaded to B2: ${thumbnailB2Response.b2FileName}`
        );
      } else {
        logger.warn("Service: Provided category thumbnail file is empty.");
      }
    }

    const categoryData = {
      name,
      description: description || null,
      slug:
        slug ||
        slugify(name, {
          lower: true,
          strict: true,
          remove: /[*+~.()\'\"!:@]/g,
        }),
      tags: tags || [],
      thumbnailUrl: thumbnailB2Response?.url || null,
      thumbnailUrlExpiresAt: thumbnailB2Response?.urlExpiresAt || null,
      b2ThumbnailFileId: thumbnailB2Response?.b2FileId || null,
      b2ThumbnailFileName: thumbnailB2Response?.b2FileName || null,
    };

    const newCategory = await Category.create(categoryData);
    logger.info(`Service: Category created in DB with ID: ${newCategory.id}`);
    return newCategory;
  } catch (error) {
    logger.error("Service: Error in createCategoryService:", error);
    if (b2ThumbFileIdToDeleteOnError && b2ThumbFileNameToDeleteOnError) {
      try {
        logger.warn(
          `Service: Cleaning up B2 thumbnail ${b2ThumbFileNameToDeleteOnError} due to error.`
        );
        await deleteFileFromB2(
          b2ThumbFileNameToDeleteOnError,
          b2ThumbFileIdToDeleteOnError
        );
      } catch (deleteError) {
        logger.error(
          "Service: Critical error during B2 thumbnail cleanup:",
          deleteError
        );
      }
    }
    if (error.name === "SequelizeUniqueConstraintError") {
      throw new AppError(
        `Category with this name or slug already exists.`,
        409
      );
    }
    handleServiceError(error, "create category");
  }
};

/**
 * Update an existing category.
 * @param {string | number} categoryIdOrSlug - ID or slug of the category to update.
 * @param {object} updateData - Data to update.
 * @returns {Promise<Category>} The updated category object.
 */
export const updateCategoryService = async (categoryIdOrSlug, updateData) => {
  let newB2ThumbFileIdToDeleteOnError = null;
  let newB2ThumbFileNameToDeleteOnError = null;
  const {
    name,
    description,
    slug,
    tags,
    thumbnailFilePath,
    originalThumbnailFileName,
    thumbnailMimeType,
    userIdForPath = "_global",
  } = updateData;

  try {
    const category = await findCategoryByIdOrSlug(categoryIdOrSlug);
    if (!category) {
      throw new AppError("Category not found.", 404);
    }

    const oldB2ThumbnailFileId = category.b2ThumbnailFileId;
    const oldB2ThumbnailFileName = category.b2ThumbnailFileName;
    let newThumbnailB2Response = null;

    if (thumbnailFilePath && originalThumbnailFileName && thumbnailMimeType) {
      logger.info(
        `Service: New thumbnail provided for category ${category.id}: ${thumbnailFilePath}`
      );
      const thumbStats = await fs.stat(thumbnailFilePath);
      const thumbnailSize = thumbStats.size;

      if (thumbnailSize > 0) {
        const thumbnailStream = fsSync.createReadStream(thumbnailFilePath);
        const safeOriginalThumbName = originalThumbnailFileName.replace(
          /[^a-zA-Z0-9.\-_]/g,
          "_"
        );
        const thumbnailFileNameInB2 = `categories/${userIdForPath}/thumbnails/${Date.now()}_${safeOriginalThumbName}`;

        const b2Response = await uploadToB2AndGetPresignedUrl(
          null,
          null,
          null,
          null, // Video params not needed
          thumbnailStream,
          thumbnailSize,
          thumbnailFileNameInB2,
          thumbnailMimeType,
          null,
          B2_PRESIGNED_URL_DURATION_IMAGES
        );
        newThumbnailB2Response = b2Response.thumbnail;

        if (!newThumbnailB2Response || !newThumbnailB2Response.url) {
          throw new AppError(
            "Failed to upload new category thumbnail to B2.",
            500
          );
        }
        newB2ThumbFileIdToDeleteOnError = newThumbnailB2Response.b2FileId;
        newB2ThumbFileNameToDeleteOnError = newThumbnailB2Response.b2FileName;

        category.thumbnailUrl = newThumbnailB2Response.url;
        category.thumbnailUrlExpiresAt = newThumbnailB2Response.urlExpiresAt;
        category.b2ThumbnailFileId = newThumbnailB2Response.b2FileId;
        category.b2ThumbnailFileName = newThumbnailB2Response.b2FileName;
        logger.info(
          `Service: New category thumbnail uploaded to B2: ${newThumbnailB2Response.b2FileName}`
        );
      } else {
        logger.warn("Service: Provided new category thumbnail file is empty.");
      }
    }

    if (name !== undefined) category.name = name;
    if (description !== undefined)
      category.description = description === "" ? null : description; // Allow clearing description
    if (slug !== undefined)
      category.slug = slugify(slug, {
        lower: true,
        strict: true,
        remove: /[*+~.()\'\"!:@]/g,
      });
    if (tags !== undefined) category.tags = tags;
    // Slug will also be updated by hook if name changes

    await category.save();
    logger.info(`Service: Category ${category.id} updated successfully.`);

    if (
      newThumbnailB2Response &&
      oldB2ThumbnailFileId &&
      oldB2ThumbnailFileName
    ) {
      try {
        logger.info(
          `Service: Deleting old category thumbnail ${oldB2ThumbnailFileName} from B2.`
        );
        await deleteFileFromB2(oldB2ThumbnailFileName, oldB2ThumbnailFileId);
      } catch (deleteError) {
        logger.error(
          "Service: Error deleting old category thumbnail from B2:",
          deleteError
        );
      }
    }
    return category;
  } catch (error) {
    logger.error(
      `Service: Error in updateCategoryService for ${categoryIdOrSlug}:`,
      error
    );
    if (newB2ThumbFileIdToDeleteOnError && newB2ThumbFileNameToDeleteOnError) {
      try {
        logger.warn(
          `Service: Cleaning up new B2 thumbnail ${newB2ThumbFileNameToDeleteOnError} due to error.`
        );
        await deleteFileFromB2(
          newB2ThumbFileNameToDeleteOnError,
          newB2ThumbFileIdToDeleteOnError
        );
      } catch (deleteError) {
        logger.error(
          "Service: Critical error during new B2 thumbnail cleanup:",
          deleteError
        );
      }
    }
    if (error.name === "SequelizeUniqueConstraintError") {
      throw new AppError(
        `Category with this name or slug already exists.`,
        409
      );
    }
    handleServiceError(error, "update category");
  }
};

/**
 * Delete a category.
 * @param {string | number} categoryIdOrSlug - ID or slug of the category to delete.
 * @returns {Promise<void>}
 */
export const deleteCategoryService = async (categoryIdOrSlug) => {
  try {
    const category = await findCategoryByIdOrSlug(categoryIdOrSlug);
    if (!category) {
      throw new AppError("Category not found for deletion.", 404);
    }

    // Check if category is in use by Streams or VODs
    const streamCount = await Stream.count({
      where: { categoryId: category.id },
    });
    const vodCount = await VOD.count({ where: { categoryId: category.id } });

    if (streamCount > 0 || vodCount > 0) {
      // Option 1: Prevent deletion
      // throw new AppError(`Category is in use by ${streamCount} streams and ${vodCount} VODs. Cannot delete.`, 409);

      // Option 2: Set categoryId to null in Streams/VODs (if onDelete: SET NULL is configured in associations)
      // This is handled by DB constraints if associations are set up with onDelete: SET NULL
      logger.warn(
        `Category ${category.id} is in use. Associated streams/VODs will have their categoryId set to null if DB constraints allow.`
      );
    }

    const b2ThumbnailFileId = category.b2ThumbnailFileId;
    const b2ThumbnailFileName = category.b2ThumbnailFileName;

    await category.destroy();
    logger.info(
      `Service: Category ${categoryIdOrSlug} (ID: ${category.id}) deleted from DB.`
    );

    if (b2ThumbnailFileId && b2ThumbnailFileName) {
      try {
        logger.info(
          `Service: Deleting category thumbnail ${b2ThumbnailFileName} from B2.`
        );
        await deleteFileFromB2(b2ThumbnailFileName, b2ThumbnailFileId);
      } catch (deleteError) {
        logger.error(
          "Service: Error deleting category thumbnail from B2:",
          deleteError
        );
        // Log error but don't let it fail the whole deletion if DB record is gone.
      }
    }
  } catch (error) {
    logger.error(
      `Service: Error in deleteCategoryService for ${categoryIdOrSlug}:`,
      error
    );
    handleServiceError(error, "delete category");
  }
};

/**
 * Get a list of categories with pagination.
 * @param {object} queryParams - Query parameters (page, limit).
 * @returns {Promise<object>} List of categories and pagination info.
 */
export const getCategoriesService = async ({ page = 1, limit = 10 }) => {
  try {
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { count, rows } = await Category.findAndCountAll({
      order: [["name", "ASC"]],
      limit: parseInt(limit, 10),
      offset: offset,
      attributes: {
        exclude: [
          "b2ThumbnailFileId",
          "b2ThumbnailFileName",
          "thumbnailUrlExpiresAt",
        ],
      },
    });
    return {
      totalCategories: count,
      totalPages: Math.ceil(count / parseInt(limit, 10)),
      currentPage: parseInt(page, 10),
      categories: rows,
    };
  } catch (error) {
    logger.error("Service: Error in getCategoriesService:", error);
    handleServiceError(error, "get categories list");
  }
};

/**
 * Get category details by ID or slug, refreshing presigned URL if needed.
 * @param {string | number} categoryIdOrSlug - Category ID or slug.
 * @returns {Promise<Category|null>} Category object or null if not found.
 */
export const getCategoryDetailsService = async (categoryIdOrSlug) => {
  try {
    const category = await findCategoryByIdOrSlug(categoryIdOrSlug, true); // true to include b2 details for refresh
    if (!category) {
      return null;
    }

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 3600 * 1000);

    if (
      category.thumbnailUrl &&
      category.b2ThumbnailFileName &&
      (!category.thumbnailUrlExpiresAt ||
        new Date(category.thumbnailUrlExpiresAt) < oneHourFromNow)
    ) {
      try {
        logger.info(
          `Service: Refreshing presigned URL for category thumbnail ${category.id}`
        );
        const newThumbnailUrl = await generatePresignedUrlForExistingFile(
          category.b2ThumbnailFileName,
          B2_PRESIGNED_URL_DURATION_IMAGES
        );
        category.thumbnailUrl = newThumbnailUrl;
        category.thumbnailUrlExpiresAt = new Date(
          Date.now() + B2_PRESIGNED_URL_DURATION_IMAGES * 1000
        );
        await category.save({
          fields: ["thumbnailUrl", "thumbnailUrlExpiresAt"],
        });
      } catch (refreshError) {
        logger.error(
          `Service: Failed to refresh category thumbnail URL for ${category.id}:`,
          refreshError
        );
      }
    }
    // Exclude B2 details from final response if not needed by client
    const categoryResponse = category.toJSON();
    delete categoryResponse.b2ThumbnailFileId;
    delete categoryResponse.b2ThumbnailFileName;
    delete categoryResponse.thumbnailUrlExpiresAt;
    // Ensure 'tags' is part of categoryResponse if needed, it should be by default
    // For public facing, only send name, slug, description, thumbnailUrl, tags

    return categoryResponse;
  } catch (error) {
    logger.error(
      `Service: Error in getCategoryDetailsService for ${categoryIdOrSlug}:`,
      error
    );
    handleServiceError(error, "get category details");
  }
};

/**
 * Search for Categories by a specific tag.
 * @param {object} options
 * @param {string} options.tag - The tag to search for.
 * @param {number} [options.page=1] - Current page for pagination.
 * @param {number} [options.limit=10] - Number of items per page.
 * @returns {Promise<{categories: Category[], totalItems: number, totalPages: number, currentPage: number}>}
 */
export const searchCategoriesByTagService = async ({
  tag,
  page = 1,
  limit = 10,
}) => {
  try {
    logger.info(
      `Service: Searching Categories with tag: "${tag}", page: ${page}, limit: ${limit}`
    );
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const { count, rows } = await Category.findAndCountAll({
      where: {
        tags: {
          [Op.contains]: [tag], // PostgreSQL specific: checks if array contains the element
        },
      },
      limit: parseInt(limit, 10),
      offset: offset,
      order: [["name", "ASC"]], // Order by name, for example
      attributes: {
        // Exclude B2 details if not needed for this search result
        exclude: [
          "b2ThumbnailFileId",
          "b2ThumbnailFileName",
          "thumbnailUrlExpiresAt",
        ],
      },
    });

    logger.info(`Service: Found ${count} Categories for tag "${tag}"`);

    return {
      categories: rows,
      totalItems: count,
      totalPages: Math.ceil(count / parseInt(limit, 10)),
      currentPage: parseInt(page, 10),
    };
  } catch (error) {
    logger.error(`Service: Error searching Categories by tag "${tag}":`, error);
    handleServiceError(error, "search Categories by tag");
  }
};

// Helper to find category by ID or Slug
const findCategoryByIdOrSlug = async (identifier, includeB2Details = false) => {
  const attributes = includeB2Details
    ? undefined
    : {
        exclude: [
          "b2ThumbnailFileId",
          "b2ThumbnailFileName",
          "thumbnailUrlExpiresAt",
        ],
      };
  let category;
  // Use a stricter check to ensure the entire string is a number.
  if (/^\d+$/.test(identifier)) {
    category = await Category.findByPk(parseInt(identifier, 10), {
      attributes,
    });
  } else {
    category = await Category.findOne({
      where: { slug: identifier },
      attributes,
    });
  }
  return category;
};
