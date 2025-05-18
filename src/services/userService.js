import bcrypt from "bcrypt";
import User from "../models/user.js";

export const registerUser = async (username, password) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    return await User.create({
      username,
      password: hashedPassword,
    });
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

    return user;
  } catch (error) {
    throw new Error("Error logging in: " + error.message);
  }
};
