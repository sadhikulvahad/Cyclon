const User = require("../../models/userSchema")
const Order = require("../../models/orderSchema")
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
        const user = req.session.user;
        const topSellingProducts = await Order.aggregate([
            { $unwind: "$orderdItems" },
            {
                $group: {
                    _id: "$orderdItems.product",
                    totalSales: { $sum: "$orderdItems.quantity" },
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $project: {
                    _id: "$productInfo._id",
                    productName: "$productInfo.productName",
                    brand: "$productInfo.brand",
                    category: "$productInfo.category",
                    productImages: "$productInfo.productImages", 
                    description: "$productInfo.description",
                    regularPrice: "$productInfo.regularPrice",
                    salePrice: "$productInfo.salePrice",
                    totalSales: 1
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 1 }
        ]);

        if (user) {
            const userData = await User.findOne({ _id: user });
            return res.render("user/home", { userData, product: topSellingProducts[0] });
        } else {
            return res.render("user/home", { product: topSellingProducts[0] });
        }
    } catch (error) {
        res.status(500).send("Server error")
    }
}


module.exports = {
    loadHomepage,
    pageNotFound,
}