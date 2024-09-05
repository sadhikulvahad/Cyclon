const User = require("../../models/userSchema")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")


const loadLogin = (req, res) => {
    if (req.session.admin) {
        return res.redirect('/dashboard')
    }
    res.render("admin/login")
}


const login = async (req, res) => {
    try {
        const { email, password } = req.body
        const admin = await User.findOne({ email, isAdmin: true })
        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password)
            if (passwordMatch) {
                req.session.admin = true
                return res.redirect("/admin/dashboard")
            } else {
                return res.redirect("/admin/login")
            }
        } else {
            return res.redirect("/admin/login")
        }
    } catch (error) {
        console.log("login error", error)
        return res.redirect("/admin/login")
    }
}



const loadDashboard = async (req,res)=>{
    try {
        if (!req.session.admin) {
            return res.redirect("/admin/login")
        } else {
            res.render("admin/dashboard")
        }
    } catch (error) {
        console.log(error)
        res.redirect("/admin/login")
    }
}


const logout = async (req,res)=>{
    try {
        req.session.destroy(err=>{
            if(err){
                console.log("session destroy error",err);
                return res.redirect("/")
            }
            return res.redirect("/admin/login")
        })
    } catch (error) {
        console.log("logout error", error)
    }
}


module.exports = {
    loadLogin,
    login,
    loadDashboard,
    logout,
}