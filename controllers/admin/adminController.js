const User = require("../../models/userSchema")
const Order = require("../../models/orderSchema")
const Products = require("../../models/productSchema")
const Orders = require("../../models/orderSchema")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const { jsPDF } = require("jspdf")
const { success } = require("../user/authController")
const ExcelJS = require('exceljs')

require('jspdf-autotable');


const loadLogin = (req, res) => {
    if (req.session.admin) {
        return res.redirect('/dashboard')
    }
    res.render("admin/login")
}


const login = async (req, res) => {
    try {
        const { email, password } = req.body
        const admin = await User.findOne({ email, isAdmin: true })
        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password)
            if (passwordMatch) {
                req.session.admin = true
                return res.redirect("/admin/dashboard")
            } else {
                return res.redirect("/admin/login")
            }
        } else {
            return res.redirect("/admin/login")
        }
    } catch (error) {
        console.log("login error", error)
        return res.redirect("/admin/login")
    }
}



const loadDashboard = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('userId', 'name')
            .populate('orderdItems.product', 'productName')
            .populate('address')
            .exec();

        res.render("admin/dashboard", { orders })
    } catch (error) {
        console.log(error)
        res.redirect("/admin/login")
    }
}


const salesReport = async (req, res) => {
    const { filterType, startDate, endDate } = req.body;

    try {
        let query = {}
        const now = new Date();


        if (filterType === 'daily') {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
            query.createdOn = { $gte: startOfDay, $lt: endOfDay }
        } else if (filterType === 'weekly') {
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            query.createdOn = { $gte: lastWeek, $lt: new Date() };
        } else if (filterType === 'monthly') {
            const currentMonth = new Date();
            const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
            endOfMonth.setHours(23, 59, 59, 999);
            query.createdOn = { $gte: startOfMonth, $lt: endOfMonth };
        } else if (filterType === 'yearly') {
            const currentYear = new Date();
            query.createdOn = { $gte: new Date(currentYear.getFullYear(), 0, 1), $lt: new Date() };
        } else if (filterType === 'custom') {
            query.createdOn = { $gte: new Date(startDate), $lt: new Date(endDate) };
        }

        const orders = await Order.find(query).populate('userId');
        const totalOrders = await Order.countDocuments(query)
        const totalRevenue = orders.reduce((sum, order) => sum + (order.finalPrice || 0), 0);
        const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0);

        return res.json({ totalOrders, totalRevenue, orders, totalDiscount });

    } catch (error) {
        return res.status(500).json({ message: 'Error fetching sales data' });
    }
}



const downloadPdf = async (req, res) => {
    const { filterType, startDate, endDate } = req.body;

    try {
        let query = {};

        if (filterType === 'daily') {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
            query.createdOn = { $gte: startOfDay, $lt: endOfDay };
        } else if (filterType === 'weekly') {
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            query.createdOn = { $gte: lastWeek, $lt: new Date() };
        } else if (filterType === 'monthly') {
            const currentMonth = new Date();
            query.createdOn = { $gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1), $lt: new Date() };
        } else if (filterType === 'yearly') {
            const currentYear = new Date();
            query.createdOn = { $gte: new Date(currentYear.getFullYear(), 0, 1), $lt: new Date() };
        } else if (filterType === 'custom') {
            query.createdOn = { $gte: new Date(startDate), $lt: new Date(endDate) };
        }

        const orders = await Order.find(query).populate('userId');

        const doc = new jsPDF();

        doc.setFontSize(25);
        doc.text('Sales Report', 10, 10);
        doc.setFontSize(12);

        const tableData = orders.map((order, index) => ([
            index + 1, 
            order.userId ? order.userId.name : 'N/A',
            `₹${order.totalPrice}`, 
            `₹${order.finalPrice}`, 
            order.status, 
            order.paymentMethod, 
            new Date(order.createdOn).toLocaleString() 
        ]));

        const tableColumn = [
            'Order ID',
            'Username',
            'Total Amount',
            'Final Amount',
            'Status',
            'Payment Method',
            'Created At'
        ];

        doc.autoTable({
            head: [tableColumn],
            body: tableData,
            startY: 30,
            margin: { horizontal: 10 }, 
            styles: {
                overflow: 'linebreak',
                cellWidth: 'auto',
                minCellHeight: 10
            },
            didParseCell: function (data) {
                if (data.section === 'body') {
                    data.cell.styles.valign = 'middle'; 
                }
            }
        });

        const pdfBuffer = doc.output('arraybuffer');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        res.end(Buffer.from(pdfBuffer));
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).json({ message: 'Error generating PDF report', error: error.message });
    }
};



const downloadExcel = async (req, res) => {
    const { filterType, startDate, endDate } = req.body;

    try {
        let query = {};

        if (filterType === 'daily') {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
            query.createdOn = { $gte: startOfDay, $lt: endOfDay };
        } else if (filterType === 'weekly') {
            const lastWeek = new Date();
            lastWeek.setDate(lastWeek.getDate() - 7);
            query.createdOn = { $gte: lastWeek, $lt: new Date() };
        } else if (filterType === 'monthly') {
            const currentMonth = new Date();
            query.createdOn = { $gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1), $lt: new Date() };
        } else if (filterType === 'yearly') {
            const currentYear = new Date();
            query.createdOn = { $gte: new Date(currentYear.getFullYear(), 0, 1), $lt: new Date() };
        } else if (filterType === 'custom') {
            query.createdOn = { $gte: new Date(startDate), $lt: new Date(endDate) };
        }

        const orders = await Order.find(query).populate('userId');

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.addRow(['Order ID', 'Username', 'Total Amount', 'Final Amount', 'Status', 'Payment Method', 'Created At']);

        orders.forEach((order, index) => {
            worksheet.addRow([
                index + 1,
                order.userId ? order.userId.name : 'N/A',
                order.totalPrice,
                order.finalPrice,
                order.status,
                order.paymentMethod,
                new Date(order.createdOn).toLocaleString()
            ]);
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');

        await workbook.xlsx.write(res);
        res.end(); 

    } catch (error) {
        console.error("Error generating Excel:", error);
        res.status(500).json({ message: 'Error generating Excel report', error: error.message });
    }
};




const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.log("session destroy error", err);
                return res.redirect("/")
            }
            return res.redirect("/admin/login")
        })
    } catch (error) {
        console.log("logout error", error)
    }
}


const topSelling = async (req, res) => {

    try {
        const topSellingProducts = await Order.aggregate([
            { $unwind: "$orderdItems" },
            {
                $group: {
                    _id: "$orderdItems.product",
                    totalSales: { $sum: "$orderdItems.quantity" },
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $project: {
                    _id: 0,
                    productName: "$productInfo.productName",
                    brand: "$productInfo.brand",
                    category: "$productInfo.category",
                    totalSales: 1
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 }
        ]);

        const topSellingBrands = await Order.aggregate([
            { $unwind: "$orderdItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderdItems.product",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $group: {
                    _id: "$productInfo.brand",
                    totalSales: { $sum: "$orderdItems.quantity" },
                }
            },
            {
                $project: {
                    _id: 0,
                    brand: "$_id",
                    totalSales: 1
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 }
        ]);

        const topSellingTypes = await Order.aggregate([
            { $unwind: "$orderdItems" },
            {
                $lookup: {
                    from: "products",
                    localField: "orderdItems.product",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $group: {
                    _id: "$productInfo.category",
                    totalSales: { $sum: "$orderdItems.quantity" },
                }
            },
            {
                $project: {
                    _id: 0,
                    category: "$_id",
                    totalSales: 1
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: 10 }
        ]);

        res.json({ success: true, topSellingProducts, topSellingBrands, topSellingTypes });
    } catch (error) {

    }
}

module.exports = {
    loadLogin,
    login,
    loadDashboard,
    logout,
    salesReport,
    downloadPdf,
    downloadExcel,
    topSelling
}