var express = require('express');
var router = express.Router();
const adminController = require("../controllers/admin/adminController")
const customerController = require("../controllers/admin/customerController")
const categoryController = require("../controllers/admin/categoryController")
const productController = require('../controllers/admin/productController')
const orderController = require("../controllers/admin/orderController")
const {userAuth,adminAuth} = require('../middleware/auth')


router.get("/login",adminController.loadLogin)
router.post("/login",adminController.login)

router.use(adminAuth)

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
router.post("/updateProduct", productController.editProduct);

router.get("/orders",orderController.getOrder)
router.get("/orderControl/:id",orderController.orderDetails)

router.post("/order-status",orderController.updateOrder)

router.get("/offers",productController.getOffers)
router.post("/addOffer",productController.addOffer)
router.post("/removeOffer",productController.removeOffer)

router.get("/coupons",productController.getCoupon)
router.post("/addCoupon",productController.addCoupon)
router.put("/editCoupon",productController.editCoupon)
router.delete("/couponDelete/:id",productController.deleteCoupon)

router.post("/salesReport",adminController.salesReport)
router.post("/salesPdfReport",adminController.downloadPdf)
router.post("/salesExcelReport",adminController.downloadExcel)

router.get("/topSelling",adminController.topSelling)




module.exports = router