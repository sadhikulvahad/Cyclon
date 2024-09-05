var createError = require('http-errors');
var express = require('express');
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

var userRouter = require('./routes/userRouter');
const authRouter = require('./routes/authRouter')
const adminRouter = require('./routes/adminRouter')


var app = express();
connectDB()
hbs.registerPartials(path.join(__dirname, 'views/partials'));

hbs.registerHelper('eq', function(a, b) {
  return a == b;
});

hbs.registerHelper('formatDate',function(date){
  return moment(date).format('YYYY-MM-DD  HH:mm:ss')
})

app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.use(session({
  secret : process.env.SESSION_SECRET, 
  resave : false,
  saveUninitialized : true,
  // store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/project' })
}))


app.use(passport.initialize())
app.use(passport.session())

app.use(express.urlencoded({ extended: false }))

app.use(noCache())

app.use('/', userRouter);
app.use('/', authRouter);
app.use('/admin', adminRouter)



app.use('/uploads', express.static('uploads'))


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  res.status(404);
  res.render('user/pageNotFound')
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.exist = err.exist
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('user/error');
});


module.exports = app;
