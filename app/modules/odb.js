/**
 * odb.js - basic object database functions for an in-memory hierarchical store
 * @module ODB
 * @file basic object database functions for an in-memory hierarchical store
 * @author cshotton
 * @copyright Copyright ©2016, Chuck Shotton. All rights reserved.
 */
"use strict";

 	const appRoot = require ('app-root-path');
	const debug = require('debug')('odb');
	debug.log = console.info.bind(console); //https://github.com/visionmedia/debug#readme
	const Verbs = require (appRoot + '/modules/verbs');
	var verbs = new Verbs ();
	
	const ODB_VERSION = "1.0";
	
	//-------------------------------------------------------------------------
	/**
	* functions for accessing object databases
	* @constructor
	* @param {string} path - the node-compatible path to the ODB file
	*/
	function ODB (path) {
		if ( !(this instanceof ODB) ) {
			return new ODB (path);
		}

	 	/*set instance vars here*/
 		this.path = path;
 		
 		if (path == undefined || path == null || path == "") {
 			//initialize the ODB with some default values
 			this.odb = newODB ('');
 		}
 		else {
 			//try to load the ODB from the specified path
 			try {
 				this.odb = loadODB (path);
  			}
 			catch (err) {
 				debug ("ODB constructor, path not found. " + path + ": " + err);
 			}
  		}
 	}
 
	//-------------------------------------------------------------------------
	/* *
	* internal - create an empty ODB node object
	* @param {string} name - name of the object
	* @param {string} kind - kind of object
	* @param {string} value - value of the object
	* @returns {object} node - new ODB node
	*/
	function newODBNode (name, kind, value) {
		var node = {
			'name' : name,
			'kind' : kind,
			'value': value,
			'children': {}
		};
		
		return node;
	}
	
	//-------------------------------------------------------------------------
	/* *
	* create an empty ODB object
	* @param {string} name - name of the object
	* @returns {object} odb - a new odb object
	*/
	function newODB (name) {
		var odb = {
			'name' : name,
			'version' : ODB_VERSION,
			'modDate': new Date(),
			'odb': newODBNode ('', 'odb', null)
		};
 		
 		return odb;
	}
	
	//-------------------------------------------------------------------------
	/* *
	* Load the entire contents of an ODB file and return
	* @param {string} path - the node-compatible path to the file
	* @returns {object} data - the parsed JSON contents of the ODB file on disk
	*/
	function loadODB (path) {
		var fodb = null;
		try {
			var data = verbs.loadFile (path);
 			if (data != null) {
 				try {
 					fodb = JSON.parse (data);
 				}
 				catch (err) {
 					debug ("loadODB, JSON parse failed. " + err);
 					fodb = newODB (path);
 				}
 			}
 			else {
 				fodb = newODB (path);
 			}
			debug ("loadODB completed.");
			return fodb;
		}
		catch (err) {
			debug ("Error loadODB " + path + ": " + err);
			return fodb;
		}
	}; 
 
	//-------------------------------------------------------------------------
	/**
	* Save the entire ODB to the file path it was instantiated with and return
	* @param {string} [path] - alternative path to save ODB to. Defaults to internal path if omitted.
	* @returns {boolean} success - true or false indicating success or failure
	*/
	ODB.prototype.saveODB = function saveODB (path) {
		var thePath = this.path;
		try {
			if (path !== null && path !== undefined) {
				thePath = path;
			}
			this.odb.modDate = new Date();
			verbs.saveFile (thePath, JSON.stringify (this.odb, null, 4));
			debug ("saveODB completed.");
			return true;
		}
		catch (err) {
			debug ("Error saveODB " + thePath + ": " + err);
			return false;
		}
	}; 

	//-------------------------------------------------------------------------
	/**
	* Export the entire ODB or a branch to a file and return
	* @param {string} path - the node-compatible path to the file
	* @param {string} branch - the ODB path to the container branch to export
	* @returns {boolean} success - true or false indicating success or failure
	*/
	ODB.prototype.exportODB = function exportODB (path, branch) {
		var baseObj = this.odb;
		var thePath = this.path;
		try {
			
			if (branch == "" || branch == "/" || branch === null) {
				this.odb.modDate = new Date();
			}
			else {
				baseObj = this.getObject (branch);
				thePath = path;
			}
			verbs.saveFile (thePath, JSON.stringify (baseObj, null, 4));
			debug ("exportODB completed.");
			return true;
		}
		catch (err) {
			debug ("Error exportODB " + thePath + ": " + err);
			return false;
		}
	}; 

	//-------------------------------------------------------------------------
	/**
	* Get an object's parent object in the ODB
	* @param {string} path - path to the object, slash delimited
	* @returns {object} obj - the parent object of the object at path
	*/
	ODB.prototype.getParentObject = function getParentObject (path) {
		try {
			var names = path.split ("/");
			var o = this.odb.odb;
			if (path == "/" || path == "" || path == null)
				return null; //top level, no parent
				
			for (var i=0; i<names.length-1; i++) {
				debug ("getParentObject: " + names[i]);
				if (o != null) {
					o = o.children[names[i]];
				}
				else {
					return null;
				}
			}
			return o;
		}
		catch (err) {
			debug ("Error getObject: " + path + " " + err);
			return null;
		}
	}
 
	//-------------------------------------------------------------------------
	/**
	* Get an object in the ODB
	* @param {string} path - path to the object, slash delimited
	* @returns {object} obj - the object at path
	*/
	ODB.prototype.getObject = function getObject (path) {
		try {
			var names = path.split ("/");
			var o = this.odb.odb;
			if (path == "/" || path == "" || path == null)
				return o;
				
			for (var i=0; i<names.length; i++) {
				debug ("getObject: " + names[i]);
				if (o != null) {
					o = o.children[names[i]];
				}
				else {
					return null;
				}
			}
			return o;
		}
		catch (err) {
			debug ("Error getObject: " + path + " " + err);
			return null;
		}
	}
 
	//-------------------------------------------------------------------------
	/**
	* Get an object tree from the ODB as JSON text
	* @param {string} path - path to the object, slash delimited
	* @returns {string} json - the object at path recursively rendered as json text
	*/
	ODB.prototype.getObjectJSON = function getObjectJSON (path) {
		try {
			var names = path.split ("/");
			var o = this.odb.odb;
			var json = "{}";
			
			if (path == "/" || path == "" || path == null) {
				json = JSON.stringify (o, null, 4);
				return json;
			}
				
			for (var i=0; i<names.length; i++) {
				debug ("getObject: " + names[i]);
				if (o != null) {
					o = o.children[names[i]];
				}
				else {
					return json;
				}
			}
			json = JSON.stringify (o, null, 4);
			return json;
		}
		catch (err) {
			debug ("Error getObject: " + path + " " + err);
			return null;
		}
	}
 
	//-------------------------------------------------------------------------
 
 	function encodeIfNeeded (value, kind) {
 		return verbs.encodeBase64 (value);
		switch (kind) {
			case 'js':
			case 'javascript':
			case 'script':
			case 'binary':
			case 'base64':
				return verbs.encodeBase64 (value);
				break;
				
			default:
				return value;
		} 	
 	}
 	
 	function decodeIfNeeded (value, kind) {
 		return verbs.decodeBase64 (value);
		switch (kind) {
			case 'js':
			case 'javascript':
			case 'script':
			case 'binary':
			case 'base64':
				return verbs.decodeBase64 (value);
				break;
				
			default:
				return value;
		} 	
 	}
 
	//-------------------------------------------------------------------------
	/**
	* Get an attribute in the ODB
	* @param {string} path - path to the attribute, slash delimited
	* @returns {string} value - value of the attribute
	*/
	ODB.prototype.getAttribute = function getAttribute (path) {
		var o = this.getObject (path);
		if (o != null) {
			var v = decodeIfNeeded (o.value, o.kind);
			return v;
		}
		else {
			debug ("Error getAttribute: not found: " + path);
			return null;
		}
	}
 
	//-------------------------------------------------------------------------
	/**
	* Get the kind of an attribute in the ODB
	* @param {string} path - path to the attribute, slash delimited
	* @returns {string} kind - kind of the attribute
	*/
	ODB.prototype.getAttributeKind = function getAttributeKind (path) {
		var o = this.getObject (path);
		if (o != null) {
			var k = o.kind;
			return k;
		}
		else {
			return null;
		}
	}
 
	//-------------------------------------------------------------------------
	/**
	* Get the children of an attribute in the ODB
	* @param {string} path - path to the attribute, slash delimited
	* @returns {array} children - children of the attribute
	*/
	ODB.prototype.getAttributeChildren = function getAttributeChildren (path) {
		var o = this.getObject (path);
		if (o != null) {
			return Object.keys (o.children);
		}
		else {
			return null;
		}
	}
 
	//-------------------------------------------------------------------------
	/**
	* does the attribute have children?
	* @param {string} path - path to the attribute, slash delimited
	* @returns {boolean} children - are there children of the attribute
	*/
	ODB.prototype.attributeHasChildren = function attributeHasChildren (path) {
		var o = this.getObject (path);
		if (o != null) {
			return Object.keys (o.children).length > 0;
		}
		else {
			return false;
		}
	}
 
	//-------------------------------------------------------------------------
	/**
	* Set an attribute in the ODB
	* @param {string} path - path to the attribute, slash delimited
	* @param {string} kind - data type for the attribute
	* @param {string} value - value of the attribute
	*/
	ODB.prototype.setAttribute = function setAttribute (path, kind, value) {
		try {
			var names = path.split ("/");
			var o = this.odb.odb;
			for (var i=0; i<names.length; i++) {
				debug ("setAttribute: " + names[i]);
				var child = null;
				if (o != null) {
					child = o.children[names[i]];
					if (child == null) {
						if (i==(names.length-1)) {
							debug ("setAttribute: creating attr " + names[i]);
							child = newODBNode (names [i], kind, encodeIfNeeded(value, kind));
						}
						else {
							debug ("setAttribute: creating container " + names[i]);
							child = newODBNode (names [i], 'container', null);
						}
						o.children[names[i]] = child;
					}
					else if (i==(names.length-1)) { //set an existing attribute
						child.kind = kind;
						child.value = encodeIfNeeded (value, kind);
					}
					o = child;
				}
			}
		}
		catch (err) {
			debug ("Error getObject: " + path + " " + err);
			return null;
		}
	}
 
	//-------------------------------------------------------------------------
	/**
	* Delete an attribute from the ODB
	* @param {string} path - path to the attribute, slash delimited
	* @returns {boolean} success flag
	*/
	ODB.prototype.deleteAttribute = function deleteAttribute (path) {
		try {
			var names = path.split ("/");
			var o = this.odb.odb;
			for (var i=0; i<(names.length-1); i++) {
				debug ("deleteAttribute: " + names[i]);
				if (o != null) {
					o = o.children[names[i]];
				}
				else {
					debug ("deleteAttribute: attr not found, " + path);
					return false;
				}
			}
			//o should be pointing at the parent now
			debug ("deleteAttribute: deleting " + names[names.length-1]);
			delete o.children[names[names.length-1]];
			return true;
		}
		catch (err) {
			debug ("Error deleteAttribute: " + path + " " + err);
			return false;
		}
	}
 
	//-------------------------------------------------------------------------
 	/**
 	 * Test Verbs functions
 	 * execute with DEBUG=verbs node ./bin/www.js
 	 */ 	 
	ODB.prototype.test = function test () {
 	
		debug ("test : running automated tests");
 	 	debug (JSON.stringify (this.odb, null, 4));
 	 	
 	 	this.setAttribute ("a/b/c", "string", "this is a test!!!");	
	 	this.setAttribute ("a/b/d", "base64", "this is another test!!!");	
	 	debug (JSON.stringify (this.odb, null, 4));
	 	debug ("decoded attr: " + this.getAttribute ("a/b/d"));
	 	
	 	debug ("children of a/b: " + JSON.stringify(this.getAttributeChildren("a/b")));
	 	
	 	this.deleteAttribute ("a/b/c");
	 	debug (JSON.stringify (this.odb, null, 4));
	 	this.deleteAttribute ("a");
	 	
 	 	debug ("test : saveODB: " + this.saveODB());
	};
 
	module.exports = ODB;