const Category = require("../../models/categorySchema")



const addCategory = async (req, res) => {
    const { name, categoryType } = req.body;
    try {
        if (req.session.admin) {
            if (!name || !categoryType) {
                return res.status(400).json({ error: "Name is required" });
            }
            const normalizedCategoryName = name.trim().toLowerCase();

            const existingCategory = await Category.findOne({
                name: { $regex: new RegExp('^' + normalizedCategoryName + '$', 'i') },
                categoryType
            })

            if (existingCategory) {
                return res.status(400).json({ error: "Category already exists" });
            }
            const newCategory = new Category({ name: normalizedCategoryName, categoryType });
            await newCategory.save();
            return res.json({ message: "Category added successfully" });
        } else {
            res.redirect('/admin/login')
        }
    } catch (error) {
        console.error('Server Error:', error.message); 
        console.error(error.stack);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const getCategory = async (req, res) => {
    try {
        const brands = await Category.find({ categoryType: 'brand' })
        const types = await Category.find({ categoryType: 'type' })
        res.render("admin/categories", { brands, types })
    } catch (error) {
        console.error('Server Error:', error.message);
        res.status(500).send("Internal server error");
    }
}

const editCategory = async (req, res) => {
    const { id, name, categoryType } = req.body

    try {
        if (req.session.admin) {

            if (!id || !name || !categoryType) {
                return res.status(400).json({ error: "All fields are required" })
            }
            const category = await Category.findById(id)


            if (!category) {
                return res.status(400).json({ error: 'Category not found' })
            }
            category.name = name;
            category.type = categoryType;

            const normalizedCategoryName = category.name.trim().toLowerCase();

            const existingCategory = await Category.findOne({
                name: { $regex: new RegExp('^' + normalizedCategoryName + '$', 'i') },
                categoryType
            })

            if (existingCategory) {
                return res.status(400).json({ error: "Category already exists" });
            }

            await Category.updateOne({ _id: id }, { name: normalizedCategoryName, categoryType });

            return res.json({ message: 'Category updated successfully' })
        } else {
            res.redirect('/admin/login')
        }
    } catch (error) {
        console.error('Server Error:', error.message);
        return res.status(500).json({ error: "Internal server error" })
    }
}

const toggleCategoryStatus = async (req, res) => {
    const { id, currentStatus } = req.body;
    try {
        if (!id) {
            return res.status(400).json({ error: 'Category Id required' });
        }

        const category = await Category.findById(id);
        if (!category) {
            return res.status(400).json({ error: 'Category not found' });
        }

        category.isListed = currentStatus;
        await category.save();
        return res.json({ message: `Category ${category.isListed ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'An error occurred' });
    }
}


module.exports = {
    addCategory,
    getCategory,
    editCategory,
    toggleCategoryStatus
}