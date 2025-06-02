import { AppError } from "../utils/errorHandler.js"; // Optional: for consistent error handling

/**
 * Middleware to check if the authenticated user has admin privileges.
 * Assumes `req.user` is populated by a preceding authentication middleware (e.g., authMiddleware)
 * and that `req.user` object has a `role` property.
 */
export const adminCheckMiddleware = (req, res, next) => {
  // Check if user object exists and has a role property
  if (req.user && req.user.role) {
    if (req.user.role === "admin") {
      // User is an admin, proceed to the next middleware or route handler
      next();
    } else {
      // User is authenticated but not an admin
      // You can use AppError or send a direct response
      // return next(new AppError("Forbidden: Admin access required.", 403));
      return res
        .status(403)
        .json({ success: false, message: "Forbidden: Admin access required." });
    }
  } else {
    // req.user is not populated or doesn't have a role,
    // which implies an issue with the authMiddleware or JWT payload
    // This case should ideally be caught by authMiddleware, but as a safeguard:
    return res.status(401).json({
      success: false,
      message: "Unauthorized: User role not found or authentication issue.",
    });
  }
};

// If you prefer to export it as default:
// export default adminCheckMiddleware;
