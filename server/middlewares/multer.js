import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Create __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to uploads folder inside server
const uploadFolder = path.join(__dirname, "uploads");

// Make sure folder exists
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder); // Use correct path
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  }
});

const upload = multer({ storage });

export default upload;
