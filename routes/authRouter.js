var express = require('express');
var router = express.Router();
const authController = require("../controllers/user/authController");
const User = require('../models/userSchema');
const passport = require('passport');
const { route } = require('./userRouter');


router.get("/signup",authController.loadSignuppage)
router.post("/signup",authController.signup)
router.get("/login",authController.loadLoginpage)
router.post('/login', authController.login)
router.get("/otp",authController.loadOtppage)
router.post("/verify-otp",authController.verifyOtp)
router.post("/resend-otp",authController.resendOtp)
router.get("/email",authController.loadEmailpage)
router.get("/changePass",authController.loadChangepasswordpage)

router.get('/auth/google', passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{successRedirect:"/success",failureRedirect:'/signup'}),(req,res)=>{
  res.redirect('/')
})

router.get('/success',authController.success)

router.get("/logout",authController.logout)


module.exports = router;
