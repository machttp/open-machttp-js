/**
 * 
 * @file userAction.js
 * @author cshotton
 * @copyright Copyright ©2016, Chuck Shotton. All rights reserved.
 */
"use strict";
var appRoot = require ('app-root-path');
const debug = require('debug')('userActions');
var globalContext = require (appRoot + '/modules/context').context;
var actions = require (appRoot + '/modules/actions');
var odb = globalContext.odb;
var verbs = globalContext.verbs;
var Scripts = require (appRoot + "/modules/scripts");
var scripts = new Scripts(globalContext);

var app = null;

module.exports.init = function (eapp) {
	app = eapp; //save the express app locally
	
	var actionsList = actions.listActions ();
	
	for (var i=0; i<actionsList.length; i++) {
		debug ("Creating user action: " + actionsList [i]);
		var act = actions.get1Action (actionsList [i]);
		var af = actionFactory (act);
		debug ("Creating user action: " + act.name + ", " + act.path);
		app.use (act.path, af);
	}
}


function actionFactory (act) {

	return function (req, res, next) {
	
		var args = {"req": req, "res": res, "next" : next, 'action': act, 'app': app};
		var src = null;
		
		debug ("name: " + act.name + " path: " + act.path + " script: " + act.script);
		
		try {
			if (verbs.fileExists (act.script)) {
//				debug ("running script " + act.script + "\n");
				var x = scripts.runScriptFile (act.script, args); //actions have to handle the entire transaction or return next ()
	//			debug ("ran script");
				return x;
			}
			else {
				debug ("action script not found");
				res.status(500);
				return res.render('error', {
					'req':req, 
					'res':res,
					'status': 500,
					message: "Action script file not found",
					error: null
				});
			}
		}
		catch (err) {
			debug ("error : " + JSON.stringify (err));
		}
	}
}
