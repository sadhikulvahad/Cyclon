const mongoose = require('mongoose')
const env = require("dotenv").config()

const connectDB = async ()=>{
    try {
        await mongoose.connect(process.env.MONGODB_URI)
    }catch (error){
        console.log(error)
    }
}

module.exports = connectDB