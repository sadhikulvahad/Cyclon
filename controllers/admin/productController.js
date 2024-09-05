const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const upload = require('../../middleware/multer')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')



async function saveCroppedImages(imagePath, size) {
    try {
        const imageName = path.basename(imagePath);
        const outputDir = path.join(__dirname, '../../uploads/resized');
        const outputPath = path.join(outputDir, imageName);

        // Create the directory if it doesn't exist
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        };

        await sharp(imagePath)
            .resize(size)
            .toFile(outputPath);

        return outputPath;
    } catch (error) {
        console.error('Error processing image:', error);
        throw error;
    }
}


const getProductAdd = async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.redirect("/admin/login")
        } else {
            const category = await Category.find({ categoryType: "type", isListed: true })
            const brand = await Category.find({ categoryType: "brand", isListed: true })
            const products = await Product.find()
            res.render("admin/addProduct", { category, brand, products })
        }
    } catch (error) {
        console.log(error)
        res.redirect("/admin/login")
    }
}

const addProduct = async (req, res) => {
    console.log("Adding product...");
    console.log(req.files)
    upload(req, res, async (err) => {
        if (err) {
            console.error("Multer error:", err);
            return res.render('admin/addProduct', { error: 'File upload error' });
        }

        try {
            // Destructure the fields from the request body
            const { productName, brand, category, regularPrice, salePrice, quantity, color, brakeStyle, numberOfGears, description } = req.body;

            // Ensure required fields are present
            if (!productName || !brand || !category) {
                console.error('Missing required product details');
                return res.render('admin/addProduct', { error: 'Missing required product details' });
            }

            // Process and resize images
            const resizedImages = [];
            const fileKeys = Object.keys(req.files);

            for (const key of fileKeys) {
                const fileArray = req.files[key];
                for (const file of fileArray) {
                    const resizedImagePath = await saveCroppedImages(file.path, { width: 300, height: 300 });
                    console.log('Resized image path:', resizedImagePath);
                    resizedImages.push(path.basename(resizedImagePath));
                }
            }

            console.log('Uploaded Files:', resizedImages);

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

            // Save product to the database
            await product.save();
            console.log("Product saved successfully:", product);
            res.redirect('/admin/addProduct');

        } catch (error) {
            console.error('Error saving product:', error);
            res.render('admin/addProduct', { error: 'An error occurred while saving the product.' });
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
        const { productId, productName, brand, category, description, regularPrice, salePrice, quantity, color, brakeStyle, numberOfGears } = req.body;

        if (req.session.admin) {
            // Check if all required fields are provided
            if (!productId || !productName || !brand || !category || !description || !regularPrice || !salePrice || !quantity || !color || !brakeStyle || !numberOfGears) {
                return res.status(400).json({ error: "All fields are required" });
            }

            // Find the product by ID
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ error: "Product not found" });
            }

            // Normalize product name
            const normalizedProductName = productName.trim().toLowerCase();

            // Check if a product with the same name and category already exists (excluding the current product)
            const existingProduct = await Product.findOne({
                name: { $regex: new RegExp('^' + normalizedProductName + '$', 'i') },
                category,
                _id: { $ne: productId } // Exclude the current product
            });

            if (existingProduct) {
                return res.status(400).json({ error: "Product with the same name already exists in this category" });
            }

            // Update the product with the new details
            product.name = productName;
            product.brand = brand;
            product.category = category;
            product.description = description;
            product.regularPrice = regularPrice;
            product.salePrice = salePrice;
            product.quantity = quantity;
            product.color = color;
            product.brakeStyle = brakeStyle;
            product.numberOfGears = numberOfGears;

            // Save the updated product
            await product.save();

            return res.json({ message: 'Product updated successfully' });
        } else {
            res.redirect('/admin/login');
        }
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