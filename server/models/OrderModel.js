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
            menuItemId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Menu",
                default: null,
            },
            name: String,
            price: Number,
            quantity: Number,
        },
    ],

    totalPrice: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'In Progress', 'Ready', 'Finised', 'Finished'],
        default: 'pending',
    },

    /** Calendar day YYYY-MM-DD in ORDER_BUSINESS_TZ — dailyOrderNumber resets at midnight there */
    businessDay: { type: String, trim: true },
    /** 1-based sequence for that calendar day; unique together with businessDay */
    dailyOrderNumber: { type: Number, min: 1 },
    /** Global invoice-style id, e.g. TT-0000001 (never resets) — indexed via schema.index() below */
    invoiceSerial: { type: String, trim: true },

    createdAt: {
        type: Date,
        default: Date.now,
    }
});

/** One daily sequence # per business day (no duplicates for that day). */
orderSchema.index(
    { businessDay: 1, dailyOrderNumber: 1 },
    {
        unique: true,
        partialFilterExpression: {
            businessDay: { $exists: true, $type: "string" },
            dailyOrderNumber: { $exists: true, $type: "number" },
        },
    },
);

/** Global invoice line never repeats. */
orderSchema.index(
    { invoiceSerial: 1 },
    {
        unique: true,
        partialFilterExpression: {
            invoiceSerial: { $exists: true, $type: "string" },
        },
    },
);

const Order = mongoose.model('Order', orderSchema);


export default Order;