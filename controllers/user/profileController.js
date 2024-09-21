const bcrypt = require('bcrypt');
const Cart = require('../../models/cartSchema')
const Product = require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const Order = require('../../models/orderSchema')


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
    const { selectedAddressId, paymentMethod, couponCode } = req.body;
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
            status: 'pending'
        });

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


const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findOne({ orderId });
        console.log(order);

        if (order) {
            console.log(order.orderdItems);

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

            res.json({ success: true, message: 'Order cancelled successfully and product quantity updated' });
        } else {
            res.status(404).json({ success: false, message: 'Order not found' });
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ success: false, message: 'Server error while canceling order' });
    }
};



const wishlist = async (req, res) => {
    const user = req.session.user
    const userData = await User.findOne({ _id: user })
    res.render("user/wishlist", { userData })
}

const wallet = async (req, res) => {
    const user = req.session.user
    const userData = await User.findOne({ _id: user })
    res.render("user/wallet", { userData })
}

const coupons = async (req, res) => {
    const user = req.session.user
    const userData = await User.findOne({ _id: user })
    res.render("user/coupons", { userData })
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
                userCart.items[itemIndex].totalPrice = userCart.items[itemIndex].price * userCart.items[itemIndex].quantity;
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

            if (cartItem.quantity === 0) {
                userCart.items = userCart.items.filter(item => item.productId.toString() !== productId.toString());
            }

            cartItem.totalPrice = cartItem.price * cartItem.quantity;

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
        const userCart = await Cart.findOne({ userId: req.session.user });

        if (!userCart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        userCart.items = userCart.items.filter(item => item.productId.toString() !== productId.toString());
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

        console.log(products); 

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
            total: cart.totalPrice + 50
        };

        res.render("user/checkoutPage", { userData: user, addresses: userAddress, orderSummery });
    } catch (error) {
        console.error('Error rendering checkout page:', error);
        res.status(500).send('Server Error');
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
    wishlist,
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
    cancelOrder
}