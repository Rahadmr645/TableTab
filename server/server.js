import express from "express";
import http from "http";
import dotenv from "dotenv";
dotenv.config();
import { initSocket } from "./socket/socket.js";
import userRoutes from "./routes/userRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import qrRoutes from "./routes/qrRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import connectToDB from "./config/db.js";
import adminOtpRoutes from "./routes/adminOtpRoutes.js";

const app = express();
const server = http.createServer(app);

const io = initSocket(server);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(
  cors({
    origin: "*",
  }),
);
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = process.env.PORT;

// socket setup

// router section
app.use("/api/user/", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/menu/", menuRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/otp", adminOtpRoutes);
app.use("/api/payment/", paymentRoutes);

app.get("/", (req, res) => {
  res.send("Hello user");
});

// DB connection
connectToDB();

server.listen(PORT, () => {
  console.log(`Server is running on http:///192.168.1.105:${PORT}`);
});
