'use strict'

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var hbs = require('hbs');
hbs.registerPartials(__dirname + '/views');

var app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
var morgan = require('morgan');
if (global.$p.isDevMode()) app.use(morgan('dev'));
else {
	var logDirectory = sys.accessLogDirectory || (__dirname + '/../log');
	fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
	var logStream = require('file-stream-rotator').getStream({
		filename: logDirectory + '/' + global.$p.name + '-access.%DATE%',
		frequency: 'daily',
		verbose: false,
		date_format: 'YYYY-MM-DD'
	});
	app.use(morgan('combined', {stream: logStream}));
}


// routing ...
app.use('/', require('./routes/index'));
app.use('/showcase', require('./routes/showcase'));

global.$p.logger.info('[' + global.$p.name + '] Express框架與應用程式層初始化完成!');


// 404
app.use(function (req, res, next) {
	res.status(404);
	res.render('common/404');
});

// 500 etc.
app.use(function (err, req, res, next) {
	if (global.$p.isDevMode()) global.$p.errLogger.error(err.stack);

	res.status(err.status || 500);
	res.render('common/error', {
		error: err
	});
});

module.exports = app;