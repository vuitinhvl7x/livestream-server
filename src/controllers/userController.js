import { validationResult } from "express-validator";
import {
  registerUser,
  loginUser,
  updateUserProfile,
  getUserProfileById,
  getAllUsers,
  logoutUser,
  getUserPublicProfileByUsername,
} from "../services/userService.js";

export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, displayName } = req.body;
    const { user, token } = await registerUser(username, password, displayName);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    const { user, token } = await loginUser(username, password);

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    // Token và payload được gắn vào req từ middleware authenticateToken
    const { token, tokenPayload } = req;
    if (!token || !tokenPayload) {
      return res
        .status(400)
        .json({ message: "Authentication context is missing." });
    }

    await logoutUser(token, tokenPayload);

    res.status(200).json({ message: "Logged out successfully." });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { displayName, bio } = req.body;
    let avatarFileData = null;

    if (req.file) {
      avatarFileData = {
        avatarFilePath: req.file.path,
        originalAvatarFileName: req.file.originalname,
        avatarMimeType: req.file.mimetype,
      };
    }

    const updatedUser = await updateUserProfile(
      userId,
      { displayName, bio },
      avatarFileData // Pass avatar file data to service
    );

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        avatarUrl: updatedUser.avatarUrl,
        bio: updatedUser.bio,
        role: updatedUser.role,
        updatedAt: updatedUser.updatedAt,
        // Consider also returning b2 related fields if needed by client,
        // or keep them server-side only.
        b2AvatarFileId: updatedUser.b2AvatarFileId,
        b2AvatarFileName: updatedUser.b2AvatarFileName,
        avatarUrlExpiresAt: updatedUser.avatarUrlExpiresAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Lấy userId từ token đã được xác thực
    const userProfile = await getUserProfileById(userId);

    // userProfile đã được service lọc các trường cần thiết
    res.status(200).json(userProfile);
  } catch (error) {
    // Nếu service ném AppError, nó sẽ có statusCode
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
};

export const getAllUsersController = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const { totalUsers, users } = await getAllUsers(page, limit);

    res.status(200).json({
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
      users,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
};

export const getUserPublicProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const userProfile = await getUserPublicProfileByUsername(username);
    res.status(200).json(userProfile);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
};
