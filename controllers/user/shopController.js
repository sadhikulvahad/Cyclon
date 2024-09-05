const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')



const getProduct = async (req, res) => {
    try {
        const user = req.session.user
        if (user) {
            const userData = await User.findOne({ _id: user })

            const products = await Product.find()
            const brand = await Category.find({ categoryType: "brand", isListed: true })
            const category = await Category.find({ categoryType: "type", isListed: true })


            let search = req.query.search || ""
            let page = parseInt(req.query.page) || 1
            const limit = 6
            const productData = await Product.find({
                isBlocked: false,
                $or: [
                    { productName: { $regex: ".*" + search + ".*", $options: 'i' } },
                ]
            })
                .limit(limit)
                .skip(((page - 1) * limit))
                .exec()

            const count = await Product.find({
                isBlocked: false,
                $or: [
                    { productName: { $regex: ".*" + search + ".*", $options: 'i' } },
                ],
            }).countDocuments()
            const totalPages = Math.ceil(count / limit)


            res.render("user/shop", {
                category, brand,
                products: productData,
                currentPage: page,
                totalPages,
                search,
                userData,
                pages: [...Array(totalPages).keys()].map(i => i + 1),
            })
        } else {
            const products = await Product.find()
            const brand = await Category.find({ categoryType: "brand", isListed: true })
            const category = await Category.find({ categoryType: "type", isListed: true })


            let search = req.query.search || ""
            let page = parseInt(req.query.page) || 1
            const limit = 6
            const productData = await Product.find({
                isBlocked: false,
                $or: [
                    { productName: { $regex: ".*" + search + ".*", $options: 'i' } },
                ]
            })
                .limit(limit)
                .skip(((page - 1) * limit))
                .exec()

            const count = await Product.find({
                isBlocked: false,
                $or: [
                    { productName: { $regex: ".*" + search + ".*", $options: 'i' } },
                ],
            }).countDocuments()
            const totalPages = Math.ceil(count / limit)


            res.render("user/shop", {
                category, brand,
                products: productData,
                currentPage: page,
                totalPages,
                search,
                pages: [...Array(totalPages).keys()].map(i => i + 1),
            })
        }


    } catch (error) {
        console.log(error)
        res.redirect("/shop")
    }
}



module.exports = {
    getProduct
}