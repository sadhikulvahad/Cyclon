const { search } = require("../../app")
const User = require("../../models/userSchema")


const customerInfo = async (req,res)=>{
        try {
            let search =req.query.search || ""
            let page = parseInt(req.query.page) || 1
            const limit = 5
    
            const userData = await User.find({
                isAdmin:false,
                $or:[
                    {name:{$regex:".*" + search + ".*",$options: 'i'}},
                    {email:{$regex:".*" + search + ".*",$options: 'i'}}
                ]
            })
            .limit(limit)
            .skip(((page-1)*limit))
            .exec()
    
            const count = await User.find({
                isAdmin:false,
                $or:[
                    {name:{$regex:".*" + search + ".*",$options: 'i'}},
                    {email:{$regex:".*" + search + ".*",$options: 'i'}}
                ],
            }).countDocuments()
            const totalPages = Math.ceil(count / limit)
    
            res.render("admin/customers", {
                userData,
                currentPage:page,
                totalPages,
                search,
                pages: [...Array(totalPages).keys()].map(i => i + 1),
            })
    
        } catch (error) {
            res.redirect("/pageNotFound")
        }
    
}


const blockCustomer = async (req,res)=>{
    try {
        let id= req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:true}})
        req.session.user = false
        res.redirect("/admin/customers")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const unblockCustomer = async (req,res)=>{
    try {
        let id= req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/customers")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}



module.exports ={
    customerInfo,
    blockCustomer,
    unblockCustomer
}