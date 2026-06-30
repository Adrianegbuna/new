import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || "eu-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "renewablezmart";
const PRESIGNED_URL_EXPIRATION = 15 * 60; // 15 minutes (in seconds)

let credentialsValidated = false;

/**
 * Validate AWS credentials are configured
 * Lazy validation — only runs when S3 is actually needed
 */
function validateAWSCredentials(): void {
  if (credentialsValidated) return;

  const hasAccessKey =
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_ACCESS_KEY_ID.trim().length > 0;
  const hasSecretKey =
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_SECRET_ACCESS_KEY.trim().length > 0;

  if (!hasAccessKey || !hasSecretKey) {
    console.error("[S3 PRESIGNED] ⚠️ AWS credentials missing!", {
      AWS_ACCESS_KEY_ID: hasAccessKey ? "✓ set" : "✗ MISSING",
      AWS_SECRET_ACCESS_KEY: hasSecretKey ? "✓ set" : "✗ MISSING",
      NODE_ENV: process.env.NODE_ENV,
    });
    throw new Error(
      "AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in environment variables.",
    );
  }

  console.log("[S3 PRESIGNED] ✓ AWS credentials validated");
  credentialsValidated = true;
}

// ❌ REMOVED: validateAWSCredentials() — no longer called at module load

/**
 * Generate a pre-signed URL for S3 upload
 * Client will use this URL to upload directly to S3 with PUT request
 *
 * @param fileName - Original filename
 * @param fileType - MIME type (e.g., 'image/jpeg')
 * @param folder - S3 folder path (e.g., 'products', 'installers', 'store-logos')
 * @param fileSizeBytes - Expected file size for validation
 * @returns Pre-signed URL valid for 15 minutes + S3 key + public S3 URL
 */
export async function generatePresignedUploadUrl(
  fileName: string,
  fileType: string,
  folder: string = "uploads",
  fileSizeBytes?: number,
): Promise<{ presignedUrl: string; s3Key: string; s3Url: string }> {
  try {
    // ✅ Lazy credential validation — only runs when upload is requested
    validateAWSCredentials();

    // Validate file type (only allow images and videos for marketplace)
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "video/quicktime", // MOV files
    ];

    if (!allowedTypes.includes(fileType)) {
      throw new Error(
        `Invalid file type: ${fileType}. Allowed: ${allowedTypes.join(", ")}`,
      );
    }

    // Validate file size (max 50MB per file)
    if (fileSizeBytes && fileSizeBytes > 50 * 1024 * 1024) {
      throw new Error("File size exceeds 50MB limit");
    }

    // Generate unique S3 key to prevent collisions
    // Format: folder/date/userId-timestamp-uuid-originalname.ext
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const baseName = fileName.replace(/\.[^/.]+$/, ""); // Remove extension
    const timestamp = Date.now();
    const uniqueId = uuidv4().substring(0, 8);
    const dateFolder = new Date().toISOString().split("T")[0];
    const cleanBaseName = baseName
      .replace(/[^a-z0-9-]/gi, "_")
      .substring(0, 50);

    const s3Key = `${folder}/${dateFolder}/${uniqueId}-${timestamp}-${cleanBaseName}.${ext}`;

    console.log("[S3 PRESIGNED] Generating URL for:", {
      fileName,
      fileType,
      s3Key,
      expirationSeconds: PRESIGNED_URL_EXPIRATION,
    });

    // Create the PutObjectCommand with metadata for security
    // ⚠️ CRITICAL: ContentType MUST match exactly what browser sends in PUT request
    // If ContentType in pre-signed URL ≠ PUT header Content-Type, S3 returns 400 SignatureDoesNotMatch
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: fileType, // Must be passed to getSignedUrl() - browser will send this exact header
      // ACL and tagging omitted - would break signature if browser doesn't also send them
      // Only include fields that browser will also send during PUT request
      Metadata: {
        uploadedAt: new Date().toISOString(),
        source: "presigned-url-direct-upload",
      },
      ServerSideEncryption: "AES256",
    });

    // Generate pre-signed URL valid for 15 minutes
    let presignedUrl: string;
    try {
      console.log("[S3 PRESIGNED] Generating signed URL for:", {
        key: s3Key.substring(0, 80),
        fileType: fileType,
        expiresInSeconds: PRESIGNED_URL_EXPIRATION,
      });

      presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: PRESIGNED_URL_EXPIRATION,
      });

      console.log("[S3 PRESIGNED] ✓ Signed URL generated successfully");

      // Validate URL format (should contain query params with X-Amz-Signature)
      if (!presignedUrl.includes("X-Amz-Signature")) {
        console.error(
          "[S3 PRESIGNED] ⚠️ WARNING: Generated URL missing X-Amz-Signature!",
          {
            urlPrefix: presignedUrl.substring(0, 150),
          },
        );
      }
    } catch (urlGenError: any) {
      console.error("[S3 PRESIGNED] ❌ FAILED to generate signed URL:", {
        message: urlGenError?.message,
        code: urlGenError?.code,
        name: urlGenError?.name,
        commandInput: {
          bucket: BUCKET_NAME,
          key: s3Key.substring(0, 50),
          contentType: fileType,
        },
        awsConfig: {
          region: process.env.AWS_S3_REGION || "eu-west-2",
          credentialsPresent: {
            accessKeyId: !!process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: !!process.env.AWS_SECRET_ACCESS_KEY,
          },
        },
        stack: urlGenError?.stack?.split("\n").slice(0, 2).join(" | "),
      });
      throw urlGenError;
    }

    // Construct the public S3 URL (this is what you'll store in PostgreSQL)
    const s3Region = process.env.AWS_S3_REGION || "eu-west-2";
    const s3PublicUrl = `https://${BUCKET_NAME}.s3.${s3Region}.amazonaws.com/${s3Key}`;

    console.log("[S3 PRESIGNED] ✓ URL generated successfully", {
      s3Key: s3Key.substring(0, 60) + "...",
      expiresInSeconds: PRESIGNED_URL_EXPIRATION,
      region: s3Region,
    });

    return {
      presignedUrl, // Use this for PUT upload
      s3Key, // Store this in DB if you need to delete later
      s3Url: s3PublicUrl, // Store this in PostgreSQL (the actual image URL)
    };
  } catch (error: any) {
    console.error("[S3 PRESIGNED] Error generating URL:", {
      message: error.message,
      code: error.Code || error.code,
      statusCode: error.$metadata?.httpStatusCode,
      region: process.env.AWS_S3_REGION,
      bucket: BUCKET_NAME,
    });
    throw error;
  }
}

/**
 * Generate pre-signed URLs for multiple files (batch)
 * Useful for multi-file uploads (products with multiple images)
 */
export async function generateBatchPresignedUrls(
  files: Array<{ fileName: string; fileType: string; sizeBytes?: number }>,
  folder: string = "uploads",
): Promise<
  Array<{
    presignedUrl: string;
    s3Key: string;
    s3Url: string;
    fileName: string;
  }>
> {
  try {
    // ✅ Also validate here since this calls generatePresignedUploadUrl
    // (which already validates, but this is a safety net)
    validateAWSCredentials();

    const results = await Promise.all(
      files.map(async (file) => {
        const result = await generatePresignedUploadUrl(
          file.fileName,
          file.fileType,
          folder,
          file.sizeBytes,
        );
        return {
          ...result,
          fileName: file.fileName,
        };
      }),
    );

    return results;
  } catch (error: any) {
    console.error("[S3 PRESIGNED BATCH] Error:", error.message);
    throw error;
  }
}
