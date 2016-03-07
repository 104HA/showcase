var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
	res.writeHead(302, {		// redirect
		'Location': 'case1'
	});
	res.end();
});

// use regular expression
router.get(/^\/case[0-9]+$/, function(req, res, next) {
	res.render('showcase' + req.path + '/_', {
		module: 'SHOWCASE',
		layout: 'layout_showcase'
	});
});

module.exports = router;