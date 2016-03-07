var express = require('express');
var router = express.Router();

router.get('/', function (req, res, next) {

	//throw new Error('1111');
	res.render('index/_', {layout: 'layout_welcome'});
});

router.get('/reference', function (req, res, next) {
	res.render('reference/_', {
		module: 'Reference'
	});
});

router.get('/tutorial', function (req, res, next) {
	res.render('tutorial/_', {
		module: 'Tutorial'
	});
});

module.exports = router;
