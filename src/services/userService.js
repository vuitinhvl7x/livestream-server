import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import {
  uploadToB2AndGetPresignedUrl,
  deleteFileFromB2,
  generatePresignedUrlForExistingFile,
} from "../lib/b2.service.js";
import fs from "fs/promises";
import fsSync from "fs";
import { AppError, handleServiceError } from "../utils/errorHandler.js";
import path from "path";
import dotenv from "dotenv";
import { TokenBlacklist } from "../models/index.js";
import logger from "../utils/logger.js";

dotenv.config();

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );
};

export const registerUser = async (username, password) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      password: hashedPassword,
    });
    const token = generateToken(user);
    return { user, token };
  } catch (error) {
    throw new Error("Error registering user: " + error.message);
  }
};

export const loginUser = async (username, password) => {
  try {
    const user = await User.findOne({ where: { username } });
    if (!user) {
      throw new Error("User not found");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }

    const token = generateToken(user);
    return { user, token };
  } catch (error) {
    throw new Error("Error logging in: " + error.message);
  }
};

export const updateUserProfile = async (
  userId,
  profileData,
  avatarFileData
) => {
  let newB2AvatarFileIdToDeleteOnError = null;
  let newB2AvatarFileNameToDeleteOnError = null;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const { displayName, bio } = profileData;
    const { avatarFilePath, originalAvatarFileName, avatarMimeType } =
      avatarFileData || {};

    const oldB2AvatarFileId = user.b2AvatarFileId;
    const oldB2AvatarFileName = user.b2AvatarFileName;
    let newAvatarB2Response = null;

    if (avatarFilePath && originalAvatarFileName && avatarMimeType) {
      logger.info(
        `Service: New avatar provided for user ${userId}: ${avatarFilePath}`
      );
      const avatarStats = await fs.stat(avatarFilePath);
      const avatarSize = avatarStats.size;

      if (avatarSize > 0) {
        const avatarStream = fsSync.createReadStream(avatarFilePath);
        const safeOriginalAvatarFileName = originalAvatarFileName.replace(
          /[^a-zA-Z0-9.\-_]/g,
          "_"
        );
        const avatarFileNameInB2 = `users/${userId}/avatars/${Date.now()}_${safeOriginalAvatarFileName}`;

        const tempB2Response = await uploadToB2AndGetPresignedUrl(
          null,
          0,
          null,
          null,
          avatarStream,
          avatarSize,
          avatarFileNameInB2,
          avatarMimeType,
          null,
          parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS_IMAGES) ||
            3600 * 24 * 30
        );

        newAvatarB2Response = tempB2Response.thumbnail;

        if (!newAvatarB2Response || !newAvatarB2Response.url) {
          logger.error(
            "Service: Error uploading new avatar to B2, no response or URL."
          );
          throw new AppError("Could not upload new avatar to B2.", 500);
        }

        newB2AvatarFileIdToDeleteOnError = newAvatarB2Response.b2FileId;
        newB2AvatarFileNameToDeleteOnError = newAvatarB2Response.b2FileName;

        user.avatarUrl = newAvatarB2Response.url;
        user.avatarUrlExpiresAt = newAvatarB2Response.urlExpiresAt;
        user.b2AvatarFileId = newAvatarB2Response.b2FileId;
        user.b2AvatarFileName = newAvatarB2Response.b2FileName;

        logger.info(
          `Service: New avatar uploaded to B2 successfully: ${newAvatarB2Response.b2FileName}`
        );
      } else {
        logger.warn("Service: New avatar file provided but size is 0.");
      }
    }

    if (displayName !== undefined) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;

    await user.save();
    logger.info(`Service: User profile ${userId} updated successfully.`);

    if (newAvatarB2Response && oldB2AvatarFileId && oldB2AvatarFileName) {
      try {
        logger.info(
          `Service: Deleting old avatar ${oldB2AvatarFileName} (ID: ${oldB2AvatarFileId}) from B2.`
        );
        await deleteFileFromB2(oldB2AvatarFileName, oldB2AvatarFileId);
        logger.info(
          `Service: Deleted old avatar ${oldB2AvatarFileName} from B2.`
        );
      } catch (deleteError) {
        logger.error(
          `Service: Error deleting old avatar ${oldB2AvatarFileName} from B2: ${deleteError.message}`
        );
      }
    }

    if (avatarFilePath) {
      try {
        await fs.unlink(avatarFilePath);
        logger.info(
          `Service: Temporary avatar file ${avatarFilePath} deleted.`
        );
      } catch (unlinkError) {
        logger.error(
          `Service: Error deleting temporary avatar file ${avatarFilePath}: ${unlinkError.message}`
        );
      }
    }

    return user;
  } catch (error) {
    logger.error(
      `Service: Error in updateUserProfile for user ${userId}:`,
      error
    );

    if (
      newB2AvatarFileIdToDeleteOnError &&
      newB2AvatarFileNameToDeleteOnError
    ) {
      try {
        logger.warn(
          `Service: Cleaning up NEW avatar ${newB2AvatarFileNameToDeleteOnError} from B2 due to error during profile update.`
        );
        await deleteFileFromB2(
          newB2AvatarFileNameToDeleteOnError,
          newB2AvatarFileIdToDeleteOnError
        );
      } catch (deleteB2Error) {
        logger.error(
          `Service: Critical error cleaning up NEW avatar ${newB2AvatarFileNameToDeleteOnError} from B2: ${deleteB2Error}`
        );
      }
    }

    if (avatarFileData && avatarFileData.avatarFilePath) {
      try {
        if (fsSync.existsSync(avatarFileData.avatarFilePath)) {
          await fs.unlink(avatarFileData.avatarFilePath);
          logger.info(
            `Service: Temporary avatar file ${avatarFileData.avatarFilePath} deleted due to error.`
          );
        }
      } catch (unlinkError) {
        logger.error(
          `Service: Error deleting temporary avatar file ${avatarFileData.avatarFilePath} during error handling: ${unlinkError.message}`
        );
      }
    }

    if (error instanceof AppError) throw error;
    throw new AppError(
      `Could not update user profile: ${error.message}`,
      error.statusCode || 500
    );
  }
};

export const getUserProfileById = async (userId) => {
  try {
    const user = await User.findByPk(userId, {
      attributes: [
        "id",
        "username",
        "displayName",
        "avatarUrl",
        "avatarUrlExpiresAt",
        "b2AvatarFileId",
        "b2AvatarFileName",
        "bio",
        "role",
        "createdAt",
        "updatedAt",
      ],
    });
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Logic to refresh avatarUrl if expired or nearing expiry
    const presignedUrlDurationImages =
      parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS_IMAGES) ||
      3600 * 24 * 7; // 7 days default for images
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 3600 * 1000);

    if (
      user.avatarUrl &&
      user.b2AvatarFileName &&
      (!user.avatarUrlExpiresAt ||
        new Date(user.avatarUrlExpiresAt) < oneHourFromNow)
    ) {
      try {
        logger.info(
          `Service: Pre-signed URL for avatar of user ${userId} (file: ${user.b2AvatarFileName}) is expired or expiring soon. Refreshing...`
        );
        const newAvatarUrl = await generatePresignedUrlForExistingFile(
          user.b2AvatarFileName,
          presignedUrlDurationImages
        );
        user.avatarUrl = newAvatarUrl;
        user.avatarUrlExpiresAt = new Date(
          Date.now() + presignedUrlDurationImages * 1000
        );
        await user.save();
        logger.info(
          `Service: Refreshed pre-signed URL for avatar of user ${userId}. New expiry: ${user.avatarUrlExpiresAt}`
        );
      } catch (refreshError) {
        logger.error(
          `Service: Failed to refresh avatar URL for user ${userId} (file: ${user.b2AvatarFileName}): ${refreshError.message}`
        );
        // Continue with potentially stale URL, or handle error differently
      }
    } else if (
      user.avatarUrl &&
      !user.b2AvatarFileName &&
      (!user.avatarUrlExpiresAt ||
        new Date(user.avatarUrlExpiresAt) < oneHourFromNow)
    ) {
      logger.warn(
        `Service: Avatar URL for user ${userId} needs refresh, but b2AvatarFileName is missing.`
      );
    }

    return user;
  } catch (error) {
    logger.error(
      `Service: Error in getUserProfileById for user ${userId}:`,
      error
    );
    if (error instanceof AppError) throw error;
    throw new AppError(
      `Could not retrieve user profile: ${error.message}`,
      error.statusCode || 500
    );
  }
};

export const getAllUsers = async () => {
  try {
    const users = await User.findAll({
      attributes: [
        "id",
        "username",
        "displayName",
        "avatarUrl",
        "avatarUrlExpiresAt",
        "bio",
        "role",
        "createdAt",
        "updatedAt",
      ],
    });
    // Optionally, you can implement logic to refresh avatarUrls here if needed, similar to getUserProfileById
    return users;
  } catch (error) {
    logger.error("Service: Error in getAllUsers:", error);
    throw new AppError(
      `Could not retrieve users: ${error.message}`,
      error.statusCode || 500
    );
  }
};

export const logoutUser = async (token, tokenPayload) => {
  try {
    const expiresAt = new Date(tokenPayload.exp * 1000);
    await TokenBlacklist.create({
      token,
      expiresAt,
    });
    logger.info(
      `Token for user ${tokenPayload.username} has been blacklisted.`
    );
  } catch (error) {
    // Nếu token đã tồn tại trong blacklist, không cần báo lỗi nghiêm trọng
    if (error.name === "SequelizeUniqueConstraintError") {
      logger.warn(`Attempted to blacklist an already blacklisted token.`);
      return;
    }
    logger.error(`Error blacklisting token: ${error.message}`);
    throw new AppError("Could not log out user.", 500);
  }
};
