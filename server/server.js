import express from 'express';

import dotenv from 'dotenv'
dotenv.config();
import userRoutes from './rotues/userRoutes.js';
import menuRoutes from './rotues/menuRoutes.js';
import qrRoutes from './rotues/qrRoutes.js'
import cors from 'cors';
import connectToDB from './config/db.js';

const app = express();

app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const PORT = process.env.PORT || 4001;


// router section
app.use('/api/user/', userRoutes)
app.use('/api/menu/', menuRoutes)
app.use('/api/qr', qrRoutes)


app.get('/', (req, res) => {
    res.send("Hello user");
})


console
// DB connection 
connectToDB();


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


