var express = require('express');
var router = express.Router();
const userController = require("../controllers/user/userController")
const shopController = require("../controllers/user/shopController")
const productController = require("../controllers/user/productController")
const profileController = require("../controllers/user/profileController")
const {userAuth,adminAuth} = require('../middleware/auth')



router.get("/pageNotFound",userController.pageNotFound)
router.get("/",userController.loadHomepage)
router.get("/shop",shopController.getProduct)
router.get("/product/:id",productController.getProduct)


router.get("/profile",userAuth,profileController.profile)
router.get("/orders",userAuth,profileController.userOrders)
router.get("/wishlist",userAuth,profileController.getWishlist)
router.get("/wallet",userAuth,profileController.wallet)
router.get("/coupons",userAuth,profileController.coupons)
router.get("/changePassword",userAuth,profileController.changePassword)
router.get("/cart",userAuth,profileController.cart)
router.get("/checkoutPage",userAuth,profileController.checkout)
router.post("/getAddress",userAuth,profileController.addAddress) 
router.put("/updateProfile",userAuth,profileController.editProfile)
router.put("/updateAddress",userAuth,profileController.editAddress)
router.delete("/deleteAddress/:id",userAuth,profileController.deleteAddress)
router.post("/changePass",userAuth,profileController.changePass)
router.post("/addToCart",userAuth,profileController.addToCart)
router.post("/updateQuantity",userAuth,profileController.updateQuantity)
router.post("/removeItem",userAuth,profileController.removeItem)
router.get("/get-addresses",userAuth,profileController.getAddress)
router.post("/select-address/:id",userAuth, profileController.selectAddress)
router.get("/orderSuccess/:id",userAuth,userAuth,profileController.getSuccess)
router.get("/orderSuccess",userAuth,userAuth,profileController.getSuccess)
router.post("/place-order",userAuth,profileController.addOrder)
router.post("/verify-payment",userAuth,profileController.verifyPayment)
router.post("/updatePaymentStatus",userAuth,profileController.updatePaymentStatus)
router.post('/retryPayment/:id',userAuth,profileController.retrypayment)
router.post("/cancel",userAuth,profileController.cancelOrder)
router.post("/return",userAuth,profileController.returnOrder)
router.post("/addWishlist",userAuth,profileController.addToWishlist)
router.get("/orderDetails/:id",userAuth,profileController.orderDetails)
router.post("/applyCoupon", userAuth,profileController.checkCouponCode)
router.get("/download-invoice/:id", userAuth, profileController.downloadInvoice)
router.post("/generateReferral",userAuth,profileController.refferal)
router.get("/orderFailed",userAuth,profileController.getFailed)




module.exports = router;
