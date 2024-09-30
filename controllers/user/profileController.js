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
    const { firstName, lastName, phone, houseNo, area, landmark, state, pincode, userId } = req.body
    if (phone.length !== 10) {
        return res.json({ error: 'Mobile number is not valid' })
    } else if (pincode.length !== 6) {
        return res.json({ error: 'Enter valid pincode' })
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
        return res.json({ error: 'Mobile number is not valid' })
    } else if (pincode.length !== 6) {
        return res.json({ error: 'Enter valid pincode' })
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
        console.error('Error updating address:', error);
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


const userOrders = async (req, res) => {
    const user = req.session.user
    const userData = await User.findOne({ _id: user })
    const orders = await Order.find({ userId: user }).sort({ createdOn: -1 }).populate('orderdItems.product')
    res.render('user/orders', { userData, orders })
}

const addOrder = async (req, res) => {
    console.log(req.body)
    const { selectedAddressId, paymentMethod, couponCode, finalPrice } = req.body;

    if (!finalPrice) {
        console.log("Final price is missing.");
        return res.status(400).json({ success: false, message: 'Final price is required' });
    }
    try {
        const user = await User.findOne({ _id: req.session.user });
        const selectedAddress = await Address.findOne({ userId: user, "address._id": selectedAddressId }, { "address.$": 1 });
        const cart = await Cart.findOne({ userId: user })


        const address = selectedAddress.address.find(
            addr => addr._id.toString() === selectedAddressId
        );

        if (!selectedAddress) {
            return res.status(400).json({ success: false, error: 'Invalid address selected.' });
        }


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
                    error: 'Insufficient stock for product with ID:',
                });
            }
        }


        const newOrder = new Order({
            userId: user,
            address: address,
            paymentMethod: paymentMethod,
            couponCode,
            orderdItems: orderItems,
            totalPrice: cart.totalPrice,
            finalPrice: finalPrice,
            status: 'pending'
        });


        await Coupon.updateOne({ code: couponCode }, { $push: { userId: req.session.user } })
        await newOrder.save();

        cart.items = [];
        cart.totalPrice = 0;
        await cart.save();

        return res.json({ success: true, message: 'Order placed successfully!' });
    } catch (error) {
        console.error('Error placing order:', error);
        return res.status(500).json({ success: false, message: 'Failed to place order.' });
    }
}


const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const order = await Order.findOne({ _id: razorpay_order_id });

        if (!order || order.paymentMethod !== 'razorpay') {
            return res.status(400).json({ success: false, message: 'Invalid order or payment method.' });
        }

        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature === razorpay_signature) {
            order.status = 'paid';
            await order.save();

            return res.json({ success: true, message: 'Payment verified and order completed.' });
        } else {
            return res.status(400).json({ success: false, message: 'Payment verification failed.' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        return res.status(500).json({ success: false, message: 'Payment verification failed.' });
    }
};


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

        res.render('user/orderDetails', { userData, order, address: selectedAddress.address });
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
                        description: `Refund for cancelled order #${orderId}`
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
        const userCart = await Cart.findOne({ userId: user }).populate('items.productId');

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
                return res.json({ message: "quantity can't be 0" })
            }
            if (cartItem.quantity >= 6) {
                return res.json({ message: "Max quantity" })
            }

            if (cartItem.quantity > product.quantity) {
                return res.json({ message: "stock unavailable" })
            }

            cartItem.totalPrice = Math.round(cartItem.price * cartItem.quantity)

            userCart.calculateTotalPrice();
            await userCart.save();

            res.status(200).json({ message: "Quantity updated" });
        } else {
            res.status(404).json({ message: "Item not found in cart" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating quantity" });
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
        if (!cart) {
            return res.status(400).send('Cart not found');
        }

        const productIds = cart.items.map(item => item.productId);
        const products = await Product.find({ _id: { $in: productIds } });

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
        const { couponCode } = req.body
        const coupon = await Coupon.findOne({ code: couponCode });

        if (!coupon) {
            return res.json({ success: false, message: "invalid Coupon" })
        }

        if (coupon.userId && coupon.userId.includes(req.session.user)) {
            return res.status(400).json({ success: false, message: 'Coupon has already been used by you.' });
        }

        const cart = await Cart.findOne({ userId: req.session.user })

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty.' });
        }

        const percentage = coupon.couponOffer

        const originalAmount = cart.totalPrice
        const discount = (originalAmount * percentage) / 100
        const finalAmount = Math.round(originalAmount - discount)

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
    res.render("user/orderSuccess")
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

}