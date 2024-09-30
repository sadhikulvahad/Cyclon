const mongoose = require("mongoose")
const {Schema} = mongoose



const categorySchema =({
    name:{
        type:String,
        required: true,
        unique: true
    },
    categoryType:{
        type:String,
        enum:['brand','type'],
        required:true
    },
    brandOffer:{
        type:Number,
        default:0
    },
    isListed:{
        type: Boolean,
        default: true
    },
    createdAt:{
        type: Date,
        default: Date.now
    }
})

const Category = mongoose.model("Category",categorySchema)

module.exports = Category