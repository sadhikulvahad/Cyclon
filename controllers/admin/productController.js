const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const upload = require('../../middleware/multer')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const Coupon = require('../../models/couponSchema')


const getProductAdd = async (req, res) => {
    try {
        const category = await Category.find({ categoryType: "type", isListed: true })
        const brand = await Category.find({ categoryType: "brand", isListed: true })
        const products = await Product.find()
        res.render("admin/addProduct", { category, brand, products })
    } catch (error) {
        console.log(error)
        res.redirect("/admin/login")
    }
}


const calculateSalePrice = (regularPrice, productOffer, brandOffer) => {
    const greatestOffer = Math.max(productOffer, brandOffer || 0);
    const salePrice = regularPrice - (regularPrice * greatestOffer / 100);
    return salePrice;
};


const addProduct = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error("Multer error:", err);
            return res.status(400).json({ success: false, error: 'File upload error' });
        }

        try {
            const { productName, brand, category, regularPrice, productOffer, quantity, color, brakeStyle, numberOfGears, description } = req.body;

            if (!productName || !brand || !category) {
                console.error('Missing required product details');
                return res.status(400).json({ success: false, error: 'Missing required product details', showModal: true });
            }
            if (productOffer < 0 || productOffer > 100) {
                return res.status(400).json({ success: false, error: 'Offer must be less than 100% and greater than 0%', showModal: true })
            }
            if (quantity < 0 || regularPrice < 0) {
                console.log('ereq')
                return res.status(400).json({ success: false, error: 'Numbers must be greater than zero', showModal: true })
            }

            const brandData = await Category.findOne({ categoryType: "brand", name: brand })
            const brandOffer = brandData.brandOffer

            const salePrice = calculateSalePrice(regularPrice, productOffer, brandOffer)

            // Process and resize images
            const resizedImages = [];
            const fileKeys = Object.keys(req.files);

            for (const key of fileKeys) {
                const fileArray = req.files[key];
                for (const file of fileArray) {
                    const filename = `${Date.now()}-${file.originalname}`;
                    const outputPath = path.join(__dirname, '../../uploads/resized', filename)

                    await sharp(file.buffer)
                        .resize(300, 300)
                        .toFile(outputPath)
                    resizedImages.push(filename);
                }
            }

            // Create new product instance
            const product = new Product({
                productName,
                brand,
                category,
                regularPrice,
                salePrice,
                productOffer,
                quantity,
                color,
                brakeStyle,
                numberOfGears,
                description,
                productImages: resizedImages,
                status: 'Available',
            });

            await product.save();
            console.log("Product saved successfully:", product);
            return res.status(200).json({ success: true, message: 'Product added successfully!' });
        } catch (error) {
            console.error('Error saving product:', error);
            return res.status(500).json({ success: false, error: 'An error occurred while saving the product.' });
        }
    });
};

const blockProduct = async (req, res) => {
    try {
        let id = req.query.id
        await Product.updateOne({ _id: id }, { $set: { isBlocked: true } })
        res.redirect("/admin/addProduct")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const unblockProduct = async (req, res) => {
    try {
        let id = req.query.id
        await Product.updateOne({ _id: id }, { $set: { isBlocked: false } })
        res.redirect("/admin/addProduct")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const getEditProduct = async (req, res) => {

    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.json(product);
    } catch (error) {
        console.error('Server Error:', error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}

const editProduct = async (req, res) => {

    try {
        console.log(req.body)
        const { productId, productName, brand, category, description, regularPrice, quantity, color, brakeStyle, numberOfGears } = req.body;

        if (!productId || !productName || !brand || !category || !description || !regularPrice || !quantity || !color || !brakeStyle || !numberOfGears) {
            return res.status(400).json({ error: "All fields are required" });
        }

        if (!productName || !brand || !category) {
            console.error('Missing required product details');
            return res.render('admin/addProduct', { error: 'Missing required product details' });
        }

        if (quantity < 0 || regularPrice < 0) {
            return res.status(400).json({ success: false, error: 'Numbers must be greater than zero' })
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        const brandData = await Category.findOne({ categoryType: "brand", name: brand })
        console.log(brandData.brandOffer)

        const salePrice = calculateSalePrice(regularPrice, product.productOffer, brandData.brandOffer)

        const normalizedProductName = productName.trim().toLowerCase();

        const existingProduct = await Product.findOne({
            name: { $regex: new RegExp('^' + normalizedProductName + '$', 'i') },
            category,
            _id: { $ne: productId }
        });

        if (existingProduct) {
            return res.status(400).json({ error: "Product with the same name already exists in this category" });
        }

        product.productName = productName;
        product.brand = brand;
        product.category = category;
        product.description = description;
        product.regularPrice = regularPrice;
        product.salePrice = salePrice
        product.quantity = quantity;
        product.color = color;
        product.brakeStyle = brakeStyle;
        product.numberOfGears = numberOfGears;

        await product.save();
        console.log("success")

        return res.json({ message: 'Product updated successfully' });

    } catch (error) {
        console.error('Server Error:', error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
};


const getOffers = async (req, res) => {

    try {
        const offerProducts = await Product.find({ productOffer: { $gt: 0 }, isBlocked: false })
        const notOffer = await Product.find({ productOffer: { $eq: 0 }, isBlocked: false })
        const offerBrands = await Category.find({ categoryType: 'brand', isListed: true, brandOffer: { $gt: 0 } })
        const notOfferBrands = await Category.find({ categoryType: 'brand', isListed: true, brandOffer: { $eq: 0 } })

        res.render("admin/offers", { offerProducts, notOffer, offerBrands, notOfferBrands })

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
}

const addOffer = async (req, res) => {
    try {
        const { offerType, offerId, percentage } = req.body
        if (offerType === "product") {
            const product = await Product.findById(offerId)
            if (!product) return res.status(404).json({ error: "Product not found" });

            const brand = await Category.findOne({ categoryType: "brand", name: product.brand })
            const brandOffer = brand.brandOffer
            const salePrice = calculateSalePrice(product.regularPrice, percentage, brandOffer);

            product.productOffer = percentage
            product.salePrice = salePrice
            await product.save()

        } else if (offerType === "brand") {
            const brand = await Category.findByIdAndUpdate(offerId, { brandOffer: percentage }, { new: true });
            if (!brand) return res.status(404).json({ error: "Brand not found" });

            const products = await Product.find({ brand: brand.name });
            for (let product of products) {
                const productOffer = product.productOffer || 0;
                const salePrice = calculateSalePrice(product.regularPrice, productOffer, percentage);

                product.salePrice = salePrice;
                await product.save();
            }
        }
        res.json({ success: true, message: `${offerType} offer added successfully` })
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
}


const removeOffer = async (req, res) => {
    try {
        const { offerType, offerId } = req.body
        if (offerType === "product") {
            const product = await Product.findByIdAndUpdate(offerId, { productOffer: 0 })
        } else if (offerType === "brand") {
            const brand = await Category.findByIdAndUpdate(offerId, { brandOffer: 0 })
        }

        res.json({ success: true, message: `${offerType} offer added successfully` })

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
}


const getCoupon = async (req,res)=>{
    try {
        const coupons = await Coupon.find()
        res.render("admin/coupons",{coupons})
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
}

const addCoupon = async (req,res)=>{
    try {
        const {code, discount, minAmount, maxAmount, expiryDate} = req.body

        const existingCode = await Coupon.findOne({code:code})

        if(existingCode){
            return res.status(400).json({ error: "This code is already taken" });
        }

        const coupon = new Coupon({
            code: code,
            couponOffer:discount,
            minAmount:minAmount,
            maxAmount: maxAmount,
            expireOn: expiryDate,
        })

        await coupon.save()

        res.json({ success: true, message: 'coupon added successfully' })

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
}


const editCoupon = async (req,res)=>{
    try {
        const {id, code, discount, minAmount, maxAmount, expiryDate} = req.body

        const coupon = await Coupon.updateOne({_id:id},{
            $set:{
                code: code,
                couponOffer: discount,
                minAmount : minAmount,
                maxAmount : maxAmount,
                expireOn : expiryDate
            }
        })
        console.log(coupon)

        res.status(200).json({ success: true, message: 'Coupon updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to edit coupon' });
    }
}

const deleteCoupon = async (req,res)=>{
    try {
        const id = req.params.id
        await Coupon.deleteOne({_id:id})
        res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete coupon' });
    }
}

module.exports = {
    getProductAdd,
    addProduct,
    blockProduct,
    unblockProduct,
    editProduct,
    getEditProduct,
    getOffers,
    addOffer,
    removeOffer,
    getCoupon,
    addCoupon,
    editCoupon,
    deleteCoupon
}