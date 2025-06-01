import express from "express";
import {
  validateUserRegistration,
  validateUserLogin,
  validateUserProfileUpdate,
} from "../validators/userValidators.js";
import {
  register,
  login,
  updateProfile,
} from "../controllers/userController.js";
import authenticateToken from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", validateUserRegistration, register);
router.post("/login", validateUserLogin, login);

// Protected routes (require authentication)
router.put(
  "/me/profile",
  authenticateToken,
  upload.single("avatarFile"),
  validateUserProfileUpdate,
  updateProfile
);

export default router;
