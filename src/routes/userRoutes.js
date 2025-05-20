import express from "express";
import { register, login } from "../controllers/userController.js";
import { validateUserPayload } from "../validators/userValidators.js";

const router = express.Router();

router.post("/register", validateUserPayload, register);
router.post("/login", validateUserPayload, login);

export default router;
