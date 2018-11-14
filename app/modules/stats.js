/*
 * stats.js - stats class, for reporting server stats to remote UI
 * @file stats class, for reporting server stats to remote UI
 * @author cshotton
 * @copyright Copyright ©2016, Chuck Shotton. All rights reserved.
 */
"use strict";

 	const appRoot = require ('app-root-path');
	const debug = require('debug')('stats');
	debug.log = console.info.bind(console); //https://github.com/visionmedia/debug#readme
	const cx = require (appRoot + '/modules/context').context;
	
	//-------------------------------------------------------------------------
	/*
	* functions for logging connections and status
	* constructor
	*/
	function Stats () {
		if ( !(this instanceof Stats) ) {
			return new Stats ();
		}

	 	/*set instance vars here*/
 		this.theStats = {
 			connections: 0,
 			openConnections: 0,
 			high: 0,
 			errors: 0,
 			upSince: new Date()
 		};
 		this.callback = function (stats) {console.log ("got some stats: " + JSON.stringify (stats))};
//		console.log ("##Stats constructor called." + this.callback);
 	}

	Stats.prototype.init = function init (callback) {
//		console.log ("##Stats init called." + callback);
		if (callback === null) {
			debug ("ERROR! Stats must be initialized with a callback to receive stats messages");
		}
		else {
			this.callback = callback;
		}
	}
	
	Stats.prototype.openConnection = function openConnection () {
		this.theStats.openConnections++;
		if (this.theStats.openConnections > this.theStats.high)
			this.theStats.high = this.theStats.openConnections;
		this.callback (this.theStats);
	}
	
	Stats.prototype.closeConnection = function closeConnection (error) {
		if (error) {
			this.theStats.errors++;
		}
		this.theStats.connections++;
		this.theStats.openConnections--;
		if (this.theStats.openConnections<0)
			this.theStats.openConnections = 0;
			
//		console.log ("##Stats closeConnection called." + this.callback);
		this.callback (this.theStats);
	}
	

	module.exports = Stats;