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
    // console.log("Successfully authorized with Backblaze B2."); // Ghi log ít hơn khi thành công thường xuyên
    return authData.data;
  } catch (error) {
    console.error("Error authorizing with Backblaze B2:", error);
    throw error;
  }
}

/**
 * Uploads a video file (and optionally a thumbnail) buffer to Backblaze B2
 * and generates pre-signed URLs for private access.
 * @param {Buffer} videoBuffer - The buffer of the video file.
 * @param {string} videoFileNameInB2 - The desired file name for the video in B2 (e.g., users/userId/vods/timestamp_originalName.mp4).
 * @param {string} videoMimeType - The MIME type of the video file.
 * @param {Buffer} [thumbnailBuffer] - Optional buffer of the thumbnail file.
 * @param {string} [thumbnailFileNameInB2] - Optional desired file name for the thumbnail in B2 (e.g., users/userId/vods/timestamp_originalName_thumb.png).
 * @param {string} [thumbnailMimeType] - Optional MIME type of the thumbnail file.
 * @param {number} [durationSeconds=0] - Duration of the video in seconds.
 * @param {number} [presignedUrlDurationSecs=parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS) || 25200] - Duration for pre-signed URLs.
 * @returns {Promise<object>} - An object containing B2 file info and pre-signed URLs for video and thumbnail.
 */
async function uploadToB2AndGetPresignedUrl(
  videoBuffer,
  videoFileNameInB2,
  videoMimeType,
  thumbnailBuffer,
  thumbnailFileNameInB2,
  thumbnailMimeType,
  durationSeconds = 0, // Sẽ được trả về, B2 có thể không lưu trực tiếp vào metadata chuẩn
  presignedUrlDurationSecs = parseInt(
    process.env.B2_PRESIGNED_URL_DURATION_SECONDS
  ) || 25200 // 7 giờ
) {
  try {
    const authData = await authorizeB2();
    const accountDownloadUrl = authData.downloadUrl;

    // --- Upload Video ---
    const { data: videoUploadUrlData } = await b2.getUploadUrl({
      bucketId: BUCKET_ID,
    });
    const uploadedVideoResponse = await b2.uploadFile({
      uploadUrl: videoUploadUrlData.uploadUrl,
      uploadAuthToken: videoUploadUrlData.authorizationToken,
      fileName: videoFileNameInB2,
      data: videoBuffer,
      mime: videoMimeType,
      info: {
        // Thông tin tùy chỉnh có thể thêm vào đây nếu cần (B2 hỗ trợ 'b2-content-disposition', 'b2-cache-control', v.v...)
        // 'duration': durationSeconds.toString() // Ví dụ, nếu muốn thử lưu duration
      },
      onUploadProgress: (event) => {
        // Optional: log progress
      },
    });
    const videoB2FileId = uploadedVideoResponse.data.fileId;
    const videoB2FileName = uploadedVideoResponse.data.fileName;
    console.log(
      `Video ${videoB2FileName} (ID: ${videoB2FileId}) uploaded to B2.`
    );

    // --- Generate Pre-signed URL for Video ---
    const { data: videoDownloadAuth } = await b2.getDownloadAuthorization({
      bucketId: BUCKET_ID,
      fileNamePrefix: videoB2FileName,
      validDurationInSeconds: presignedUrlDurationSecs,
    });
    const videoViewableUrl = `${accountDownloadUrl}/file/${BUCKET_NAME}/${videoB2FileName}?Authorization=${videoDownloadAuth.authorizationToken}`;
    const videoUrlExpiresAt = new Date(
      Date.now() + presignedUrlDurationSecs * 1000
    );

    let thumbnailB2FileId = null;
    let thumbnailB2FileName = null;
    let thumbnailViewableUrl = null;
    let thumbnailUrlExpiresAt = null;

    // --- Upload Thumbnail (if provided) ---
    if (thumbnailBuffer && thumbnailFileNameInB2 && thumbnailMimeType) {
      const { data: thumbUploadUrlData } = await b2.getUploadUrl({
        bucketId: BUCKET_ID,
      });
      const uploadedThumbResponse = await b2.uploadFile({
        uploadUrl: thumbUploadUrlData.uploadUrl,
        uploadAuthToken: thumbUploadUrlData.authorizationToken,
        fileName: thumbnailFileNameInB2,
        data: thumbnailBuffer,
        mime: thumbnailMimeType,
      });
      thumbnailB2FileId = uploadedThumbResponse.data.fileId;
      thumbnailB2FileName = uploadedThumbResponse.data.fileName;
      console.log(
        `Thumbnail ${thumbnailB2FileName} (ID: ${thumbnailB2FileId}) uploaded to B2.`
      );

      // --- Generate Pre-signed URL for Thumbnail ---
      const { data: thumbDownloadAuth } = await b2.getDownloadAuthorization({
        bucketId: BUCKET_ID,
        fileNamePrefix: thumbnailB2FileName,
        validDurationInSeconds: presignedUrlDurationSecs,
      });
      thumbnailViewableUrl = `${accountDownloadUrl}/file/${BUCKET_NAME}/${thumbnailB2FileName}?Authorization=${thumbDownloadAuth.authorizationToken}`;
      thumbnailUrlExpiresAt = new Date(
        Date.now() + presignedUrlDurationSecs * 1000
      );
    }

    return {
      video: {
        b2FileId: videoB2FileId,
        b2FileName: videoB2FileName,
        url: videoViewableUrl,
        urlExpiresAt: videoUrlExpiresAt,
        mimeType: videoMimeType,
        durationSeconds: durationSeconds, // Trả về duration đã nhận
      },
      thumbnail: thumbnailB2FileId
        ? {
            b2FileId: thumbnailB2FileId,
            b2FileName: thumbnailB2FileName,
            url: thumbnailViewableUrl,
            urlExpiresAt: thumbnailUrlExpiresAt,
            mimeType: thumbnailMimeType,
          }
        : null,
      message: "Files uploaded successfully and pre-signed URLs generated.",
    };
  } catch (error) {
    console.error(
      `Error in B2 service for video ${videoFileNameInB2}:`,
      error.message
    );
    if (error.isAxiosError && error.response && error.response.data) {
      console.error("B2 API Error Details:", error.response.data);
    }
    // Gắn thêm thông tin để controller có thể cố gắng dọn dẹp
    let errorToThrow = new Error(`B2 service error: ${error.message}`);
    if (error.b2FileIdToDelete)
      errorToThrow.b2FileIdToDelete = error.b2FileIdToDelete;
    if (error.b2FileNameToDelete)
      errorToThrow.b2FileNameToDelete = error.b2FileNameToDelete;
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
