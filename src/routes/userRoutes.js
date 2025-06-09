import express from "express";
import {
  validateUserRegistration,
  validateUserLogin,
  validateUserProfileUpdate,
} from "../validators/userValidators.js";
import {
  register,
  login,
  logout,
  updateProfile,
  getMyProfile,
  getAllUsersController,
  getUserPublicProfile,
} from "../controllers/userController.js";
import authenticateToken from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", validateUserRegistration, register);
router.post("/login", validateUserLogin, login);

// Route to get a user's public profile
router.get("/profile/:username", getUserPublicProfile);

// Protected routes (require authentication)
router.post("/logout", authenticateToken, logout);
router.get("/me", authenticateToken, getMyProfile);
router.get(
  "/all",
  // authenticateToken,
  getAllUsersController
);

router.put(
  "/me/profile",
  authenticateToken,
  upload.single("avatarFile"),
  validateUserProfileUpdate,
  updateProfile
);

export default router;
