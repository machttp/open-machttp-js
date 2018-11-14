/**
 * odbRoute.js - Express route for odbRoute. debug with odbAPI
 * @module routes/odbGetAttribute
 * @file Express route for odbRoute. debug with odbAPI
 * @author cshotton
 * @copyright Copyright ©2016, Chuck Shotton. All rights reserved.
 */
"use strict";
 
 	const appRoot = require ('app-root-path');
	const debug = require('debug')('odbRoute');
	debug.log = console.info.bind(console); //https://github.com/visionmedia/debug#readme

	var express = require('express');
	var router = express.Router();
	var cx = require (appRoot + '/modules/context');
	var odb = cx.context.odb;
//	var stats = cx.context.stats;
	
	var Scripts = require (appRoot + '/modules/scripts');
	var scripts = new Scripts ();
	var Jhtml = require (appRoot + '/modules/jhtml');
	var jhtml = new Jhtml (cx);
		
	router.all ('/*?', function (req, res, next) {
//		stats.openConnection ();
		var path = req.params[0];
		var kind = odb.getAttributeKind (path);
		debug ("odbGetAttribute: path=" + path);
		debug ("odbGetAttribute: kind=" + kind);
		var content = odb.getAttribute (path);
		var mimetype = "text/plain";
		
		var action = odb.getAttribute ("system/types/" + kind + "/action");
		if (action != null) {
			mimetype = odb.getAttribute ("system/types/" + kind + "/mimetype");
			if (mimetype === null) {
				mimetype = "text/plain";
			}
		}
		
		if (content == null) {
			res.writeHead(404);
// 			stats.closeConnection (true);
			return res.end("File not found.");
		}
		else {
			var handled = false;
			
			switch (action) {
				case "parse":
					res.setHeader ("Content-Type", mimetype);
					res.writeHead (200);
					return res.end (jhtml.processJHTML (cx, content, {'res': res, 'req': req}));
					break;

				case "file":
					res.setHeader ("Content-Type", mimetype);
					res.writeHead (200);
// 					stats.closeConnection (false);
					return res.end (content);
					break;
					
				case "execute":
					var args = {"req": req, "res": res, "next" : next};
					debug ("odbRoute: execute action");
					content = scripts.runScript (content, args);
					try {
						if (content.handled) {
							debug ("odbRoute: script handled returning results");
							handled = true;
//							stats.closeConnection (false);
						}
						else {
							debug ("odbRoute: script didn't handle results");
						}
					}
					catch (err) {
						debug ("odbRoute: unhandled javascript error");
					}
					if (!handled) {
						debug ("odbRoute: returning unhandled javascript response");
						res.setHeader ("Content-Type", mimetype);
						res.writeHead (200);
// 						stats.closeConnection (false);
						return res.end (content);
					}		
					break;
					
				default:
					debug ("odbRoute: unknown action " + action);
// 					stats.closeConnection (true);
					res.writeHead(500);
					return res.end("Undefined action for requested object. " + action);
					break;					
			} //switch		
		} //else
		
		if (!handled) {
			debug ("odbRoute: unhandled request");
// 			stats.closeConnection (true);
			res.writeHead(500);
			return res.end("Unhandled request.");
		}
	});
	
	module.exports = router;