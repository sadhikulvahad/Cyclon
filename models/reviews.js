const mongoose = require("mongoose")
const {Schema} = mongoose


const reviewSchema = new Schema({
    userId : {
        type : Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    productId:{
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    reviews: {
        type:String,
        required: true
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true
    }
})

const Review = mongoose.model("Review", reviewSchema)
module.exports = Review