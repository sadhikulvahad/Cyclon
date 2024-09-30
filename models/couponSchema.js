const mongoose = require("mongoose")
const { Schema } = mongoose

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    couponOffer: {
        type: Number,
        required: true
    },
    minAmount: {
        type: Number,
        required: true
    },
    maxAmount: {
        type: Number,
        required: true
    },
    expireOn: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    userId: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }]
})

couponSchema.index({ expireOn: 1 }, { expireAfterSeconds: 0 });

const Coupon = mongoose.model("Coupon", couponSchema)
module.exports = Coupon