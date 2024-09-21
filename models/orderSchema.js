const mongoose = require("mongoose")
const { Schema } = mongoose
const {v4: uuidv4} = require('uuid')

const orderSchema = new Schema({
    orderId:{
        type:String,
        default:()=>uuidv4(),
        unique: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    orderdItems:[{
        product:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required: true
        },
        quantity:{
            type:Number,
            required: true
        },
        price:{
            type:Number,
            required:true,
            default: 0
        }
    }],
    totalPrice:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        default:0
    },
    address:{
        type:Schema.Types.ObjectId,
        ref:"Address",
        required: true
    },
    invoiceDate:{
        type:Date
    },
    items:{
        type:String,
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['cod', 'razorpay'], 
    },
    status:{
        type: String,
        required: true,
        enum:["pending", "shipped", "deliverd", "cancelled", "return request", "returned"]
    },
    createdOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    coupenApplied:{
        type:Boolean,
        default:false
    }
})

const Order = mongoose.model("Order",orderSchema)
module.exports = Order