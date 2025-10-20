import express from 'express';
import http from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
dotenv.config();
import userRoutes from './rotues/userRoutes.js';
import menuRoutes from './rotues/menuRoutes.js';
import qrRoutes from './rotues/qrRoutes.js'
import orderRoutes from './rotues/orderRoutes.js'
import cors from 'cors';
import path from 'path'
import { fileURLToPath } from 'url';
import connectToDB from './config/db.js';


const app = express();
const server = http.createServer(app);



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
export const io = new Server(server, {
  cors: { origin: "*"}
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);


  // staus update from chef
  socket.on("updateStatus", ({ orderId, itemIndex, status }) => {
    io.emit("statusUpdated", ({ orderId, itemIndex, status}));
  });


  socket.on("disconnect", () => console.log("cleint disconnected: ", socket.id));
  
})

// router section
app.use('/api/user/', userRoutes)
app.use('/api/menu/', menuRoutes);
app.use('/api/order', orderRoutes)
app.use('/api/qr', qrRoutes)


app.get('/', (req, res) => {
  res.send("Hello user");
})


console
// DB connection 
connectToDB();


app.listen(PORT, () => {
  console.log(`Server is running on http://10.91.86.227:${PORT}`);
});


