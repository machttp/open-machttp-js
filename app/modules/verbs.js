/**
 * verbs.js - standard commands used by scripts for O/S level functions
 * @module Verbs
 * @file standard commands used by scripts for O/S level functions
 * @author cshotton
 * @copyright Copyright ©2016, Chuck Shotton. All rights reserved.
 */
"use strict";
	
 	const appRoot = require ('app-root-path');
	const fs = require('fs');
	const pstat = require ('pstat');
	const crypto = require ('crypto');
	const openr = require ("opener");	//browser URL opener
	const chokidar = require ('chokidar'); //folder watcher
	const mkdirp = require ('mkdirp');
	const suspend = require ('suspend');
	const resume = suspend.resume;
	const DEBUG = require ('debug');
	const debug = DEBUG('verbs');
	const serDebug = DEBUG('verbs:serial');
	const kvs = require (appRoot + '/modules/kvs');
	var EventEmitter = require("events").EventEmitter;
  	
	DEBUG.log = console.info.bind (console);

	var isElectron = (typeof process.versions['electron'] !== "undefined");
	var electron = null;
	var dialog = null;
	var ipcMain = null;
	var nativeImage = null;
	var BrowserWindow = null;  // Module to create native browser window.
	if (isElectron) {
		electron = require('electron');
		dialog = require('electron').dialog;
		ipcMain = require ('electron').ipcMain;
		nativeImage = require('electron').nativeImage;
		BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
	}
	
 /**
  * Collection of O/S level functions
  * @constructor
  */
	function Verbs () {
		if ( !(this instanceof Verbs) ) {
			return new Verbs ();
		}
 	
 	/*set instance vars here*/
 		this.kvs = kvs; //sneaking this in here for scripts to use
 		
// 		this.serEmitter = new EventEmitter();
// 		this.serEmitter.on ("serOpen", serOpen);
// 		this.serEmitter.on ("serWrite", serWrite);
// 		this.serEmitter.on ("serClose", serClose);
 	}
 
  /**
   * Load the entire contents of a file and return
   * @param {string} path - the node-compatible path to the file
   * @returns {string} data - the contents of the file
   */
	Verbs.prototype.loadFile = function loadFile (path) {
		var data = "";
		try {
			data = fs.readFileSync (path);
			debug ("loadFile completed.");
			return data;
		}
		catch (err) {
			debug ("Error loadFile " + path + ": " + err);
			return data;
		}
	}; 
 
  /**
   * Save the entire contents of a file
   * @param {string} path - the node-compatible path to the file
   * @param {string} data - data to save to the file
   */
	Verbs.prototype.saveFile = function saveFile (path, data) {
		try {
			fs.writeFileSync (path, data);
			debug ("saveFile completed.");
		}
		catch (err) {
			debug ("Error saveFile " + path + ": " + err);
		}
	}; 
 
  /**
   * check for file existence
   * @param {string} path - the node-compatible path to the file
   * @returns {boolean} 
   */
	Verbs.prototype.fileExists = function fileExists (path) {
		try {
			return pstat.isFileSync (path);
			//fs.accessSync (path, fs.F_OK);
			//debug ("fileExists completed. true");
			//return true;
		}
		catch (err) {
			debug ("fileExists false, " + path + ": " + err);
			return false;
		}
	}; 
 
  /**
   * check for directory existence
   * @param {string} path - the node-compatible path to the directory
   * @returns {boolean} 
   */
	Verbs.prototype.dirExists = function dirExists (path) {
		try {
			return pstat.isDirSync (path);
		}
		catch (err) {
			debug ("dirExists false, " + path + ": " + err);
			return false;
		}
	}; 
 
  /**
   * delete a file and return
   * @param {string} path - the node-compatible path to the file
   */
	Verbs.prototype.deleteFile = function deleteFile (path) {
		try {
			fs.unlinkSync (path);
			debug ("deleteFile completed.");
		}
		catch (err) {
			debug ("Error deleteFile " + path + ": " + err);
		}
	}; 
 
  /**
   * create a directory and return
   * @param {string} path - the node-compatible path to the directory
   */
	Verbs.prototype.mkdir = function mkdir (path) {
		try {
			mkdirp.sync (path);
			debug ("mkdir completed.");
		}
		catch (err) {
			debug ("Error mkdir " + path + ": " + err);
		}
	}; 
 
  /**
   * list a directory's contents
   * @param {string} path - the node-compatible path to the directory
   * @returns {array} list - an array of the contents of the directory
   */
	Verbs.prototype.readdir = function readdir (path) {
		try {
			return fs.readdirSync (path);
			debug ("readdir completed.");
		}
		catch (err) {
			debug ("Error mkdir " + path + ": " + err);
		}
		return [];
	}; 
 
  /**
   * recursively delete a directory and return
   * @param {string} dir - the node-compatible path to the directory
   */
	Verbs.prototype.rmdir =	function rmdir(dir) {
		var currentDirToRead,
			directoriesFound,
			nextDirToReadIndex;

		if (!fs.existsSync(dir)) {
			debug ("rmdir " + dir + " doesn't exist.");
			return;
		}

		currentDirToRead = dir;
		directoriesFound = [dir];
		while (true) {
			fs.readdirSync(currentDirToRead).forEach(function(name) {
				var path = currentDirToRead+'/'+name;
				var stat = fs.lstatSync(path);
				if (stat.isDirectory()) {
					directoriesFound.push(path);
				} else {
					fs.unlinkSync(path);
				}
			});
			nextDirToReadIndex = directoriesFound.indexOf(currentDirToRead) + 1;
			if (nextDirToReadIndex >= directoriesFound.length) {
				break;
			}
			currentDirToRead = directoriesFound[nextDirToReadIndex];
		}

		directoriesFound.reverse();
		directoriesFound.forEach(function(path) {
			fs.rmdirSync(path);
		});
		debug ("rmdir completed.");
	}

  /**
   * watch a folder for changes
   * @param {string} folder - the node-compatible path to the folder
   * @param {string} script - the ODB path to the script to run when changes happen
   * @returns {object} watcher - the handle to the folder watcher
   */
   

	Verbs.prototype.watchFolder = function watchFolder (folder, script) {
		try {
			debug ("watchFolder invoked.");
			var Scripts = require ('./scripts');
			scripts = new Scripts ();
			var watcher = chokidar.watch (folder, {ignored: /[\/\\]\./}).on('all', (event, path) => {
				try {
					debug ("watchFolder " + event + " path: " + path);
					//debug ("watchFolder watcher = " + JSON.stringify (watcher.getWatched(), null, 4));
					if (script != null)
						scripts.runScript (script, {"event": event, "path" : path});
				}
				catch (e) {
					debug ("watchFolder even handler failed: " + e);
				}
			});
			kvs.set ("watcher_" + folder, watcher);
			return folder;
		}
		catch (err) {
			debug ("watchFolder error " + err);
			return null;
		}
	}; 

  /**
   * unwatch a folder
   * @param {string} folder - the node-compatible path to the folder
   */

	Verbs.prototype.unwatchFolder = function unwatchFolder (folder) {
		var watcher = kvs.get ("watcher_" + folder);
		try {
			debug ("unwatchFolder invoked.");
			if (watcher != null)
				watcher.unwatch (folder);
			else
				debug ("unwatchFolder fails. null watcher passed in.");
		}
		catch (err) {
			debug ("unwatchFolder error " + err);
		}
		kvs.delete ("watcher_" + folder);
	}; 
 
	/**
	* base64 encode a string
	* @param {string} data - the data to encode
	* @returns {string} encoded - the base64 encoded data
	*/
	Verbs.prototype.encodeBase64 = function encodeBase64 (data) {
		try {
			return new Buffer (data).toString('base64');
		}
		catch (err) {
			return null;
		}
	}
		
	/**
	* base64 decode a string
	* @param {string} data - the data to decode
	* @returns {string} decoded - the base64 decoded data
	*/
	Verbs.prototype.decodeBase64 = function decodeBase64 (data) {
		try {
			return new Buffer (data, 'base64').toString('utf8');
		}
		catch (err) {
			return null;
		}
	}
		

	/**
	* create a hash of a string, using MD5 by default
	* @param {string} data - the data to encode
	* @param {string} [algorithm=md5] - the openssl-compatible digest algorithm
	* @returns {string} encoded - the hex encoded hash/checksum
	*/
	Verbs.prototype.hash = function hash (data, alg) {
		var theAlg = null;
		if (alg === null || alg === undefined || alg == "")
			theAlg = 'md5';
		else
			theAlg = alg;
		return crypto.createHash (theAlg).update(data).digest("hex");
	}


	/**
	* encrypt a string, using aes-256-cbc by default
	* @param {string} data - the data to encrypt
	* @param {string} key - encryption key
	* @param {string} [alg=aes-256-cbc] - the openssl-compatible encryption algorithm
	* @returns {string} encrypted - the hex encrypted text
	*/
	Verbs.prototype.encrypt = function encrypt (data, key, alg) {
		var theAlg = null;
		if (alg === null || alg === undefined || alg == "")
			theAlg = 'aes-256-cbc';
		else
			theAlg = alg;
		var cipher = crypto.createCipher (theAlg, key);
		var out = cipher.update (data, 'utf8', 'hex');
		out += cipher.final ('hex');
		return out;
	}

	/**
	* decrypt a string, using aes-256-cbc by default
	* @param {string} data - the data to decrypt
	* @param {string} key - encryption key
	* @param {string} [alg=aes-256-cbc] - the openssl-compatible encryption algorithm
	* @returns {string} decrypted - the decrypted text
	*/
	Verbs.prototype.decrypt = function decrypt (data, key, alg) {
		var theAlg = null;
		if (alg === null || alg === undefined || alg == "")
			theAlg = 'aes-256-cbc';
		else
			theAlg = alg;
		var decipher = crypto.createDecipher (theAlg, key);
		var out = decipher.update (data, 'hex', 'utf8');
		out += decipher.final ('utf8');
		return out;
	}

	/**
	* open a URL in a new browser window on the local host
	* @param {string} url - the url to open
	*/
	Verbs.prototype.openURL = function openURL (url) {
		try {
			openr (url); 
		}
		catch (err) {
			debug ("openURL err: " + err);
		}
	}
		
	/**
	* open a native window on the server that hosts a specific script/page
	* @param {string} name - the name that will be used to reference the window in future calls
	* @param {string} url - the url to open
	* @param {object} options - Electron-specific BrowserWindow options object. http://electron.atom.io/docs/api/browser-window/
	* @returns {object} window - the BrowserWindow object now associated with name
	*/
	Verbs.prototype.createWindow = function createWindow (name, url, options) {
//		console.log ("createWindow " + name + ", " + url + "\n" + JSON.stringify (options, null, 4));
		if (isElectron) {
			try {
				var win = new BrowserWindow(options);
				kvs.set (name, win);
				win.loadURL (url);
				return win;
			} catch (err) {
				debug ("createWindow err: " + err);
				return null;
			}
		}
		
		return null;
	}

	/**
	* return a native window object
	* @param {string} name - the name that will be used to reference
	* @returns {object} window - the BrowserWindow object associated with name
	*/
	Verbs.prototype.getWindow = function getWindow (name) {
//		console.log ("getWindow " + name);
		return kvs.get (name);
	}

	/**
	* delete a native window object
	* @param {string} name - the name that will be used to reference the window
	*/
	Verbs.prototype.deleteWindow = function deleteWindow (name) {
//		console.log ("deleteWindow " + name);
		var win = this.getWindow (name);
		if (win !== null && win !== undefined) {
			win.destroy ();
			kvs.delete (name);
//			console.log ("deleteWindow deleted.");
		}
		else debug ("deleteWindow not found: " + name);
	}

	/*********************** SERIAL **************/
	
 	var SerialPort = null; //require('serialport');
	var serialPortCount = 0;
	
	/**
	* return an open serial connection reference
	* @param {string} path - the path of the serial port to open
	* @param {object} settings - settings object matching settings in node-serialport module
	* @returns {string} ref - a reference to the open port
	*/
	Verbs.prototype.serialOpen = function serialOpen (path, settings) {
		var refName = "serial_port_" + serialPortCount++;
		serDebug ("serialOpen: " + refName + ", " + path);
//		this.serEmitter.emit ("serOpen", {'refName':refName, 'path':path, 'settings':settings});
		serOpen ( {'refName':refName, 'path':path, 'settings':settings});
		return refName;
	}
	
	
	function serOpen (args) {
		try {
			args.settings.autoOpen = false;
			
			var refObj = {
				'port': new SerialPort (args.path, args.settings),
				'path': args.path,
				'refName': args.refName,
				'settings': args.settings,
				'buffer': "",
				'isOpen': false
			};
			//serDebug (JSON.stringify (refObj, null, 4));
			kvs.set (refObj.refName, refObj);

			serDebug ("serOpen Opening port " + refObj.path);

			refObj.port.on ('open', function () {
					serDebug ("serial callback Open: " + refObj.path);
					refObj.isOpen = true;
				});
			
			refObj.port.on ('error', function (err) {
					serDebug ("serial Error: " + err);
				});

			refObj.port.on ('close', function () {
					serDebug ("serial close event handler ");
					refObj.isOpen = false;
					refObj.buffer = null;
					kvs.delete (refObj.refName);
				});

			suspend (function* () {
				serDebug ("serOpen opening...");
				var x = yield refObj.port.open(resume());
				serDebug ("serOpen opened.");
				refObj.port.on ('data', function (data) {
						serDebug ("serial Data: " + data.length);
						refObj.buffer += data;
					});
			})();
			serDebug ("serOpen returning...");
		}
		catch (err) {
			serDebug ("serOpen err: " + err);
		}
	}

	/**
	* close a serial connection
	* @param {string} ref - reference to an open serial port
	*/
	Verbs.prototype.serialClose = function serialClose (ref) {
		serDebug ("serialClose: " + ref);
//		this.serEmitter.emit ("serClose", ref);
		serClose (ref);
	}
	
	function serClose (ref) {
		serDebug ("serClose : " + ref);
		try {
			var o = kvs.get (ref);
			if (o) {
				suspend (function* () {
					serDebug ("serClose: closing");
					try {
						yield o.port.close(resume());
					}
					catch (err) {
						serDebug ("serClose err: " + err);
					}
				})();
			}
			else {
				serDebug ("serClose: port not found in kvs");
			}
		}
		catch (err) {
			serDebug ("serClose err: " + err);
		}
	}

	/**
	* read up to count bytes/characters from a serial port, returns "" if no data pending
	* @param {string} ref - the ref of the serial port to read
	* @param {int} count - number of bytes to attempt to read
	* @returns {string} data - up to count bytes of data read from serial port
	*/
	Verbs.prototype.serialRead = function serialRead (ref, count) {
		try {
			var o = kvs.get (ref);
			if (o) {
				var b = o.buffer;
				o.buffer = "";
				return b;
			}
			else
				return "";
		}
		catch (err) {
			serDebug ("serialRead err: " + err);
			return "";
		}
	}

	/**
	* write data to a serial connection
	* @param {string} ref - reference to the serial port to write to
	* @param {string} data - data to write
	*/
	Verbs.prototype.serialWrite = function serialWrite (ref, data) {
		serDebug ("serialWrite: " + ref);
//		this.serEmitter.emit ("serWrite", {'refName' : ref, 'data' : data});	
		serWrite ({'refName' : ref, 'data' : data});	
	}
	
	function serWrite (args) {
		var ref = args.refName;
		var data = args.data;
		try {
			var o = kvs.get (ref);
			if (o) {
				suspend (function* () {
						serDebug ("calling write in suspend");
						try {
							var x = yield o.port.write (data, resume());
							serDebug ("draining...");
							x = yield o.port.drain (resume());
							serDebug ("drained.");
						}
						catch (err) {
							serDebug ("serWrite error: " + err);
						}
						serDebug ("end of write suspend");
					})();
			}
			else
				serDebug ("serWrite no such port " + ref);
		}
		catch (err) {
			serDebug ("serWrite exception: " + err);
		}
		serDebug ("serWrite returning");
	}

	/**
	* return a serial connection's status
	* @param {string} port - the path of the serial port to open
	* @returns {string} reference - a reference to the open port
	*/
	Verbs.prototype.serialStatus = function serialStatus (ref) {
		var res = {open: false, pending: 0, error: 0};
		try {
			var o = kvs.get (ref);
			if (o) {
				res.open = o.isOpen;
				res.pending = o.buffer.length;
			}
			else
				res.error = -1;
		}
		catch (err) {
			serDebug ("serialStatus exception: " + err);
			res.error -2;
		}
		return res;
	}

	/*
	* Test Verbs functions
	* execute with DEBUG=verbs node ./bin/www.js
	*/
 	 
	Verbs.prototype.test = function test () {
		try {
			debug ("test : running automated tests");
			data = "This is some sample data";

			this.mkdir ("./verbs_test");
			//var watch = this.watchFolder ("./verbs_test", null);
		
			if (this.fileExists ("./verbs_test/testdata.txt"))
				this.deleteFile ("./verbs_test/testdata.txt");
	
			this.loadFile ("./verbs_test/nonexistent.txt"); 	
			this.saveFile ("./verbs_test/testdata.txt", data);
			debug ("loadFile read: " + this.loadFile ("./verbs_test/testdata.txt"));

			debug ("verbs_test contents: " + JSON.stringify (this.readdir("./verbs_test")));
			
			if (this.fileExists ("./verbs_test/testdata.txt"))
				this.deleteFile ("./verbs_test/testdata.txt");
	
			var enc = this.encodeBase64 ("ABCDEF12345");
			debug ("test: encodeBase64 - " + enc);
			debug ("test: decodeBase64 - " + this.decodeBase64 (enc));
		
			//watch.unwatch ("./verbs_test/"); 
			this.rmdir ("./verbs_test/");
		}
		catch (e) {
			console.log ("verbs test failed: " + e);
		}
	};
 
	module.exports = Verbs;