/**
 * jhtml.js - jhtml template engine for express, jhtml parser
 * looks for tags like <script type="text/javascript;server"> or <% %>
 * Special consideration is given to the args.skipHTML flag that is available to all embedded
 * scripts. If it is set to true from an embedded script, the renderer stops including text (HTML)
 * outside of script tags until the flag is again set to false. Useful for showing/hiding HTML based on
 * Javascript conditions.
 * module Jhtml
 * @file JHTML template handler
 * @author cshotton
 * @copyright Copyright ©2016, Chuck Shotton. All rights reserved.
 */
"use strict";

const appRoot = require ('app-root-path');
const debug = require('debug')('jhtml');
debug.log = console.info.bind(console); //https://github.com/visionmedia/debug#readme
const Verbs = require (appRoot + '/modules/verbs');
var verbs = new Verbs ();
const Scripts = require (appRoot + '/modules/scripts');
var scripts = new Scripts ();

//---------------------------------------------------

function Jhtml (cx) {
	if ( !(this instanceof Jhtml) ) {
		return new Jhtml ();
	}
	/*set instance vars here*/
	this.context = cx;
	debug ("Jhtml: " + this.context.initialized);
}

//---------------------------------------------------

	/*
	* process jhtml data from a string
	* param {object} context - the appropriate global context object 
	* param {string} theSource - jhtml source data to parse
	* param {object} options - Express options data structure passed to engines
	* returns {string} the rendered page with script execution results inserted
	*/
function processJHTML (context, theSource, options) {
	debug ("processJHTML: ");
	try {
		var openToken = ['<script type="text/javascript;server">','<%', '<\\?', '<script type="text/javascript" mode="server">'];
		var closeToken = ['</script>', '%>', '\\?>', '</script>'];
		var ix = 0;
		var rendered = "";
		var code = "";
		var scriptContext = null;
		var skipHTML = false;
		var source = theSource.toString();
		
		while (source !== null && source.length > 0) {
			//look for start tokens
			code = "";
			var bestIX = 9999999;
			var bestToken = -1;
			for (var j=0; j<openToken.length; j++) {
				ix = source.search (new RegExp (openToken[j], "i"));
				if (ix < bestIX && ix > -1) {
					bestIX = ix;
					bestToken = j;
				}
			}
			if (bestToken > -1)
				ix = bestIX;
			else
				ix = -1;
				
			if (ix > -1) {
				//add preceding text to results
				if (ix>0 && !skipHTML) {
					rendered += source.slice (0, ix);
				}
				//extract script and trim source
				source = source.slice (ix + openToken[bestToken].length);
		
				//look for the end of the source code
				ix = source.search (new RegExp (closeToken[bestToken], "i"));
				if (ix>0) {
					code = source.slice (0, ix);
					source = source.slice (ix + closeToken[bestToken].length);
				}
				else { //missing the closing tag, so the source must go to eof
					code = source.slice (0);
					source = null;
				}
					
				//run script
				if (code.length>0) {
					try {
//console.log ("options: " + JSON.stringify (options, null, 4));
						var args = {'req': options.req, 'res': options.res, 'next': options.next, 'options': options, 'skipHTML': skipHTML};
						var resultsObj = scripts.runScriptInContext (code, args, scriptContext);
						//add to rendered
						rendered += resultsObj.results;
						//save the updated context
						scriptContext = resultsObj.scriptContext;
						skipHTML = scriptContext.sandbox.args.skipHTML; //this is twisted -- the contextified sandbox is preserved after the first call and subsequent "args" are ignored by runScriptInContext if a context is passed.
					}
					catch (err) {
						debug ("Error running JHTML script: " + err);
					}
				}
			}
			else {
				//no (more) script tags found, so we are done
				if (!skipHTML)
					rendered += source;
				source = null;
			}
		}
		
		return rendered;
	}
	catch (err) {
		debug ("processJHTML err: " + err);
		return null;
	}
}
Jhtml.prototype.processJHTML = processJHTML;

//---------------------------------------------------

	/*
	* process a jhtml file from an odb attribute
	* param {object} context - the appropriate context object 
	* param {string} path - odb path to the jhtml attribute to parse
	* param {object} options - object containing at least the res/req objects from Express
	* returns {string} the rendered page with script execution results inserted
	*/
function processJHTMLODB (context, path, options) {
	debug ("processJHTMLODB " + path);
	
	var kind = context.odb.getAttributeKind (path);
	if (kind != "jhtml")
		return null;
		
	var src = context.odb.getAttribute (path);
	try {	
		return processJHTML (context, src, options);
	}
	catch (err) {
		debug ("processJHTMLODB " + err);
		return null;
	}
}
Jhtml.prototype.processJHTMLODB = processJHTMLODB;

//---------------------------------------------------

	/*
	* process a jhtml file from a file on disk
	* param {object} that - the parent Jhtml object (this) 
	* param {string} path - path to the jhtml file to parse
	* param {object} options - Express options data structure passed to engines
	* returns {string} the rendered page with script execution results inserted
	*/
function processJHTMLFile (that, path, options) {
	debug ("processJHTMLFile " + path);
//	var src = that.context.verbs.loadFile (path);
	var src = null;
	if (verbs.fileExists (path)) {
		src = verbs.loadFile (path);
	}
	else {
		debug ("processJHTMLFile: " + path + " does not exist.");
	}
	
	try {	
		return processJHTML (that, src, options);
	}
	catch (err) {
		debug ("processJHTMLFile err: " + err);
		return null;
	}
}

Jhtml.prototype.processJHTMLFile = processJHTMLFile;

//---------------------------------------------------

//https://expressjs.com/en/advanced/developing-template-engines.html
	/*
	* Express-type engine for processing .jhtml files with embedded Javscripts
	* returns {function} the parsing engine for use with Express.js
	*/
Jhtml.prototype.engine = function engine () {
	return function (filePath, options, callback) {
//console.log ('jhtml opts: ' + JSON.stringify (options._locals, null, 4));
		var results = processJHTMLFile (this, filePath, options);
		options.res.set('Content-Type', 'text/html');
		return callback (null, results);
	};
}


	/*
	* Express-type engine for processing .jcgi files with embedded Javscripts
	* returns {function} the parsing engine for use with Express.js
	*/
Jhtml.prototype.jcgiEngine = function jcgiEngine () {
	return function (filePath, options, callback) {			
		var results = processJHTMLFile (this, filePath, options);
		options.res.set('Content-Type', 'text/html');
		return callback (null, results);
	};
}


module.exports = Jhtml;