const Address = require('../../models/addressSchema');
const Order = require('../../models/orderSchema')



const getOrder = async (req, res) => {
    try {
        const orders = await Order.find().populate("userId", "name").populate("orderdItems.product", "productName")
        res.render("admin/orders", { orders })
    } catch (error) {
        console.error(err);
        res.status(500).send('Server Error');
    }
}


const orderDetails = async (req, res) => {
    const orderId = req.params.id
    try {
        const orders = await Order.findOne({ orderId: orderId }).populate("userId").populate("orderdItems.product")
        const selectedAddress = await Address.findOne({ userId: orders.userId, "address._id": orders.address }, { "address.$": 1 });

        res.render('admin/orderDetails', { orders, address: selectedAddress.address[0] })
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
}


const updateOrder = async (req,res)=>{
    try {
        const { updatedStatus, orderId } = req.body
        await Order.findByIdAndUpdate(orderId, {$set: {status: updatedStatus}})
        res.status(200).json('status updated succesfully')
        
    } catch (error) {
        console.log(error)
    }

}

module.exports = {
    getOrder,
    orderDetails,
    updateOrder
}