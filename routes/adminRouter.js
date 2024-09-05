var express = require('express');
var router = express.Router();
const adminController = require("../controllers/admin/adminController")
const customerController = require("../controllers/admin/customerController")
const categoryController = require("../controllers/admin/categoryController")
const productController = require('../controllers/admin/productController')
const upload = require('../middleware/multer')
const {userAuth,adminAuth} = require('../middleware/auth')


router.get("/login",adminController.loadLogin)
router.post("/login",adminController.login)
router.get("/addProduct",productController.getProductAdd)
router.post("/addProduct",productController.addProduct)
router.post('/addCategory', categoryController.addCategory);
router.get("/categories",categoryController.getCategory)
router.post("/editCategory",categoryController.editCategory)
router.post('/toggleCategoryStatus',categoryController.toggleCategoryStatus)
router.get("/dashboard",adminController.loadDashboard)
router.get("/logout",adminController.logout)

router.get("/customers",customerController.customerInfo)

router.get("/blockCustomer",customerController.blockCustomer)
router.get("/unblockCustomer",customerController.unblockCustomer)

router.get("/blockProduct",productController.blockProduct)
router.get("/unblockProduct",productController.unblockProduct) 

router.get('/editProduct/:id',productController.getEditProduct)
router.post("/editProduct", productController.editProduct);




module.exports = router