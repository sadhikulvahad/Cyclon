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
                _id: productId,
                isBlocked: false,
            })

            const related = await Product.find({ isBlocked: false, _id: { $ne: productId } }).limit(6);
            const wishlist = userData.wishlist.includes(productId)

            res.render("user/product", {
                userData,
                products,
                related,
                wishlist
            })
        } else {
            const products = await Product.findOne({
                _id: productId,
                isBlocked: false,
            })


            const productObj = products.toObject();

            const brandOfferData = await Category.find({ name: productObj.brand });
            let brandOfferValue = 0;

            if (brandOfferData.length > 0 && brandOfferData[0].brandOffer !== undefined) {
                brandOfferValue = brandOfferData[0].brandOffer;
            }

            productObj.brandOffer = brandOfferValue;
            console.log(productObj);
            const related = await Product.find({ isBlocked: false, _id: { $ne: productId } }).limit(6);

            res.render("user/product", {
                products:productObj,
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