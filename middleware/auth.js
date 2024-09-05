// const User = require("../models/userSchema")


// const userAuth = (req, res, next) => {
//     if (req.session.user) {
//         User.findById(req.session.user)
//             .then(data => {
//                 if (data && !data.isBlocked) {
//                     next()
//                 } else {
//                     res.redirect("/login")
//                 }
//             })
//             .catch(error => {
//                 console.log("Error in user auth middleware")
//             })
//     } else {
//         res.redirect("/login")
//     }
// }

// const adminAuth = (req, res, next) => {
//     if (req.session.admin) {
//         User.findOne({ isAdmin: true })
//             .then(data => {
//                 if (data) {
//                     next()
//                 } else {
//                     redirect("/admin/login")
//                 }
//             })
//             .catch(error => {
//                 console.log("error in admin auth middleware", error);
//             })
//     }
// }


// module.exports = {
//     userAuth,
//     adminAuth
// }