/**
 * context.js - global context object passed to scripts and other methods
 * @module context
 * @file context.js - global context object passed to scripts and other methods
 * @author cshotton
 * @copyright Copyright ©2016, Chuck Shotton. All rights reserved.
 */
"use strict";
 	const appRoot = require ('app-root-path');
 	const appVersion = require(appRoot + '/package.json').version;
//	const appVersion = "0.16.0";
	const appName = require(appRoot + '/package.json').name;
//	const appName = "MacHTTP-js";
	const copyright = "MacHTTP-js " + appVersion + "\nCopyright 2016, Chuck Shotton. All rights reserved."
	
	module.exports.appVersion = appVersion;
	module.exports.appName = appName;
	module.exports.copyright = copyright;
	
 	const odbName = "/machttp-js.odb";
 	
	const winston = require ('winston');

	const debug = require('debug')('context');
	debug.log = console.info.bind(console); //https://github.com/visionmedia/debug#readme
	const ODB = require (appRoot + '/modules/odb');
	const Verbs = require (appRoot + '/modules/verbs');
	var Stats = require (appRoot + '/modules/stats');
	
/**
 * @namespace
 * @property {string} appName - the name of the parent application
 * @property {string} appVersion - the version number of the parent application
 * @property {module:ODB~ODB} odb - the ODB instantiated in this context
 * @property {module:Verbs~Verbs} verbs - the verbs object instantiated in this context
 * @property {module:Stats~Stats} stats - the stats object instantiated in this context
 * @property {object} logger - the winston logger object instantiated in this context
 * @property {boolean} hasGUI - flag indicating if the parent application has an Electron GUI
 * @property {boolean} initialized - flag indicating whether this context has been properly initialized
 */	
	var context = {
		'appName' : appName,
		'appVersion' : appVersion,
		'cmdOpts' : null,
		'odb' : null,
		'verbs' : null,
		'stats' : null,
		'logger': null,
		'hasGUI' : (typeof process.versions['electron'] !== "undefined"),
		'initialized' : false,
		'developmentMode' : false, //from NODE_ENV
		'firstRun' : false		//is this the first time the app has run (from new ODB)?
	};
	
	module.exports.context = context;
	
	function getODBPath () {
		var home = ".";
		try {
			home = process.env.HOME;
			if (home === undefined || home == "" || home == null || home.length==0) {
				home = ".";
			}
			if (context.cmdOpts !== null && context.cmdOpts.odb !== null && context.cmdOpts.odb !== undefined) {
console.log ("Opening alternate ODB at " + context.cmdOpts.odb);
				return context.cmdOpts.odb;
			}
			else
				return home + odbName;
		}
		catch (err) {
			return home + odbName;
		}
	}
	
	function CloneODB (cx) {
		var staticPath = appRoot + odbName;
		var clonedPath = getODBPath();
		
		var jsonText = cx.verbs.loadFile (staticPath);
		cx.verbs.saveFile (clonedPath, jsonText);
		cx.odb = new ODB (clonedPath);
	}
	
	module.exports.init = function init (cmdOpts) {
		console.log ("## " + process.argv0 + ": context initialized: " + context.initialized);
		if (!context.initialized) {
			try {
				//figure out the runtime modes
				context.developmentMode = (process.env.NODE_ENV === "development");
				if (!context.developmentMode) {
					process.env.NODE_ENV = "production"; //set this so Express knows to do smart performance things
				}
				context.cmdOpts = cmdOpts; //save our command line args
				context.initialized = true;
		// Define levels to be like log4j in java
				var customLevels = {
					levels: { error: 0, warn: 1, info: 2, script: 3, verbose: 4, debug: 5 },
					colors: {
						error: 'red',
						warn: 'yellow',
						info: 'green',
						script: 'grey',
						verbose: 'cyan',
						debug: 'blue'
					}
				};		
//				context.logger = new (winston.Logger)({
				context.logger = winston.createLogger({
					levels: customLevels.levels,
					transports: [new (winston.transports.Console)({
						colorize: true,
						level: 'debug'
					})]
				});
				winston.addColors (customLevels.colors); //{
				context.verbs = new Verbs ();
				context.odb = new ODB (getODBPath());
				context.stats = new Stats ();
			
				if (!context.odb.attributeHasChildren ("/")) {
					// no ODB was found. This one was empty, so fill it up with defaults
					CloneODB (context);
				}
				
				//see if this is the first run
				context.firstRun = (context.odb.getAttribute ("system/config/isNew") === "1");

				debug ('init: ' + JSON.stringify (context.odb));
				return context;
			}
			catch (err) {
				console.log ("Error initializing context: " + err);
				return null;
			}
		}
		else
			return context;
	};