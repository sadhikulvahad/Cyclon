const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')



const getProduct = async (req, res) => {
    try {
        const user = req.session.user
        let search = req.query.search || ""
        if (user) {
            const userData = await User.findOne({ _id: user })
            const brand = await Category.find({ categoryType: "brand", isListed: true })
            const category = await Category.find({ categoryType: "type", isListed: true })

            let page = parseInt(req.query.page) || 1
            const limit = 6

            let sortOption = req.query.sort || 'default';
            let sortCriteria = {};
            if (sortOption === 'priceLowToHigh') {
                sortCriteria = { salePrice: 1 };
            } else if (sortOption === 'priceHighToLow') {
                sortCriteria = { salePrice: -1 };
            }

            const filterCriteria = {
                isBlocked: false,
                $or: [
                    { productName: { $regex: ".*" + search + ".*", $options: 'i' } },
                    { brand: { $regex: ".*" + search + ".*", $options: 'i' } }
                ],
            };

            const selectedTypes = req.query.type ? req.query.type.split(',') : [];
            if (selectedTypes.length) {
                filterCriteria.category = { $in: selectedTypes };
            }

            const selectedBrands = req.query.brand ? req.query.brand.split(',') : [];
            if (selectedBrands.length) {
                filterCriteria.brand = { $in: selectedBrands };
            }

            const selectedPriceRanges = req.query.priceRange ? req.query.priceRange.split(',') : [];
            if (selectedPriceRanges.length) {
                filterCriteria.salePrice = {};
                selectedPriceRanges.forEach(range => {
                    const [min, max] = range.split('-').map(Number);
                    if (max) {
                        filterCriteria.salePrice['$gte'] = min;
                        filterCriteria.salePrice['$lte'] = max;
                    } else {
                        filterCriteria.salePrice['$gte'] = min; // For ranges like '15000+'
                    }
                });
            }

            const productData = await Product.find(filterCriteria)
                .sort(sortCriteria)
                .limit(limit)
                .skip((page - 1) * limit)
                .exec();

            const count = await Product.countDocuments(filterCriteria)
            const totalPages = Math.ceil(count / limit)

            for (const product of productData) {
                const productObj = product.toObject();

                const brandOfferData = await Category.find({ name: product.brand });

                let brandOfferValue = 0;
                if (brandOfferData.length > 0 && brandOfferData[0].brandOffer !== undefined) {
                    brandOfferValue = brandOfferData[0].brandOffer;
                }

                productObj.brandOffer = brandOfferValue;

                productData[productData.indexOf(product)] = productObj;
            }


            res.render("user/shop", {
                category, brand,
                products: productData,
                currentPage: page,
                totalPages,
                search,
                userData,
                sortOption,
                pages: [...Array(totalPages).keys()].map(i => i + 1),
            })
        } else {
            const brand = await Category.find({ categoryType: "brand", isListed: true })
            const category = await Category.find({ categoryType: "type", isListed: true })

            let search = req.query.search || ""
            let page = parseInt(req.query.page) || 1
            const limit = 6

            let sortOption = req.query.sort || 'default';
            let sortCriteria = {};
            if (sortOption === 'priceLowToHigh') {
                sortCriteria = { salePrice: 1 };
            } else if (sortOption === 'priceHighToLow') {
                sortCriteria = { salePrice: -1 };
            }

            const filterCriteria = {
                isBlocked: false,
                $or: [
                    { productName: { $regex: ".*" + search + ".*", $options: 'i' } },
                ],
            };

            const selectedTypes = req.query.type ? req.query.type.split(',') : [];
            if (selectedTypes.length) {
                filterCriteria.category = { $in: selectedTypes };
            }

            const selectedBrands = req.query.brand ? req.query.brand.split(',') : [];
            if (selectedBrands.length) {
                filterCriteria.brand = { $in: selectedBrands };
            }

            const selectedPriceRanges = req.query.priceRange ? req.query.priceRange.split(',') : [];
            if (selectedPriceRanges.length) {
                filterCriteria.salePrice = {};
                selectedPriceRanges.forEach(range => {
                    const [min, max] = range.split('-').map(Number);
                    if (max) {
                        filterCriteria.salePrice['$gte'] = min;
                        filterCriteria.salePrice['$lte'] = max;
                    } else {
                        filterCriteria.salePrice['$gte'] = min; // For ranges like '15000+'
                    }
                });
            }


            const productData = await Product.find(filterCriteria)
                .sort(sortCriteria)
                .limit(limit)
                .skip((page - 1) * limit)
                .exec();

            const count = await Product.countDocuments(filterCriteria);
            const totalPages = Math.ceil(count / limit)

            for (const product of productData) {
                const productObj = product.toObject();

                const brandOfferData = await Category.find({ name: product.brand });

                let brandOfferValue = 0;
                if (brandOfferData.length > 0 && brandOfferData[0].brandOffer !== undefined) {
                    brandOfferValue = brandOfferData[0].brandOffer;
                }

                productObj.brandOffer = brandOfferValue;

                productData[productData.indexOf(product)] = productObj;
            }

            res.render("user/shop", {
                category, brand,
                products: productData,
                currentPage: page,
                totalPages,
                search,
                sortOption,
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