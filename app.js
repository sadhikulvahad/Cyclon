var createError = require('http-errors');
var express = require('express');
const Razorpay = require('razorpay');
const bodyParser = require('body-parser');
const crypto = require('crypto');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('dotenv').config()
const passport = require("./config/passport")
const connectDB = require('./config/db')
const hbs = require('hbs')
const session = require("express-session")
const noCache = require("nocache")
const moment = require('moment')
const cron = require('node-cron');
const Order = require('./models/orderSchema')

var userRouter = require('./routes/userRouter');
const authRouter = require('./routes/authRouter')
const adminRouter = require('./routes/adminRouter')


var app = express();
connectDB()
hbs.registerPartials(path.join(__dirname, 'views/partials'));

hbs.registerHelper('eq', function (a, b) {
  return a == b;
});

hbs.registerHelper('ne', function(a, b) {
  return a != b;
});


hbs.registerHelper('formatDate', function (date) {
  return moment(date).format('YYYY-MM-DD  HH:mm:ss')
})

hbs.registerHelper('json', function (context) {
  return JSON.stringify(context);
});

hbs.registerHelper('increment', function (value) {
  return parseInt(value) + 1;
});

hbs.registerHelper('maxOffer', function (productOffer, brandOffer) {
  return Math.max(productOffer, brandOffer)
})

hbs.registerHelper('gt', function (value1, value2) {
  return value1 > value2;
});

hbs.registerHelper('lt', function (value1, value2) {
  return value1 < value2;
});

hbs.registerHelper('or', function (arg1, arg2) {
  return arg1 || arg2;
});

hbs.registerHelper('dec', function (value) {
  return value - 1;
});

hbs.registerHelper('inc', function (value) {
  return value + 1;
});

hbs.registerHelper('range', function (min, max) {
  const result = [];
  for (let i = min; i <= max; i++) {
    result.push(i);
  }
  return result;
});


app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}))

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


app.use(passport.initialize())
app.use(passport.session())

app.use(express.urlencoded({ extended: false }))

app.use(noCache())

app.use('/', userRouter);
app.use('/', authRouter);
app.use('/admin', adminRouter)



app.use('/uploads', express.static('uploads'))


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  res.status(404);
  res.render('user/pageNotFound')
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.exist = err.exist
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('user/error');
});

cron.schedule('*/2 * * * *', async () => {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 2 * 60 * 1000);

  try {
      const ordersToCancel = await Order.find({
          paymentStatus: 'failed',
          paymentFailedAt: { $lte: twentyFourHoursAgo },
          status: { $ne: 'cancelled' }
      });

      for (const order of ordersToCancel) {
          order.status = 'cancelled';
          await order.save();
      }
  } catch (error) {
      console.error('Error updating orders:', error);
  }
});


module.exports = app;
