import B2 from "backblaze-b2";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file

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
    console.log("Successfully authorized with Backblaze B2.");
    return authData.data; // Return the actual data object from the response
  } catch (error) {
    console.error("Error authorizing with Backblaze B2:", error);
    throw error;
  }
}

/**
 * Uploads a file to Backblaze B2 and generates a pre-signed URL for private access.
 * @param {string} localFilePath - The absolute path to the local file.
 * @param {string} originalFileName - The original name of the file (e.g., streamkey.flv).
 * @param {number} [presignedUrlDuration=3600] - Duration in seconds for which the pre-signed URL is valid (default 1 hour).
 * @returns {Promise<object>} - An object containing b2FileId, b2FileName, and a pre-signed viewableUrl.
 */
async function uploadToB2AndGetPresignedUrl(
  localFilePath,
  originalFileName,
  presignedUrlDuration = 3600
) {
  try {
    const authData = await authorizeB2(); // Ensure we are authorized and get auth data
    const accountDownloadUrl = authData.downloadUrl; // Base URL for downloads for this account

    const fileData = await fs.readFile(localFilePath);
    const fileExtension = path.extname(originalFileName) || ".flv";
    const baseFileName = path.basename(originalFileName, fileExtension);
    const fileNameInB2 = `vods/${baseFileName}-${Date.now()}${fileExtension}`;

    console.log(
      `Attempting to upload ${localFilePath} as ${fileNameInB2} to bucket ${BUCKET_ID}`
    );

    const {
      data: { uploadUrl, authorizationToken: uploadAuthToken },
    } = await b2.getUploadUrl({ bucketId: BUCKET_ID });

    const uploadedFileResponse = await b2.uploadFile({
      uploadUrl: uploadUrl,
      uploadAuthToken: uploadAuthToken,
      fileName: fileNameInB2,
      data: fileData,
      onUploadProgress: (event) => {
        if (event.bytesLoaded && event.totalBytes) {
          const percent = Math.round(
            (event.bytesLoaded / event.totalBytes) * 100
          );
          console.log(`Upload progress for ${fileNameInB2}: ${percent}%`);
        }
      },
    });

    const b2FileId = uploadedFileResponse.data.fileId;
    const b2FileName = uploadedFileResponse.data.fileName;

    console.log(
      `File ${b2FileName} (ID: ${b2FileId}) uploaded successfully to B2.`
    );

    // Generate a pre-signed URL for the private file
    const {
      data: { authorizationToken: downloadAuthToken },
    } = await b2.getDownloadAuthorization({
      bucketId: BUCKET_ID,
      fileNamePrefix: b2FileName, // Authorize this specific file
      validDurationInSeconds: presignedUrlDuration, // e.g., 1 hour
    });

    // Construct the pre-signed URL
    // Format: <accountDownloadUrl>/file/<bucketName>/<fileName>?Authorization=<downloadAuthToken>
    const viewableUrl = `${accountDownloadUrl}/file/${BUCKET_NAME}/${b2FileName}?Authorization=${downloadAuthToken}`;

    console.log(
      `Generated pre-signed URL (valid for ${presignedUrlDuration}s): ${viewableUrl}`
    );

    return {
      b2FileId,
      b2FileName,
      viewableUrl, // This is the pre-signed URL
      message: "File uploaded successfully to B2 and pre-signed URL generated.",
    };
  } catch (error) {
    console.error(
      `Error in B2 service for file ${localFilePath}:`,
      error.message
    );
    if (error.isAxiosError && error.response && error.response.data) {
      console.error("B2 API Error Details:", error.response.data);
    }
    throw new Error(`B2 service error: ${error.message}`);
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
