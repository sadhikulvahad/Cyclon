const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')


const getProduct = async (req, res) => {
    try {
        const user = req.session.user
        const productId = req.params.id
        if (user) {
            const userData = await User.findOne({ _id: user })

            const products = await Product.findOne({
                _id:productId,
                isBlocked: false,
            })
            
            const related = await Product.find({ isBlocked: false, _id: { $ne: productId } }).limit(6);

            res.render("user/product", {
                userData,
                products,
                related
            })
        } else {
            const products = await Product.findOne({
                _id:productId,
                isBlocked: false,
            })

            const related = await Product.find({ isBlocked: false, _id: { $ne: productId } }).limit(6);

            res.render("user/product", {
                products,
                related
            })
        }
    } catch (error) {
        console.log("product page error", error)
        res.status(500).send("server error")
    }
}


module.exports = {
    getProduct
}