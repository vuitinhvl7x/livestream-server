import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import {
  uploadToB2AndGetPresignedUrl,
  deleteFileFromB2,
} from "../lib/b2.service.js";
import fs from "fs/promises";
import fsSync from "fs";
import { AppError, handleServiceError } from "../utils/errorHandler.js";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username },
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
        "createdAt",
        "updatedAt",
      ],
    });
    if (!user) {
      throw new AppError("User not found", 404);
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
