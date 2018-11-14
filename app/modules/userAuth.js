/**
 * 
 * @file userAuth.js
 * @author cshotton
 * @copyright Copyright ©2016, Chuck Shotton. All rights reserved.
 */
"use strict";
var appRoot = require ('app-root-path');
const debug = require('debug')('userAuth');
var auth = require('basic-auth');
var globalContext = require (appRoot + '/modules/context').context;
var realms = require (appRoot + '/modules/realms');
var odb = globalContext.odb;
var verbs = globalContext.verbs;

var app = null;

module.exports.init = function (eapp) {
	app = eapp; //save the express app locally
	
	var realmList = realms.listRealms ();
	
	for (var i=0; i<realmList.length; i++) {
		var ba = authFactory (realmList [i]);
		var path = realms.get1Realm (realmList [i]);
		debug ("Creating user auth for realm: " + realmList[i]+ ", " + path);
		app.use (path, ba);
	}
}


function authFactory (realm) {

	return function (req, res, next) {
	
		function unauthorized(res) {
			res.set('WWW-Authenticate', 'Basic realm=' + realm);
			return res.sendStatus(401);
		};

		var user = auth(req);
		debug ("user: " + JSON.stringify (user));
		if (user === undefined) {
			return unauthorized(res);
		};
		
		//get the user's password for the appropriate realm
		var userPass = realms.get1User (realm, user.name);
		var userName = (userPass === null ? null : user.name);
		
		debug ("username: " + userName + " userPass: " + userPass);
		
		var pass = verbs.hash (user.pass + 'mrwheat');

		if (user.name === userName && pass === userPass) {
			debug ("authorized!");
			return next();
		} else {
			debug ("unauthorized!");
			return unauthorized(res);
		};
	}
}
