const mongoose = require("mongoose")
const { Schema } = mongoose

const cartSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    items: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        quantity: {
            type: Number,
            default: 1
        },
        price: {
            type: Number,
            required: true,
            default:0
        },
        totalPrice: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            default: "placed"
        },
        cancellationReason: {
            type: String,
            default: "none"
        }
    }],
    totalPrice: {
        type: Number,
        default: 0
    }
})

cartSchema.methods.calculateTotalPrice = function () {
    this.totalPrice = this.items.reduce((total, item) => total + item.totalPrice, 0);
};

const Cart = mongoose.model("Cart", cartSchema)

module.exports = Cart