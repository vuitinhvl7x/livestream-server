import { validationResult } from "express-validator";
import { registerUser, loginUser } from "../services/userService.js";

export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    const { user, token } = await registerUser(username, password);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        username: user.username,
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
      },
      token,
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};
