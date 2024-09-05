const User = require("../../models/userSchema")
const nodeMailer = require("nodemailer")
const env = require("dotenv").config()
const bcrypt = require("bcrypt")
const { response } = require("../../app")




const pageNotFound = async (req, res) => {
    try {
        return res.render("user/pageNotFound")
    } catch (error) {
        res.redirect('user/PageNotFound')
    }
}


const loadHomepage = async (req, res) => {
    try {
        const user = req.session.user
        if (user) {
            const userData = await User.findOne({ _id: user })
            console.log(userData)
            res.render("user/home", { userData })
        } else {
            return res.render("user/home")
        }
    } catch (error) {
        console.log("Home page is not found", error)
        res.status(500).send("Server error")
    }
}


module.exports = {
    loadHomepage,
    pageNotFound,
}