const mongoose = require("mongoose")
const { Schema } = mongoose
const {v4: uuidv4} = require('uuid')

const orderSchema = new Schema({
    orderId:{
        type:String,
        default:()=>uuidv4(),
        unique: true
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
            default: 0
        }
    }],
    totalPrice:{
        tupe:Number,
        required:true
    },
    discount:{
        type:Number,
        default:0
    },
    finallyAmount:{
        type:Number,
        required:true
    },
    address:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required: true
    },
    invoiceDate:{
        type:Date
    },
    status:{
        type: String,
        required: true,
        enum:["pending", 'Processing', "Shipped", "Deliverd", "Cancelled", "Return Request", "Returned"]
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