const bcrypt = require('bcrypt');
const Cart = require('../../models/cartSchema')
const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema')
const Coupon = require('../../models/couponSchema')
const crypto = require('crypto');
const { success } = require('./authController');
const fs = require('fs');
const path = require('path');
const { jsPDF } = require("jspdf")
require('jspdf-autotable');


const profile = async (req, res) => {
    const user = req.session.user
    try {
        const userData = await User.findOne({ _id: user })
        const address = await Address.findOne({ userId: user })
        res.render('user/userProfile', { userData, address })
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }

}

const addAddress = async (req, res) => {
    const { firstName, lastName, phone, houseNo, area, landmark, state, pincode } = req.body

    const userId = req.session.user

    if (phone.length !== 10) {
        return res.json({success:false, message: 'Mobile number is not valid' })
    } else if (pincode.length !== 6) {
        return res.json({ success:false, message: 'Enter valid pincode' })
    }
    try {
        let address = await Address.findOne({ userId })

        if (!address) {
            address = new Address({ userId, address: [] });
        }
        address.address.push({
            firstName,
            lastName,
            phone,
            houseNo,
            area,
            landmark,
            state,
            pincode,
        })

        await address.save()
        return res.status(200).json({ success: true, message: 'Address saved successfully', address: address.address[0] });

    } catch (error) {
        return res.status(500).json({ success: false, message: 'An error occurred while saving the address' });
    }
}


const editProfile = async (req, res) => {
    const { name, phone, email, userId } = req.body
    if (phone.length !== 10) {
        return res.json({ error: 'Mobile number is not valid' })
    }

    try {
        await User.updateOne({ _id: userId }, {
            $set: {
                name: name,
                phone: phone,
                email: email
            }
        })
        res.status(200).json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
}


const editAddress = async (req, res) => {
    const { firstName, lastName, phone, houseNo, area, landmark, state, pincode, addressId } = req.body
    if (phone.length !== 10) {
        return res.json({success: false, message: 'Mobile number is not valid' })
    } else if (pincode.length !== 6) {
        return res.json({success: false, message: 'Enter valid pincode' })
    }

    try {
        const address = await Address.updateOne({ 'address._id': addressId }, {
            $set: {
                "address.$.firstName": firstName,
                "address.$.lastName": lastName,
                "address.$.phone": phone,
                "address.$.houseNo": houseNo,
                "address.$.area": area,
                "address.$.landmark": landmark,
                "address.$.state": state,
                "address.$.pincode": pincode
            }
        })
        res.status(200).json({ success: true, message: 'Address updated successfully' })
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update address' });
    }
}


const deleteAddress = async (req, res) => {
    const addressId = req.params.id

    try {
        const deleteAddresses = await Address.updateOne({ 'address._id': addressId }, { $pull: { address: { _id: addressId } } })

        res.status(200).json({ success: true, message: 'Address deleted successfully' });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({ success: false, message: 'Failed to delete address' });
    }
}


const refferal = async (req, res) => {
    const userId = req.session.user
    const user = await User.findById(userId);
    try {
        if (!user.referalCode) {
            let referralCode;
            let isUnique = false;

            while (!isUnique) {
                referralCode = crypto.randomBytes(3).toString('hex').toUpperCase();
                const existingUser = await User.findOne({ referralCode });
                if (!existingUser) {
                    isUnique = true;
                }
            }

            user.referalCode = referralCode;
            await user.save();
        }

        res.json({ referralCode: user.referalCode });

    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({ success: false, message: 'Failed to delete address' });
    }
}


const userOrders = async (req, res) => {
    const user = req.session.user
    const userData = await User.findOne({ _id: user })
    const orders = await Order.find({ userId: user }).sort({ createdOn: -1 }).populate('orderdItems.product')
    res.render('user/orders', { userData, orders })
}

const addOrder = async (req, res) => {
    const { selectedAddressId, paymentMethod, couponCode, finalPrice, discount, totalAmount, paymentStatus } = req.body;

    if (!finalPrice) {
        return res.status(400).json({ success: false, message: 'Final price is required' });
    }

    if (!selectedAddressId) {
        return res.status(400).json({ success: false, message: 'Invalid address selected.' });
    }


    try {
        const user = await User.findOne({ _id: req.session.user });
        const selectedAddress = await Address.findOne({ userId: user, "address._id": selectedAddressId }, { "address.$": 1 });
        const cart = await Cart.findOne({ userId: user })


        const address = selectedAddress.address.find(
            addr => addr._id.toString() === selectedAddressId
        );

        


        const orderItems = cart.items.map(item => ({
            product: item.productId,
            quantity: item.quantity,
            price: item.price,
        }))

        for (let item of orderItems) {
            const updateResult = await Product.updateOne(
                { _id: item.product, quantity: { $gte: item.quantity } },
                { $inc: { quantity: -item.quantity } }
            );

            if (updateResult.modifiedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient stock for product with ID:',
                });
            }
        }

        if (paymentMethod === "wallet") {

            const finalPriceNumber = Number(finalPrice);
            if (finalPriceNumber > user.wallet) {
                return res.status(400).json({ success: false, message: 'insufficient balance. Choose any other Payment Method' })
            }
            const newWalletBalance = user.wallet - finalPriceNumber;

            if (isNaN(newWalletBalance)) {
                return res.status(400).json({ success: false, message: 'Invalid wallet balance after deduction' });
            }
            
            await User.updateOne({ _id: req.session.user }, {
                $set: {
                    wallet: newWalletBalance
                }
            })
        }

        const newOrder = new Order({
            userId: user,
            address: address,
            paymentMethod: paymentMethod,
            couponCode,
            orderdItems: orderItems,
            totalPrice: totalAmount,
            finalPrice: finalPrice,
            discount: discount,
            paymentStatus,
            status: 'pending'
        });

        await Coupon.updateOne({ code: couponCode }, { $push: { userId: req.session.user } })
        const order = await newOrder.save();

        cart.items = [];
        cart.totalPrice = 0;
        await cart.save();

        user.transactions.push({
            type: 'debit',
            amount: finalPrice,
            description: `Amount debited for purchasing product ${order._id}`
        })

        await user.save()

        return res.json({ success: true, orderId: order._id, message: 'Order placed successfully!' });
    } catch (error) {
        console.error('Error placing order:', error);
        return res.status(500).json({ success: false, message: 'Failed to place order.' });
    }
}


const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        console.log(razorpay_order_id, razorpay_payment_id, razorpay_signature)

        const order = await Order.findOne({ orderId: razorpay_order_id });

        if (!order || order.paymentMethod !== 'razorpay') {
            return res.status(400).json({ success: false, message: 'Invalid order or payment method.' });
        }

        const isVerified = verifySignature({
            order_id: razorpay_order_id,
            payment_id: razorpay_payment_id,
            signature: razorpay_signature,
        });


        if (isVerified) {
            order.paymentStatus = 'success';
            await order.save();
            return res.status(200).json({ success: true });
        } else {
            order.paymentStatus = 'failed';
            await order.save();
            return res.status(400).json({ success: false, message: 'Payment verification failed.' });
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const verifySignature = ({ order_id, payment_id, signature }) => {
    const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET)
        .update(`${order_id}|${payment_id}`)
        .digest('hex');
    return generatedSignature === signature;
};



const updatePaymentStatus = async (req, res) => {
    const { orderId, status } = req.body
    console.log(orderId, "orderid", status, 'status')
    try {
        const result = await Order.updateOne({ _id: orderId }, {
            $set: {
                paymentStatus: status
            }
        })

        if (result.modifiedCount > 0) {
            return res.json({ success: true, message: 'Payment status updated successfully' });
        } else {
            return res.json({ success: false, message: 'No order found with the given orderId' });
        }
    } catch (error) {
        console.error(error)
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}


const retrypayment = async (req, res) => {
    const orderId = req.params.id
    try {
        const order = await Order.findOne({ orderId: orderId })
        if (!order) {
            return res.status(400).json({ success: false, message: 'order id is not found' })
        }

        const razorpayKey = process.env.RAZORPAY_KEY_ID

        if (order.paymentStatus === 'failed') {
            return res.json({
                success: true,
                razorpayOrderId: order._id,
                orderId: order._id,
                razorpayKey
            });
        } else {
            return res.json({ success: false, message: 'Payment already completed' });
        }
    } catch (error) {

    }
}


const orderDetails = async (req, res) => {
    const user = req.session.user;
    const orderId = req.params.id;

    try {
        const order = await Order.findOne({ orderId: orderId }).populate('orderdItems.product');

        const selectedAddress = await Address.findOne({ userId: user, "address._id": order.address }, { "address.$": 1 });

        if (!order) {
            return res.status(404).send('Order not found');
        }

        const userData = await User.findById(user);
        const subTotal = order.totalPrice - 50
        res.render('user/orderDetails', { userData, order, address: selectedAddress.address, subTotal });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).send('Server error');
    }
}


const CalculateTotalWallet = (currentWalletBalance, refundAmount) => {
    return Number(currentWalletBalance) + Number(refundAmount);
};


const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findOne({ orderId });

        if (order) {

            if (order.orderdItems && order.orderdItems.length > 0) {
                for (const item of order.orderdItems) {
                    const product = await Product.findById(item.product);

                    if (product) {
                        product.quantity += item.quantity;
                        await product.save();
                    } else {
                        return res.status(404).json({ success: false, message: `Product with ID ${item.product} not found` });
                    }
                }
            }

            // Update the order status to 'cancelled'
            order.status = 'cancelled';
            await order.save();

            if (order.paymentMethod === 'razorpay') {
                const user = await User.findById(req.session.user);
                if (user) {
                    user.wallet = CalculateTotalWallet(user.wallet, order.finalPrice);
                    user.transactions.push({
                        type: 'credit',
                        amount: order.finalPrice,
                        description: `credited for cancelled order #${orderId}`
                    });

                    console.log(user.wallet, 'user.wallet')
                    console.log(user.transactions, 'user.transactions')

                    await user.save();
                }
            }

            res.json({ success: true, message: 'Order cancelled successfully and product quantity updated' });
        } else {
            res.status(404).json({ success: false, message: 'Order not found' });
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ success: false, message: 'Server error while canceling order' });
    }
};

const returnOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findOne({ orderId });

        if (order) {

            if (order.orderdItems && order.orderdItems.length > 0) {
                for (const item of order.orderdItems) {
                    const product = await Product.findById(item.product);

                    if (product) {
                        product.quantity += item.quantity;
                        await product.save();
                    } else {
                        return res.status(404).json({ success: false, message: `Product with ID ${item.product} not found` });
                    }
                }
            }

            order.status = 'return Request';

            await order.save();

            const user = await User.findById(req.session.user);
            if (user) {
                user.wallet = CalculateTotalWallet(user.wallet, order.finalPrice);

                user.transactions.push({
                    type: 'refund',
                    amount: order.finalPrice,
                    description: `Refund for returned order #${orderId}`
                });

                await user.save();
            }

            res.json({ success: true, message: 'Order Return request send successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Error in return request' });
        }
    } catch (error) {
        console.error('Error returning order:', error);
        res.status(500).json({ success: false, message: 'Server error while Returning the order' });
    }
}


const getWishlist = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findById(user).populate({
            path: 'wishlist',
            model: 'Product',
            select: 'productName productImages productOffer salePrice description regularPrice quantity _id' // Include product _id
        });

        if (!userData) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.render("user/wishlist", { userData, wishlist: userData.wishlist });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).send('Server error');
    }
};



const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const productExists = user.wishlist.includes(productId);

        if (productExists) {
            user.wishlist.pull(productId);
        } else {
            user.wishlist.push(productId);
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: productExists,
            wishlist: user.wishlist
        });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


const wallet = async (req, res) => {
    const user = req.session.user
    const userData = await User.findOne({ _id: user }).populate("transactions");
    res.render("user/wallet", { userData, walletBalance: userData.wallet, transactions: userData.transactions })
}



const coupons = async (req, res) => {
    const user = req.session.user
    const coupons = await Coupon.find()
    const userData = await User.findOne({ _id: user })
    res.render("user/coupons", { userData, coupons })
}

const changePassword = async (req, res) => {
    const user = req.session.user
    const userData = await User.findOne({ _id: user })
    res.render("user/changePass", { userData })
}


const changePass = async (req, res) => {
    const { oldPassword, newPassword, confirmPassword, userId } = req.body;

    try {
        const user = await User.findOne({ _id: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.json({ error: 'Your old password is wrong' });
        }
        if (newPassword !== confirmPassword) {
            return res.json({ error: 'Your passwords do not match' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.updateOne({ _id: userId }, { $set: { password: hashedPassword } });
        console.log("Password changed successfully");
        res.redirect('/profile');
    } catch (error) {
        console.error('Error changing password', error);
        res.status(500).json({ success: false, message: 'Failed to change password' });
    }
};

const cart = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });
        let userCart = await Cart.findOne({ userId: user }).populate('items.productId');

        // Check for removed or updated products in the cart
        if (userCart) {
            let itemsToRemove = [];
            userCart.items.forEach((item, index) => {
                if (!item.productId) {
                    // Product was removed by the admin, so mark it for removal
                    itemsToRemove.push(index);
                } else if (item.price !== item.productId.salePrice) {
                    // Product price has been updated, so update the cart item
                    item.price = item.productId.salePrice;
                    item.totalPrice = Math.round(item.price * item.quantity);
                }
            });

            // Remove the items that are no longer available
            itemsToRemove.forEach(index => {
                userCart.items.splice(index, 1);
            });

            // Recalculate the total price after potential updates
            userCart.calculateTotalPrice();
            await userCart.save();
        }

        res.render("user/cart", { userData, userCart, cartItems: userCart ? userCart.items : [] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching cart" });
    }
};


const addToCart = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ message: "Product ID is required" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        let userCart = await Cart.findOne({ userId: req.session.user });

        if (userCart) {
            const itemIndex = userCart.items.findIndex(item => item.productId.toString() === productId.toString());

            if (itemIndex > -1) {
                userCart.items[itemIndex].quantity += 1;
                userCart.items[itemIndex].totalPrice = Math.round(userCart.items[itemIndex].price * userCart.items[itemIndex].quantity);
            } else {
                userCart.items.push({
                    productId: productId,
                    quantity: 1,
                    price: product.salePrice,
                    totalPrice: product.salePrice,
                });
            }
        } else {
            const newCart = new Cart({
                userId: req.session.user,
                items: [{
                    productId: productId,
                    quantity: 1,
                    price: product.salePrice,
                    totalPrice: product.salePrice,
                }],
            });
            userCart = await newCart.save();
        }

        userCart.calculateTotalPrice();
        await userCart.save();
        return res.redirect('/cart')
        res.status(200).json({ message: "Added to cart" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error adding to cart" });
    }
};

const updateQuantity = async (req, res) => {
    try {
        const { productId, action } = req.body;
        const userCart = await Cart.findOne({ userId: req.session.user });
        const product = await Product.findById(productId)

        if (!userCart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        const itemIndex = userCart.items.findIndex(item => item.productId.toString() === productId.toString());

        if (itemIndex > -1) {
            const cartItem = userCart.items[itemIndex];
            if (action === "increment") {
                cartItem.quantity += 1;
            } else if (action === "decrement") {
                cartItem.quantity -= 1;
            }

            if (cartItem.quantity <= 0) {
                return res.json({ success: false, error: "quantity can't be 0" })
            }
            if (cartItem.quantity >= 6) {
                return res.json({ success: false, error: "Max quantity" })
            }

            if (cartItem.quantity > product.quantity) {
                return res.json({ success: false, error: "stock unavailable" })
            }

            cartItem.totalPrice = Math.round(cartItem.price * cartItem.quantity)

            userCart.calculateTotalPrice();
            await userCart.save();

            res.status(200).json({ success: true, totalAmount: userCart.totalPrice, quantity: cartItem.quantity, message: "Quantity updated" });
        } else {
            res.status(404).json({ success: true, message: "Item not found in cart" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: true, message: "Error updating quantity" });
    }
};


const removeItem = async (req, res) => {
    try {
        const { productId } = req.body;
        const userCart = await Cart.findOneAndUpdate({ userId: req.session.user }, { $pull: { items: { productId: productId } } }, { new: true });

        if (!userCart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        userCart.calculateTotalPrice();
        await userCart.save();

        res.status(200).json({ message: "Item removed" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error removing item" });
    }
};



const checkout = async (req, res) => {
    try {
        const user = req.session.user;
        const cart = await Cart.findOne({ userId: user });
        if (!cart || cart.items.length <= 0) {
            return res.redirect('/shop'); 
        }


        const productIds = cart.items.map(item => item.productId);
        const products = await Product.find({ _id: { $in: productIds } });

        const unavailableProduct = cart.items.some(item => {
            const product = products.find(prod => prod._id.equals(item.productId));
            return !product || product.isBlocked || (product.quantity <= 0);
        });

        if (unavailableProduct) {
            return res.redirect('/shop'); // Redirect to shop page if any product is unavailable
        }

        cart.totalPrice = cart.items.reduce((total, item) => {
            const product = products.find(prod => prod._id.equals(item.productId));
            if (product) {
                const productPrice = product.salePrice || product.regularPrice || 0;
                return total + productPrice * item.quantity;
            }
            return total;
        }, 0);

        await cart.save();

        const userAddress = await Address.findOne({ userId: user });
        const totalQuantity = cart.items.reduce((acc, item) => acc + item.quantity, 0);

        const orderSummery = {
            itemCount: totalQuantity,
            deliveryCharges: 50,
            total: Math.round(cart.totalPrice + 50)
        };

        const razorpayKey = process.env.RAZORPAY_KEY_ID

        res.render("user/checkoutPage", { userData: user, addresses: userAddress, orderSummery, razorpayKey });
    } catch (error) {
        console.error('Error rendering checkout page:', error);
        res.status(500).send('Server Error');
    }
}



const checkCouponCode = async (req, res) => {
    try {
        const { couponCode, totalAmount } = req.body
        const coupon = await Coupon.findOne({ code: couponCode });

        if (!coupon) {
            return res.json({ success: false, message: "invalid Coupon" })
        }

        if (coupon.userId && coupon.userId.includes(req.session.user)) {
            return res.status(400).json({ success: false, message: 'Coupon has already been used by you.' });
        }

        if (totalAmount < coupon.minAmount || totalAmount > coupon.maxAmount) {
            return res.status(400).json({ success: false, message: 'This coupon is not applicable for this price range' })
        }

        const cart = await Cart.findOne({ userId: req.session.user })

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty.' });
        }

        const percentage = coupon.couponOffer

        const originalAmount = cart.totalPrice
        const discount = (originalAmount * percentage) / 100
        const finalAmount = Math.round(originalAmount - discount)

        console.log(percentage, "percentage", discount, "discount")

        return res.json({ success: true, originalAmount, discount, finalAmount, percentage, message: `Coupon applied successfully. You saved ₹${discount}!` })

    } catch (error) {
        console.error("Error applying coupon: ", error);
        return res.status(500).json({ success: false, message: "Something went wrong. Please try again later." });
    }
}



const getAddress = async (req, res) => {
    try {
        const user = req.session.user;
        const addresses = await Address.find({ userId: user });
        res.json({ success: true, addresses: addresses });
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
}


const selectAddress = async (req, res) => {
    const addressId = req.params.id;
    const user = req.session.user
    try {
        const addressDoc = await Address.findOne({ 'address._id': addressId, userId: user });

        if (!addressDoc) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        const address = addressDoc.address.id(addressId);

        if (address) {
            return res.json({ success: true, address });
        } else {
            res.status(404).json({ success: false, message: 'Address not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
}


const getSuccess = async (req, res) => {
    const orderId = req.params.id
    try {
        await Order.updateOne({ _id: orderId }, {
            $set: {
                paymentStatus: "success"
            }
        })

        res.render("user/orderSuccess")
    } catch (error) {
        console.log(error)
    }
}


const getFailed = async (req, res) => {
    try {
        res.render("user/orderFailed")
    } catch (error) {
        console.log(error)
    }
}




const downloadInvoice = async (req, res) => {
    const orderId = req.params.id;
    try {
        const order = await Order.findOne({ orderId: orderId }).populate("orderdItems.product");
        const selectedAddress = await Address.findOne({ userId: req.session.user, "address._id": order.address }, { "address.$": 1 });

        if (!order) {
            return res.status(400).json({ message: "Item not found" });
        }

        const address = selectedAddress.address[0];
        const items = order.orderdItems;
        const paymentMethod = order.paymentMethod === 'razorpay' ? "Razorpay" : "Cash On Delivery";

        const doc = new jsPDF();

        doc.line(10, 10, 200, 10)
        doc.line(10, 52, 200, 52)
        doc.line(10, 83, 200, 83)
        doc.line(105, 83, 105, 120)

        doc.line(10, 10, 10, 285);
        doc.line(200, 10, 200, 285);
        doc.line(10, 285, 200, 285);

        // Add logo
        const logoPath = path.join(__dirname, '..', '..', 'public', 'images', 'logo.png');
        const logoImg = fs.readFileSync(logoPath).toString('base64'); // Use a function to load the image
        doc.addImage(logoImg, 'PNG', 10, 20, 55, 20);

        // Header
        doc.setFontSize(20);
        doc.text('Cyclon', 75, 20);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.text('3rd floor, Kinfra , Kakkancheri', 75, 26);
        doc.text('Kakkancheri, Malappuram - 673638', 75, 32);
        doc.text('Kerala, India', 75, 38)
        doc.text('Phone : 8129616329', 75, 44)
        doc.text('GSTIN: 8s1a2d9h6i1k6329', 75, 50);

        // Invoice details
        doc.setFontSize(16);
        doc.text('TAX INVOICE', 180, 50, { align: 'right' });
        doc.setFontSize(10);
        doc.text(`Invoice No: ${order.orderId}`, 20, 60,);
        doc.text(`Date: ${new Date(order.createdOn).toLocaleDateString()}`, 20, 66);
        doc.text(`Customer Name: ${address.firstName} ${address.lastName}`, 20, 72)
        doc.text(`Phone No: ${address.phone}`, 20, 78);

        doc.line(10, 91, 200, 91)

        // Bill To
        doc.setFontSize(12);
        doc.text('Bill To:', 20, 89);
        doc.setFont("Helvetica", "italic");
        doc.setFontSize(10);
        if (address) {
            doc.text(`${address.firstName} ${address.lastName}`, 20, 96);
            doc.text(`${address.houseNo}, ${address.area}`, 20, 102);
            doc.text(`${address.landmark}`, 20, 108);
            doc.text(`${address.state} - ${address.pincode}`, 20, 114);
        } else {
            doc.text('Address not provided', 20, 96);
        }

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(12);
        doc.text('ship To:', 110, 89);
        doc.setFont("Helvetica", "italic");
        doc.setFontSize(10);
        if (address) {
            doc.text(`${address.firstName} ${address.lastName}`, 110, 96);
            doc.text(`${address.houseNo}, ${address.area}`, 110, 102);
            doc.text(`${address.landmark}`, 110, 108);
            doc.text(`${address.state} - ${address.pincode}`, 110, 114);
        } else {
            doc.text('Address not provided', 110, 96);
        }

        // Table for items
        const tableColumn = ["Item & Description", "Qty", "Rate", "Amount"];
        const tableRows = [];

        items.forEach((item) => {
            const unitPrice = item.price;
            const totalPrice = item.price * item.quantity;
            tableRows.push([
                item.product.productName,
                item.quantity,
                unitPrice.toFixed(2),
                totalPrice.toFixed(2)
            ]);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 118,
            theme: 'grid',
            styles: { fontSize: 8 },
            columnStyles: { 0: { cellWidth: 60 } }
        });

        const finalY = doc.autoTable.previous.finalY;

        doc.line(115, finalY + 4, 115, finalY + 26);
        doc.line(115, finalY + 26, 200, finalY + 26);

        doc.setFont("Helvetica", "normal");
        doc.text('Sub Total', 120, finalY + 10);
        doc.text('Discount', 120, finalY + 15);
        doc.text('Delivery charge', 120, finalY + 20);
        doc.text(`Rs: ${(order.totalPrice.toFixed(2) - 50).toFixed(2)}`, 170, finalY + 10);
        doc.text(`Rs: ${order.discount.toFixed(2)}`, 170, finalY + 15);
        doc.text("Rs: 50", 170, finalY + 20);

        doc.setFontSize(12);
        doc.setFont("Helvetica", "bold");
        doc.text('Total', 120, finalY + 25);
        doc.text(`Rs: ${order.finalPrice.toFixed(2)}`, 170, finalY + 25);

        doc.setFontSize(10);
        const amountInWords = numberToWords(order.finalPrice);
        doc.text('Amount in words: ', 16, finalY + 10);
        doc.setFont("Helvetica", "italic");
        doc.text(`${amountInWords} Rupees Only`, 16, finalY + 15);

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.text('Thank you for your business!', 120, finalY + 55);

        doc.line(10, finalY + 45, 200, finalY + 45);

        doc.text('Company Name: CYCLONE', 20, finalY + 55);
        doc.text('Authorized Signatory', 20, finalY + 60);

        const pdfData = doc.output('arraybuffer');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice_${orderId}.pdf`);
        res.send(Buffer.from(pdfData));


    } catch (error) {
        console.error('Error generating invoice:', error); // Log the error message
        res.status(500).send('Error generating the invoice');
    }
}

// Helper function to convert number to words (you'll need to implement this)
function numberToWords(num) {
    if (num === 0) return "Zero";

    const ones = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen'
    ];

    const tens = [
        '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
    ];

    const thousands = ['', 'Thousand', 'Million', 'Billion'];

    const toWords = (n) => {
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + toWords(n % 100) : '');

        for (let i = 0; i < thousands.length; i++) {
            const divisor = Math.pow(1000, i);
            if (n < divisor * 1000) {
                return toWords(Math.floor(n / divisor)) + ' ' + thousands[i] + (n % divisor ? ' ' + toWords(n % divisor) : '');
            }
        }
    };

    // Handle decimals
    const parts = num.toString().split('.');
    const integerPart = parseInt(parts[0]);
    const fractionalPart = parts[1] ? parseInt(parts[1]) : 0;

    let words = toWords(integerPart);
    if (fractionalPart) {
        words += ` and ${toWords(fractionalPart)} Paise`;
    }

    return words;
}


module.exports = {
    profile,
    userOrders,
    orderDetails,
    getWishlist,
    wallet,
    coupons,
    changePassword,
    cart,
    checkout,
    addAddress,
    editProfile,
    editAddress,
    deleteAddress,
    changePass,
    addToCart,
    updateQuantity,
    removeItem,
    getAddress,
    selectAddress,
    getSuccess,
    addOrder,
    cancelOrder,
    verifyPayment,
    returnOrder,
    addToWishlist,
    checkCouponCode,
    downloadInvoice,
    updatePaymentStatus,
    retrypayment,
    refferal,
    getFailed
}