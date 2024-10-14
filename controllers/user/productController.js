const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const Review = require('../../models/reviews')

const getProduct = async (req, res) => {
    try {
        const user = req.session.user
        const productId = req.params.id

        const reviews = await Review.find({ productId: productId }).populate('userId', 'name');

        if (user) {
            const userData = await User.findOne({ _id: user })

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

            const related = await Product.find({ isBlocked: false, _id: { $ne: productId } }).limit(6);
            const wishlist = userData.wishlist.includes(productId)

            res.render("user/product", {
                userData,
                products: productObj,
                related,
                wishlist,
                reviews
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

            const related = await Product.find({ isBlocked: false, _id: { $ne: productId } }).limit(6);

            res.render("user/product", {
                products: productObj,
                related,
                reviews
            })
        }
    } catch (error) {
        res.status(500).send("server error")
    }
}


module.exports = {
    getProduct
}