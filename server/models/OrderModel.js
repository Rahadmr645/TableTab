import mongoose from 'mongoose';


const orderSchema = new mongoose.Schema({
    tableId: { type: String, reqired: true },
    customerName: { type: String, required: true },

    // if user is logged in 
    userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },


    // if user is guest store a gust token
    guestToken: {
        type: String,
        default: null,
    },
    
    items: [
        {
            name: String,
            price: Number,
            quantity: Number,
        },
    ],

    totalPrice: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'In Progress', 'Ready', 'Finised'],
        default: 'pending',
    },

    createdAt: {
        type: Date,
        default: Date.now,
    }
});



const Order = mongoose.model('Order', orderSchema);


export default Order;