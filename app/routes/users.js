/**
 * not used
 * @file not used
 * @author cshotton
 * @copyright Copyright ©2016, Chuck Shotton. All rights reserved.
 */
"use strict";
var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get("*", function(req, res, next) {
	next();
 // res.render('test', {msg: req.baseUrl});
});

module.exports = router;
