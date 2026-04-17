import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary.js";

export { isCloudinaryConfigured };

/**
 * Upload a single image from memory to Cloudinary.
 * @param {Buffer} buffer
 * @param {string} mimeType e.g. image/jpeg
 * @param {string} folder e.g. tabletab/menu_items
 */
export async function uploadImageBuffer(buffer, mimeType, folder) {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured");
  }
  const b64 = Buffer.isBuffer(buffer)
    ? buffer.toString("base64")
    : Buffer.from(buffer).toString("base64");
  const dataUri = `data:${mimeType || "image/jpeg"};base64,${b64}`;
  return cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: "image",
  });
}

/** Best-effort delete; ignores missing asset errors. */
export async function destroyCloudinaryAsset(publicId) {
  if (!publicId || typeof publicId !== "string") return;
  if (!isCloudinaryConfigured()) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch {
    /* ignore */
  }
}
