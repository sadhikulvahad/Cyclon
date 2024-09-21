
const mongoose = require("mongoose")
const { Schema } = mongoose


const addressSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    address: [{
        addressType: {
            type: String,
            require: true,
        },
        firstName: {
            type: String,
            required: true
        },
        lastName: {
            type: String,
            required: false
        },
        houseNo: {
            type: String,
            required:true
        },
        area:{
            type: String,
            required:true
        },
        landmark: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        pincode: {
            type: Number,
            required: true
        },
        phone: {
            type: Number,
            required: true
        }
    }]
})


const Address=  mongoose.model("Address",addressSchema)

module.exports = Address