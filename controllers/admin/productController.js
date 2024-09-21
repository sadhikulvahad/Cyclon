const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const upload = require('../../middleware/multer')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')


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

const addProduct = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.error("Multer error:", err);
            return res.status(400).json({ success: false,error: 'File upload error' });
        }

        try {
            const { productName, brand, category, regularPrice, salePrice, quantity, color, brakeStyle, numberOfGears, description } = req.body;

            if (!productName || !brand || !category) {
                console.error('Missing required product details');
                return res.status(400).json({ success: false,error: 'Missing required product details', showModal: true });
            }
            if(quantity < 0 || regularPrice < 0 || salePrice < 0 ){
                console.log('ereq')
                return res.status(400).json({success: false, error: 'Numbers must be greater than zero', showModal: true })
            }

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

const getEditProduct = async (req,res) =>{
    
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
        const { productId, productName, brand, category, description, regularPrice, salePrice, quantity, color, brakeStyle, numberOfGears } = req.body;
        
            if (!productId || !productName || !brand || !category || !description || !regularPrice || !salePrice || !quantity || !color || !brakeStyle || !numberOfGears) {
                return res.status(400).json({ error: "All fields are required" });
            }

            if (!productName || !brand || !category) {
                console.error('Missing required product details');
                return res.render('admin/addProduct', { error: 'Missing required product details' });
            }

            if(quantity < 0 || regularPrice < 0 || salePrice < 0 ){
                console.log("hloo")
                // return res.status(400).json({ success: false, error: 'Invalid address selected.' });
                return res.status(400).json({success: false, error: 'Numbers must be greater than zero' })
            }

            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ error: "Product not found" });
            }

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
            product.salePrice = salePrice;
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


module.exports = {
    getProductAdd,
    addProduct,
    blockProduct,
    unblockProduct,
    editProduct,
    getEditProduct
}