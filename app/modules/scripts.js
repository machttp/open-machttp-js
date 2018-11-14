/**
 * scripts.js - commands used by scripts to execute other scripts
 * @module Scripts
 * @file commands used by scripts to execute other scripts
 * @author cshotton
 * @copyright Copyright ©2016, Chuck Shotton. All rights reserved.
 */
"use strict";
 	const appRoot = require ('app-root-path');
	const vm = require('vm');
	const cx = require (appRoot + '/modules/context').context;
	var verbs = cx.verbs;
	var odb = cx.odb;
	const DEBUG = require ('debug');
	const debug = DEBUG('scripts');
//	debug.log = console.info.bind(console); //https://github.com/visionmedia/debug#readme
	const scriptDebug = DEBUG ('scripts:user');
//	scriptDebug.log = console.info.bind(console);
	DEBUG.log = console.info.bind (console);

 /**
  * Collection of script execution functions
  * @constructor
  */
	function Scripts () {
		if ( !(this instanceof Scripts) ) {
			return new Scripts ();
		}
 	
 	/*set instance vars here*/
 	}
 
	/**
	* run a script from a string in a new context
	* @param {string} code - the code to run 
	* @param {string} vargs - arguments to pass in the args sandbox parameter
	* @returns {object} the results object from the execution sandbox
	*/
	Scripts.prototype.runScript = function runScript (src, vargs) {
		try {
			var sandbox = {
				debug : scriptDebug,
				require: require,
				console: console,
				setTimeout: setTimeout, //could be bad
				clearTimeout: clearTimeout,
				setInterval: setInterval, // could be worse
				clearInterval: clearInterval,
				process: process,
				scripts: this,
				context: cx,
				args: vargs,
				results: null
			};
			
			var jscontext = vm.createContext (sandbox);
//			debug ("runScript runInContext being called");
			var res = vm.runInContext (src, jscontext);
//			debug ("runScript runInContext completed");
			if (res === undefined) {
//				debug ("runScript null results, returning sandbox.results instead.")
				res = sandbox.results;
			}
			return res;
		}
		catch (err) {
			debug ("runScript: error - " + JSON.stringify (err));
			return null;
		}
	}
		
	/**
	* run a script from a string in the provided context, returning the modified context
	* in a new object of the form {'results' : results, 'scriptContext' : scriptContext}.
	* Subsequent calls should pass obj.scriptContext as the 3rd parameter to preserve the
	* previous execution context.
	* NOTE! vargs are used to populate the initial context if scriptContext is null. 
	* If scriptContext is passed, its args persist and the passed vargs are ignored.
	* @param {string} code - the code to run 
	* @param {string} vargs - arguments to pass in the args sandbox parameter
	* @param {sstring} scriptContext - the node.js javascript context to run in. null means create new
	* @returns {object} the results object from the execution sandbox, including the context used
	*/
	Scripts.prototype.runScriptInContext = function runScriptInContext (src, vargs, scriptContext) {
		try {
			var sandbox = {
				debug : scriptDebug,
				require: require,
				console: console,
				setTimeout: setTimeout, //could be bad
				clearTimeout: clearTimeout,
				setInterval: setInterval, // could be worse
				clearInterval: clearInterval,
				process: process,
				scripts: this,
				context: cx,
				args: vargs,
				results: null
			};
			
			var jscontext = {};
			if (scriptContext === null) {
				jscontext.sandbox = sandbox;
				jscontext.scriptContext = vm.createContext (jscontext.sandbox);
				debug ("making new context");
			}
			else {
				jscontext = scriptContext;
				debug ("reusing old context");
			}
			var res=vm.runInContext (src, jscontext.scriptContext);
			return {'results': res, 'scriptContext' : jscontext};
		}
		catch (err) {
			debug ("runScriptInContext: error - " + JSON.stringify (err));
			return null;
		}
	}
		
	/**
	* run a script from the main ODB in a new context
	* @param {string} path - the ODB path to code to run 
	* @param {string} vargs - arguments to pass in the args sandbox parameter
	* @returns {object} the results object from the execution sandbox
	*/
	Scripts.prototype.runScriptODB = function runScriptODB (path, vargs) {
		try {
			var src = odb.getAttribute (path);
			return this.runScript (src, vargs);
		}
		catch (err) {
			debug ("runScriptODB: error - " + JSON.stringify (err));
			return null;
		}
	}
		
	/**
	* run a script from a file in a new context
	* @param {string} fname - the file containing code to run 
	* @param {string} vargs - arguments to pass in the args sandbox parameter
	* @returns {object} the results object from the execution sandbox
	*/
	Scripts.prototype.runScriptFile = function runScriptFile (fname, vargs) {
		try {
			var src = verbs.loadFile (fname);
			return this.runScript (src, vargs);
		}
		catch (err) {
			debug ("runScriptFile: error - " + JSON.stringify (err));
			return null;
		}
	}
		
		
	
	Scripts.prototype.test = function test () {
		debug ("running script tests...");
		var src = `
			debug ('inside script: ' + JSON.stringify (args) + ', base64: ' + cx.verbs.encodeBase64 ('encoded!'));
			results=args.answer+1;
			console.log ("inside script, returning results: " + JSON.stringify (results));
		`;
		var args = {some : 'arguments', other: 'values', answer: 42};
		var res = this.runScript (src, args);
		debug ("test: runScript - args passed: " + JSON.stringify(args) + "\n\t\tresults = " + JSON.stringify (res));
		
		odb.setAttribute ("temptestscript99", "script", src);
		res = this.runScriptODB ("temptestscript99", args);
		debug ("test: runScriptODB - args passed: " + JSON.stringify(args) + "\n\t\tresults = " + JSON.stringify (res));
		
		verbs.saveFile ("script.js", src);
		res = this.runScriptFile ("script.js", args);
		debug ("test: runScriptFile - args passed: " + JSON.stringify(args) + "\n\t\tresults = " + JSON.stringify (res));
		
		//cleanup
		verbs.deleteFile ("script.js");
		odb.deleteAttribute ("temptestscript99");
	};


	module.exports = Scripts;