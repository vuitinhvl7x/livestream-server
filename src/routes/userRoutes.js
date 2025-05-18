import express from "express";
import { body } from "express-validator";
import { register, login } from "../controllers/userController.js";

const router = express.Router();

const validateUser = [
  body("username")
    .isString()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long"),
  body("password")
    .isString()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

router.post("/register", validateUser, register);
router.post("/login", validateUser, login);

export default router;
