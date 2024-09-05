var express = require('express');
var router = express.Router();
const userController = require("../controllers/user/userController")
const shopController = require("../controllers/user/shopController")
const productController = require("../controllers/user/productController")



router.get("/pageNotFound",userController.pageNotFound)
router.get("/",userController.loadHomepage)
router.get("/shop",shopController.getProduct)
router.get("/product/:id",productController.getProduct)





module.exports = router;
