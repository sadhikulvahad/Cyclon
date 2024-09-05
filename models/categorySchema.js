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
    isListed:{
        type: Boolean,
        default: true
    },
    categoryOffer:{
        type:Number,
        default:0
    },
    createdAt:{
        type: Date,
        default: Date.now
    }
})

const Category = mongoose.model("Category",categorySchema)

module.exports = Category