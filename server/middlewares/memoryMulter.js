import multer from "multer";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

const storage = multer.memoryStorage();

/** In-memory file uploads for Cloudinary (no disk temp files). */
const uploadMemory = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
});

export default uploadMemory;
