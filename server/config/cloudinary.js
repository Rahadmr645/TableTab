import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

const cloudName =
  process.env.CLOUDINARY_CLOUD_NAME ||
  process.env.CLOUDE_NAME ||
  process.env.CLOUD_NAME;

const apiKey =
  process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API_KEY;

const apiSecret =
  process.env.CLOUDINARY_API_SECRET || process.env.CLOUD_API_SECRET;

if (process.env.CLOUDINARY_URL?.trim()) {
  cloudinary.config({ secure: true });
} else if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

/** True when Cloudinary can accept uploads (URL or name/key/secret). */
export function isCloudinaryConfigured() {
  if (process.env.CLOUDINARY_URL?.trim()) return true;
  return Boolean(cloudName && apiKey && apiSecret);
}

export default cloudinary;
