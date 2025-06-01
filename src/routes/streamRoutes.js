import express from "express";
import {
  createStream,
  updateStream,
  getStreams,
  getStreamById,
} from "../controllers/streamController.js";
import authenticateToken from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import {
  validateCreateStream,
  validateUpdateStream,
  validateGetStreams,
  validateGetStreamById,
} from "../validators/streamValidators.js";

// Placeholder for JWT Authentication Middleware
// In a real app, this would be imported from an auth middleware file
// const authenticateToken = (req, res, next) => {
//   // Example: Check for a token and verify it
//   // For now, we'll simulate an authenticated user for development
//   // IMPORTANT: Replace this with actual JWT authentication
//   console.log("authenticateToken middleware called (placeholder)");
//   if (
//     req.headers.authorization &&
//     req.headers.authorization.startsWith("Bearer ")
//   ) {
//     const token = req.headers.authorization.split(" ")[1];
//     // In a real app, you would verify the token here
//     // For placeholder: decode a dummy user ID if token is 'testtoken'
//     if (token === "testtoken") {
//       req.user = { id: 1, username: "testuser" }; // Dummy user
//       console.log("Dummy user authenticated:", req.user);
//     } else if (token === "testtoken2") {
//       req.user = { id: 2, username: "anotheruser" }; // Dummy user 2
//       console.log("Dummy user authenticated:", req.user);
//     } else {
//       // No actual validation, just a log for now if a token is present
//       console.log("Token present, but no actual validation in placeholder.");
//       // To simulate unauthenticated for other tokens, you could return 401 here.
//       // For broader testing, let's allow it to pass through if any token is present.
//       // req.user = { id: null }; // Or simply don't set req.user
//     }
//   } else {
//     console.log("No authorization token found.");
//     // To enforce authentication, you would return a 401 error here:
//     // return res.status(401).json({ message: 'Authentication token required' });
//   }
//   next();
// };

const router = express.Router();

// Validation middleware for creating a stream
// const validateCreateStream = [ ... ];

// Validation middleware for updating a stream
// const validateUpdateStream = [ ... ];

// Validation for getting streams (pagination, filtering)
// const validateGetStreams = [ ... ];

// Define routes
// POST /api/streams - Tạo mới stream
// Use upload.single('thumbnailFile') to handle a single file upload for the thumbnail
// The field name in the form-data should be 'thumbnailFile'
router.post(
  "/",
  authenticateToken,
  upload.single("thumbnailFile"), // Handle thumbnail upload first
  validateCreateStream, // Ensure validators can handle req.body with multipart/form-data
  createStream
);

// PUT /api/streams/:streamId - Cập nhật stream
// If you also want to allow thumbnail updates, this route would need similar upload middleware
router.put("/:streamId", authenticateToken, validateUpdateStream, updateStream);

// GET /api/streams - Lấy danh sách stream (không yêu cầu xác thực cho route này)
router.get("/", validateGetStreams, getStreams);

// GET /api/streams/:streamId - Lấy chi tiết một stream (không yêu cầu xác thực cho route này)
router.get("/:streamId", validateGetStreamById, getStreamById);

export default router;
