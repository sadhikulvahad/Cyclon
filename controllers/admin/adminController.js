const User = require("../../models/userSchema")
const Order = require("../../models/orderSchema")
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



const loadDashboard = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('userId', 'name')
            .populate('orderdItems.product', 'productName') 
            .populate('address')  
            .exec();

        const totalRevenue = orders.reduce((sum, order) => sum + (order.finalPrice || 0), 0);
        const totalOrders = await Order.countDocuments({});

        res.render("admin/dashboard",{orders,totalOrders,totalRevenue})
    } catch (error) {
        console.log(error)
        res.redirect("/admin/login")
    }
}


const salesReport = async (req,res)=>{
    const { filterType, startDate, endDate } = req.body;

    try {
        let query ={}
        const now = new Date();


        if(filterType === 'daily'){
            query.createdOn = { $gte: new Date(), $lt: new Date().setHours(23, 59, 59, 999) };
        }else if(filterType === 'weekly'){
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            query.createdOn = { $gte: lastWeek, $lt: new Date() };
        }else if(filterType === 'monthly'){
            const currentMonth = new Date();
            query.createdOn = { $gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1), $lt: new Date() };
        }else if(filterType === 'yearly'){
            const currentYear = new Date();
            query.createdOn = { $gte: new Date(currentYear.getFullYear(), 0, 1), $lt: new Date() };
        }else if(filterType === 'custom'){
            query.createdOn = { $gte: new Date(startDate), $lt: new Date(endDate) };
        }

        const orders = await Order.find(query).populate('userId');
        const totalOrders = await Order.countDocuments({});
        const totalRevenue = orders.reduce((sum, order) => sum + (order.finalPrice || 0), 0);

        return res.json({ totalOrders, totalRevenue, orders });

    } catch (error) {
        return res.status(500).json({ message: 'Error fetching sales data' });
    }
}


const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.log("session destroy error", err);
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
    salesReport
}