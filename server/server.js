import express from 'express';
import http from 'http'
import dotenv from 'dotenv'
dotenv.config();
import { initSocket } from './socket/socket.js'
import userRoutes from './rotues/userRoutes.js';
import menuRoutes from './rotues/menuRoutes.js';
import qrRoutes from './rotues/qrRoutes.js'
import orderRoutes from './rotues/orderRoutes.js'
import adminRoutes from './rotues/adminRoutes.js'
import cors from 'cors';
import path from 'path'
import { fileURLToPath } from 'url';
import connectToDB from './config/db.js';


const app = express();
const server = http.createServer(app);



const io = initSocket(server);

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cors({
  origin: "*",
}));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = process.env.PORT || 4000;

// socket setup




// router section
app.use('/api/user/', userRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/menu/', menuRoutes);
app.use('/api/order', orderRoutes)
app.use('/api/qr', qrRoutes)


app.get('/', (req, res) => {
  res.send("Hello user");
})

// DB connection 
connectToDB();


server.listen(5000, () => {
  console.log(`Server is running on http://10.161.68.227::5000`);
});


