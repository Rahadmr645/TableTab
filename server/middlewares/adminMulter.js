import multer from "multer";

import path from "path";

import fs from "fs";
import { fileURLToPath } from "url";

// dir setup for es module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// path to uploads folder inside server
const uploadFolder = path.join(__dirname, "../uploads/admin");

// make sure folder exists
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

// multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder);
  },

  filename: (req, file, cb) => {
    cb(
      null,
      `${file.fieldname}-${Date.now()} ${path.extname(file.originalname)}`,
    );
  },
});

const uploadAdmin = multer({ storage });

export default uploadAdmin;
