const User = require("../../models/userSchema")
const nodeMailer = require("nodemailer")
const env = require("dotenv").config()
const bcrypt = require("bcrypt")
const { response } = require("../../app")


const loadSignuppage = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render("user/signup")
        } else {
            res.redirect('/')
        }
    } catch (error) {
        console.log("product page error", error)
        res.status(500).send("server error")
    }
}


function generateOtp() {
    return Math.floor(1000 + Math.random() * 9000).toString()
}
async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodeMailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })
        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your otp: ${otp}</b>`
        })
        return info.accepted.length > 0
    } catch (error) {
        console.error(error, "error in sending email")
        return false
    }
}

const CalculateTotalWallet = (currentWalletBalance, refundAmount) => {
    return Number(currentWalletBalance) + Number(refundAmount);
};

const signup = async (req, res) => {

    try {
        const { name, email, password, cPassword, referralCode } = req.body
        if (password !== cPassword) {
            return res.render("user/signup", { message: "Your password doesn't match" })
        }
        
        const findUser = await User.findOne({ email })
        if (findUser) {
            return res.render("user/signup", { exist: "This email is already exist" })
        }

        if (referralCode) {
            const referral = await User.findOne({ referalCode: referralCode });
            if (!referral) {
                return res.render("user/signup", { exist: "Invalid referral code" });
            }
        }

        const otp = generateOtp()
        const emailSend = await sendVerificationEmail(email, otp)
        if (!emailSend) {
            return res.json("email.error")
        }
        req.session.userOtp = otp
        req.session.userData = { name, email, password, referralCode }
        res.redirect("/otp")
        console.log("OTP send", otp)
    } catch (error) {
        console.log("signup error", error)
        res.render("user/signup")
    }
}


const loadLoginpage = async (req, res) => {
    let error = req.query.error
    try {
        if (req.session.user) {
            return res.redirect('/')
        } else {
            return res.render("user/login")
        }
    } catch (error) {
        console.log("product page error", error)
        res.redirect("/login")
    }
}


const login = async (req, res) => {
    let error = req.query.error
    try {
        const { email, password } = req.body
        const findUser = await User.findOne({ isAdmin: 0, email: email })


        if (req.session.user) {
            return res.redirect('/')
        }
        if (!findUser) {
            return res.render("user/login", { error: "User not found" })
        }
        if (findUser.isBlocked) {
            return res.render("user/login", { error: "User is blocked by Admin" })
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password)
        if (!passwordMatch) {
            return res.render("user/login", { error: "Email or password is incorrect" })
        }
        req.session.user = findUser._id
        res.redirect('/')
    } catch (error) {
        console.log("login error", error)
        res.redirect("user/login", { error: "there is some error in your login" })
    }
}


const loadOtppage = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render("user/otp")
        } else {
            return res.redirect("/login")
        }

    } catch (error) {
        console.log("product page error", error)
        res.status(500).send("server error")
    }
}


const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
    } catch (error) {
        console.log(error, "Error hashing password")
    }
}


const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body
        console.log(otp)
        console.log('Session OTP:', req.session.userOtp)
        if (otp.trim() === req.session.userOtp.trim()) {
            const user = req.session.userData

            const refferedUser = await User.findOne({ referalCode: req.session.userData.referralCode })

            if (refferedUser) {
                refferedUser.wallet = CalculateTotalWallet(refferedUser.wallet, 300);

                refferedUser.transactions.push({
                    type: 'Reffer',
                    amount: 300,
                    description: `Reward get by reffering a Friend`
                });

                await refferedUser.save()

                saveUserData.transactions.push({
                    type: 'Reffer',
                    amount: 100,
                    description: `Reward get by reffering`
                });
                
            }

            const passwordHash = await securePassword(user.password)
            const saveUserData = new User({
                name: user.name,
                email: user.email,
                password: passwordHash,
                wallet: CalculateTotalWallet(0, 100)
            })
            
            await saveUserData.save()


            req.session.userOtp = null
            req.session.userData = null
            req.body.user = saveUserData._id
            res.status(200).json({ success: true, redirectUrl: "/login" })
        } else {
            res.status(500).json({ success: false, message: "Invalid OTP, please try again" })
        }
    } catch (error) {
        console.log(error, "error verifying OTP ")
        res.status(500).json({ success: false, message: "An error occured" })
    }
}


const resendOtp = async (req, res) => {
    try {
        const { email } = req.session.userData
        if (!email) {
            return res.status(500).json({ success: false, message: "Email not found in session" })
        }
        const otp = generateOtp()
        req.session.userOtp = otp
        const emailSend = await sendVerificationEmail(email, otp)
        if (emailSend) {
            console.log("Resend OTP", otp);
            return res.status(200).json({ success: true, message: "OTP resent successfully" })
        } else {
            res.status(500).jsom({ success: false, message: "filed to resend OTP, please try again" })
            return res.status(200).json({ success: true, message: "OTP resent successfully" })
        }

    } catch (error) {
        console.log(error, "Eoor in resending otp");
        return res.status(500).json({ success: false, message: "An error occurred while resending OTP" })
    }
}


const loadForgotPass = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render("user/forgotPass")
        }
    } catch (error) {
        console.log("product page error", error)
        res.redirect("/login")
    }
}


const checkMail = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });

        if (user) {
            const otp = generateOtp();
            const emailSend = await sendVerificationEmail(email, otp);

            if (emailSend) {
                req.session.userOtp = otp;
                req.session.otpExpires = Date.now() + 60 * 1000; // 1 minute
                req.session.email = email;

                res.redirect("/forgotOtp"); // Redirect to OTP page
                console.log("OTP:", otp);
            } else {
                res.render("user/forgotPass", { error: "Error in sending OTP" });
            }
        } else {
            console.log('No account with that email exists.')
            return res.render("user/forgotPass", { error: 'No account with that email exists.' });
        }
    } catch (error) {
        console.log(error, "Error sending OTP");
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};


const forgotOtp = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render("user/forgotOtp")
        }
    } catch (error) {
        console.log("product page error", error)
        res.redirect("/login")
    }
}


const verifyForgot = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log("otp:::", otp)
        if (otp.trim() === req.session.userOtp.trim() && Date.now() < req.session.otpExpires) {
            console.log(req.session.email)
            req.session.userData = await User.findOne({ email: req.session.email });
            req.session.userOtp = null;
            req.session.otpExpires = null;
            res.status(200).json({ success: true, redirectUrl: "/resetPassword" })
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP or OTP expired" });
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};


const loadResetPassword = (req, res) => {
    if (req.session.email) {
        res.render("user/resetPassword", { email: req.session.email });
    } else {
        res.redirect("/forgotPassword");
    }
};


const saveNewPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const email = req.session.email;

        if (!email) {
            return res.status(400).json({ success: false, message: "Session expired. Please try again." });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await User.updateOne({ email: email }, { $set: { password: hashedPassword } });

        if (result.nModified === 0) {
            return res.status(404).json({ success: false, message: "User not found or password unchanged." });
        }

        req.session.email = null;
        req.session.userOtp = null;

        res.status(200).json({ success: true, message: "Password updated successfully." });
    } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).json({ success: false, message: "An error occurred. Please try again." });
    }
};



const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.log("session destroy error", err);
                return res.redirect("/")
            }
            return res.redirect("/login")
        })
    } catch (error) {
        console.log("logout error", error)
    }
}


const success = async (req, res) => {
    try {
        const findUser = await User.findOne({ email: req.user.email })
        if (findUser.isBlocked) {
            return res.render("user/login", { error: "User is blocked by Admin" })
        }
        req.session.user = findUser;
        res.redirect('/')
    } catch (error) {
        res.redirect("/login")
    }
}


module.exports = {
    loadSignuppage,
    loadLoginpage,
    loadOtppage,
    signup,
    verifyOtp,
    resendOtp,
    login,
    logout,
    success,
    loadForgotPass,
    checkMail,
    forgotOtp,
    verifyForgot,
    saveNewPassword,
    loadResetPassword
}