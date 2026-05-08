import "dotenv/config";
import express from "express";
import http from "http";
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
import tenantRoutes from "./routes/tenantRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import tableRoutes from "./routes/tableRoutes.js";
import platformRoutes from "./routes/platformRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import subscriptionBillingRoutes from "./routes/subscriptionBillingRoutes.js";

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

const PORT = process.env.PORT || 5000;

// socket setup

// router section
app.use("/api/tenant", tenantRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/user/", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/menu/", menuRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/otp", adminOtpRoutes);
app.use("/api/payment/", paymentRoutes);
app.use("/api/platform", platformRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/subscription", subscriptionBillingRoutes);

app.get("/", (req, res) => {
  res.send("Hello user");
});

/** Quick check from browser / Railway health checks */
app.get("/api/health", (req, res) => {
  res.status(200).json({ ok: true, service: "tabletab-api" });
});

// DB connection
connectToDB();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
