import mongoose from 'mongoose';


const orderSchema = new mongoose.Schema({
    tableId: { type: String, reqired: true },
    customerName: { type: String, required: true },
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