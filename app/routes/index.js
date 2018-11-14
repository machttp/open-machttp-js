/**
 * 
 * @file index.js handler
 * @author cshotton
 * @copyright Copyright ©2016, Chuck Shotton. All rights reserved.
 */
"use strict";
var express = require('express');
var router = express.Router();

/* GET home page. */

router.get('/', function(req, res, next) {
//	console.log ("index.js handler");
//	res.render('index', { title: 'Express' });
	res.render('index', {'req':req, 'res':res}, function (err, html) {
				if (!res.headersSent) {
					res.send (html);
				}
			});

});

module.exports = router;
