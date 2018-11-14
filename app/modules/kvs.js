/**
 * kvs.js - utility module to manage global kvs store for holding on to javascript objects for transient scripts
 * module kvs
 * @file global key value store
 * @author cshotton
 * @copyright Copyright ©2016, Chuck Shotton. All rights reserved.
 */
"use strict";

var kvs = new Object ();

module.exports.get = function (name) {
		return kvs [name];
	}
	
module.exports.set = function (name, val) {
		kvs [name] = val;
	}
	
module.exports.delete = function (name) {
		try {
			delete kvs [name];
		} catch (err) {
			console.log ("Can't delete kvs item " + name + ": " + err);
		}
	}
