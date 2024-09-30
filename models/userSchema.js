const mongoose = require('mongoose')
const Product = require('./productSchema')
const { Schema } = mongoose


const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: Number,
        required: false,
        unique: false,
        sparse: true,
        default: null
    },
    googleId: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
        required: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    cart: [{
        type: Schema.Types.ObjectId,
        ref: "Cart"
    }],
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
    }],
    wallet: {
        type: Number,
        default: 0
    },
    transactions: [{ 
        type: {
            type: String, // "credit", "debit", "refund"
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        createdOn: {
            type: Date,
            default: Date.now
        }
    }],
    orderHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Order"
    }],
    createdOn: {
        type: Date,
        default: Date.now
    },
    referalCode: {
        type: String,
    },
    redeemed: {
        type: Boolean
    },
    userProfilePhoto: {
        type: String,
        required: false
    },
    redeemedUsers: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    searchHistory: [{
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category"
        },
        brand: {
            Type: String
        },
        searchOn: {
            type: Date,
            default: Date.now
        }
    }]

})

const User = mongoose.model("User", userSchema)

module.exports = User