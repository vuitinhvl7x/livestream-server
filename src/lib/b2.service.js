import B2 from "backblaze-b2";
import uploadAnyExtension from "@gideo-llc/backblaze-b2-upload-any"; // Import extension
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file

// Install the uploadAny extension (Intrusive way)
uploadAnyExtension.install(B2);

// Load configuration from environment variables
const APPLICATION_KEY_ID = process.env.B2_APPLICATION_KEY_ID;
const APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
const BUCKET_ID = process.env.B2_BUCKET_ID;
const BUCKET_NAME = process.env.B2_BUCKET_NAME;
// B2_DOWNLOAD_HOST is used if constructing URLs manually,
// but b2.authorize() provides the most accurate downloadUrl (account's base download URL)

if (!APPLICATION_KEY_ID || !APPLICATION_KEY || !BUCKET_ID || !BUCKET_NAME) {
  console.error(
    "Missing Backblaze B2 environment variables. Please check your .env file."
  );
  // Optionally, throw an error or exit if configuration is critical
  // process.exit(1);
}

const b2 = new B2({
  applicationKeyId: APPLICATION_KEY_ID,
  applicationKey: APPLICATION_KEY,
});

/**
 * Authorizes with B2. This should be called before any B2 operations.
 * Returns the authorization data including the downloadUrl.
 * @returns {Promise<object>} Authorization data from B2, including downloadUrl.
 */
async function authorizeB2() {
  try {
    const authData = await b2.authorize();
    return authData.data;
  } catch (error) {
    console.error("Error authorizing with Backblaze B2:", error);
    throw error;
  }
}

/**
 * Uploads a video file stream and/or a thumbnail file stream to Backblaze B2
 * using @gideo-llc/backblaze-b2-upload-any extension
 * and generates pre-signed URLs for private access.
 *
 * @param {import('stream').Readable} [videoStream] - Optional readable stream of the video file.
 * @param {number} [videoSize] - Optional size of the video file in bytes.
 * @param {string} [videoFileNameInB2] - Optional desired file name for the video in B2.
 * @param {string} [videoMimeType] - Optional MIME type of the video file.
 * @param {import('stream').Readable} [thumbnailStream] - Optional readable stream of the thumbnail file.
 * @param {number} [thumbnailSize] - Optional size of the thumbnail file in bytes.
 * @param {string} [thumbnailFileNameInB2] - Optional desired file name for the thumbnail in B2.
 * @param {string} [thumbnailMimeType] - Optional MIME type of the thumbnail file.
 * @param {number} [durationSeconds=0] - Duration of the video in seconds (if video is uploaded).
 * @param {number} [presignedUrlDurationSecs=parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS) || 25200] - Duration for pre-signed URLs.
 * @returns {Promise<object>} - An object containing B2 file info and pre-signed URLs.
 *                             Format: { video: videoUploadResult|null, thumbnail: thumbnailUploadResult|null, message: string }
 */
async function uploadToB2AndGetPresignedUrl(
  videoStream,
  videoSize,
  videoFileNameInB2,
  videoMimeType,
  thumbnailStream,
  thumbnailSize,
  thumbnailFileNameInB2,
  thumbnailMimeType,
  durationSeconds = 0,
  presignedUrlDurationSecs = parseInt(
    process.env.B2_PRESIGNED_URL_DURATION_SECONDS
  ) || 25200 // Default to 7 hours for general files
) {
  try {
    const authData = await authorizeB2();
    const accountDownloadUrl = authData.downloadUrl;

    let videoUploadResult = null;
    let thumbnailUploadResult = null;

    // Check if at least one file type is provided for upload
    const hasVideoToUpload = videoStream && videoFileNameInB2 && videoMimeType;
    const hasThumbnailToUpload =
      thumbnailStream &&
      thumbnailFileNameInB2 &&
      thumbnailMimeType &&
      thumbnailSize > 0;

    if (!hasVideoToUpload && !hasThumbnailToUpload) {
      throw new Error("No video or thumbnail data provided for upload.");
    }

    // --- Upload Video (if provided) ---
    if (hasVideoToUpload) {
      console.log(
        `Uploading video stream ${videoFileNameInB2} using uploadAny...`
      );
      const uploadedVideoResponse = await b2.uploadAny({
        bucketId: BUCKET_ID,
        fileName: videoFileNameInB2,
        data: videoStream,
        contentType: videoMimeType,
      });
      const videoB2FileId =
        uploadedVideoResponse.fileId || uploadedVideoResponse.data?.fileId;
      const videoB2FileName =
        uploadedVideoResponse.fileName || uploadedVideoResponse.data?.fileName;

      if (!videoB2FileId || !videoB2FileName) {
        console.error(
          "uploadAny video response missing fileId or fileName:",
          uploadedVideoResponse
        );
        throw new Error(
          "Failed to get fileId or fileName from B2 uploadAny video response."
        );
      }
      console.log(
        `Video ${videoB2FileName} (ID: ${videoB2FileId}) uploaded to B2 via uploadAny.`
      );

      const { data: videoDownloadAuth } = await b2.getDownloadAuthorization({
        bucketId: BUCKET_ID,
        fileNamePrefix: videoB2FileName,
        validDurationInSeconds: presignedUrlDurationSecs,
      });
      const videoViewableUrl = `${accountDownloadUrl}/file/${BUCKET_NAME}/${videoB2FileName}?Authorization=${videoDownloadAuth.authorizationToken}`;
      const videoUrlExpiresAt = new Date(
        Date.now() + presignedUrlDurationSecs * 1000
      );
      videoUploadResult = {
        b2FileId: videoB2FileId,
        b2FileName: videoB2FileName,
        url: videoViewableUrl,
        urlExpiresAt: videoUrlExpiresAt,
        mimeType: videoMimeType,
        durationSeconds: durationSeconds,
      };
    }

    // --- Upload Thumbnail (if provided) ---
    if (hasThumbnailToUpload) {
      // Use a different presigned URL duration for images if specified, otherwise fallback to general duration
      const imagePresignedUrlDurationSecs =
        parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS_IMAGES) ||
        presignedUrlDurationSecs;
      console.log(
        `Uploading thumbnail stream ${thumbnailFileNameInB2} using uploadAny...`
      );
      const uploadedThumbResponse = await b2.uploadAny({
        bucketId: BUCKET_ID,
        fileName: thumbnailFileNameInB2,
        data: thumbnailStream,
        contentType: thumbnailMimeType,
      });
      const thumbnailB2FileId =
        uploadedThumbResponse.fileId || uploadedThumbResponse.data?.fileId;
      const thumbnailB2FileName =
        uploadedThumbResponse.fileName || uploadedThumbResponse.data?.fileName;

      if (!thumbnailB2FileId || !thumbnailB2FileName) {
        console.error(
          "uploadAny thumbnail response missing fileId or fileName:",
          uploadedThumbResponse
        );
        throw new Error(
          "Failed to get fileId or fileName from B2 uploadAny thumbnail response."
        );
      }
      console.log(
        `Thumbnail ${thumbnailB2FileName} (ID: ${thumbnailB2FileId}) uploaded to B2 via uploadAny.`
      );

      const { data: thumbDownloadAuth } = await b2.getDownloadAuthorization({
        bucketId: BUCKET_ID,
        fileNamePrefix: thumbnailB2FileName,
        validDurationInSeconds: imagePresignedUrlDurationSecs, // Use image specific duration
      });
      const thumbnailViewableUrl = `${accountDownloadUrl}/file/${BUCKET_NAME}/${thumbnailB2FileName}?Authorization=${thumbDownloadAuth.authorizationToken}`;
      const thumbnailUrlExpiresAt = new Date(
        Date.now() + imagePresignedUrlDurationSecs * 1000
      );
      thumbnailUploadResult = {
        b2FileId: thumbnailB2FileId,
        b2FileName: thumbnailB2FileName,
        url: thumbnailViewableUrl,
        urlExpiresAt: thumbnailUrlExpiresAt,
        mimeType: thumbnailMimeType,
      };
    }

    let message = "Upload process completed.";
    if (videoUploadResult && thumbnailUploadResult) {
      message =
        "Video and thumbnail uploaded successfully and pre-signed URLs generated.";
    } else if (videoUploadResult) {
      message = "Video uploaded successfully and pre-signed URL generated.";
    } else if (thumbnailUploadResult) {
      message = "Thumbnail uploaded successfully and pre-signed URL generated.";
    }

    return {
      video: videoUploadResult,
      thumbnail: thumbnailUploadResult,
      message: message,
    };
  } catch (error) {
    console.error(
      `Error in B2 service (video: ${videoFileNameInB2 || "N/A"}, thumb: ${
        thumbnailFileNameInB2 || "N/A"
      }):`,
      error.message
    );
    if (error.isAxiosError && error.response && error.response.data) {
      console.error("B2 API Error Details:", error.response.data);
    }
    let errorToThrow = new Error(`B2 service error: ${error.message}`);
    // Preserve any file IDs that might have been uploaded before an error occurred for potential cleanup
    // This part might need more sophisticated handling if one upload succeeds and the other fails.
    // For now, this error throwing is generic.
    throw errorToThrow;
  }
}

/**
 * Generates a new pre-signed URL for an existing private file in B2.
 * @param {string} b2FileName - The name of the file in B2 (e.g., vods/streamkey-timestamp.flv).
 * @param {number} [presignedUrlDuration=3600] - Duration in seconds for which the new URL is valid.
 * @returns {Promise<string>} - The new pre-signed URL.
 */
async function generatePresignedUrlForExistingFile(
  b2FileName,
  presignedUrlDuration = 3600
) {
  try {
    const authData = await authorizeB2();
    const accountDownloadUrl = authData.downloadUrl;

    const {
      data: { authorizationToken: newDownloadAuthToken },
    } = await b2.getDownloadAuthorization({
      bucketId: BUCKET_ID,
      fileNamePrefix: b2FileName,
      validDurationInSeconds: presignedUrlDuration,
    });

    const newViewableUrl = `${accountDownloadUrl}/file/${BUCKET_NAME}/${b2FileName}?Authorization=${newDownloadAuthToken}`;

    console.log(
      `Generated new pre-signed URL for ${b2FileName} (valid for ${presignedUrlDuration}s): ${newViewableUrl}`
    );
    return newViewableUrl;
  } catch (error) {
    console.error(
      `Error generating new pre-signed URL for ${b2FileName}:`,
      error.message
    );
    if (error.isAxiosError && error.response && error.response.data) {
      console.error("B2 API Error Details:", error.response.data);
    }
    throw new Error(
      `Failed to generate new pre-signed URL for ${b2FileName}: ${error.message}`
    );
  }
}

/**
 * Deletes a file from Backblaze B2.
 * @param {string} fileName - The name of the file in B2.
 * @param {string} fileId - The ID of the file in B2.
 * @returns {Promise<object>} - Confirmation from B2.
 */
async function deleteFileFromB2(fileName, fileId) {
  try {
    await authorizeB2(); // Ensure we are authorized

    console.log(
      `Attempting to delete file ${fileName} (ID: ${fileId}) from B2.`
    );

    const response = await b2.deleteFileVersion({
      fileName: fileName,
      fileId: fileId,
    });

    console.log(
      `File ${fileName} (ID: ${fileId}) deleted successfully from B2.`
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error deleting file ${fileName} (ID: ${fileId}) from B2:`,
      error.message
    );
    if (error.isAxiosError && error.response && error.response.data) {
      console.error("B2 API Error Details for delete:", error.response.data);
    }
    // Decide if you want to throw an error that stops the VOD deletion process
    // or just log it and proceed with DB deletion.
    // For now, let's throw to indicate B2 deletion failure.
    throw new Error(
      `Failed to delete file ${fileName} from B2: ${error.message}`
    );
  }
}

// Export the main function to be used by other services
export {
  uploadToB2AndGetPresignedUrl,
  authorizeB2,
  generatePresignedUrlForExistingFile,
  deleteFileFromB2,
};
