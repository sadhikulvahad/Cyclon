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
router.get("/wishlist",userAuth,profileController.wishlist)
router.get("/wallet",userAuth,profileController.wallet)
router.get("/coupons",userAuth,profileController.coupons)
router.get("/changePassword",userAuth,profileController.changePassword)
router.get("/cart",userAuth,profileController.cart)
router.get("/checkoutPage",userAuth,profileController.checkout)
router.post("/getAddress",profileController.addAddress)
router.put("/updateProfile",profileController.editProfile)
router.put("/updateAddress",profileController.editAddress)
router.delete("/deleteAddress/:id",profileController.deleteAddress)
router.post("/changePass",profileController.changePass)

router.post("/addToCart",userAuth,profileController.addToCart)
router.post("/updateQuantity",userAuth,profileController.updateQuantity)
router.post("/removeItem",userAuth,profileController.removeItem)
router.get("/get-addresses",profileController.getAddress)
router.post("/select-address/:id", profileController.selectAddress)

router.get("/orderSuccess",userAuth,profileController.getSuccess)
router.post("/place-order",profileController.addOrder)
router.post("/cancel",profileController.cancelOrder)

router.get("/orderDetails/:id",userAuth,profileController.orderDetails)





module.exports = router;
