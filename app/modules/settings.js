/**
 * settings.js - functions for managing settings for machttp-js
 * @module settings
 * @file functions for managing settings for machttp-js
 * @author cshotton
 * @copyright Copyright ©2016, Chuck Shotton. All rights reserved.
 */
"use strict";

const appRoot = require ('app-root-path');
const debug = require('debug')('settings');
debug.log = console.info.bind(console); //https://github.com/visionmedia/debug#readme
const cx = require (appRoot + '/modules/context').context;

var electron = null;
var dialog = null;
var ipcMain = null;
var BrowserWindow = null;	// Module to create native browser window.

var settingsWindow = null;
var settingsArgs = {};
var quickStartWindow = null;
var releaseNotesWindow = null;

if (cx.hasGUI) {
	electron = require('electron');
	dialog = require('electron').dialog;
	ipcMain = require ('electron').ipcMain;
	BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
}


function GetSettingsODB () {
    return cx.odb;
}

module.exports.getSettingsWindow = function () {
		return settingsWindow;
	}
	

module.exports.showQuickStart = function (parent) {
		var path_quickstart = "http://" + 
							settingsArgs.hostname + ":" + settingsArgs.port + 
							settingsArgs.path_quickstart;
		
		if (cx.hasGUI) {
			var winArgs = {width: 600, height:600, show:false};
			if (parent !== undefined && parent != null) {
				var pos = parent.getPosition();
				winArgs.x = pos[0] + 10;
				winArgs.y = pos[1] + 20;
			}

			quickStartWindow = new BrowserWindow (winArgs);
			quickStartWindow.loadURL(path_quickstart);
			quickStartWindow.once ('ready-to-show', () => {
				quickStartWindow.show();
			});
		}
		else {
			//%CTS fix this URL
			cx.verbs.openURL ("http://" + settingsArgs.hostname + ":" + settingsArgs.port + 
							settingsArgs.path_settings);
		}
	}
	

module.exports.showReleaseNotes = function (parent) {
		var path_releasenotes = "http://" + 
							settingsArgs.hostname + ":" + settingsArgs.port + 
							settingsArgs.path_releasenotes;
		
		if (cx.hasGUI) {
			var winArgs = {width: 680, height:600, show:false};
			if (parent !== undefined && parent != null) {
				var pos = parent.getPosition();
				winArgs.x = pos[0] + 10;
				winArgs.y = pos[1] + 20;
			}

			releaseNotesWindow = new BrowserWindow (winArgs);
			releaseNotesWindow.loadURL(path_releasenotes);
			releaseNotesWindow.once ('ready-to-show', () => {
				releaseNotesWindow.show();
			});
		}
		else {
			//%CTS fix this URL
			cx.verbs.openURL ("http://" + settingsArgs.hostname + ":" + settingsArgs.port + 
							settingsArgs.path_releasenotes);
		}
	}
	

module.exports.showSettings = function (parent) {
		var path_settings = "http://admin:" + settingsArgs.adminPass + "@" + 
							settingsArgs.hostname + ":" + settingsArgs.port + 
							settingsArgs.path_settings;
		
		if (cx.hasGUI) {
			var winArgs = {width: 1000, height:600, show:false};
			if (parent !== undefined && parent != null) {
				var pos = parent.getPosition();
				winArgs.x = pos[0] + 10;
				winArgs.y = pos[1] + 20;
//				winArgs.parent = parent; //this makes a weird linkage on Macs between parent movement and child position
			}

			settingsWindow = new BrowserWindow (winArgs);
			settingsWindow.loadURL(path_settings);
//			settingsWindow.loadURL(`file://${appRoot}/_static/app/consoleSettings.html`);
			settingsWindow.once ('ready-to-show', () => {
				settingsWindow.show();
			});
		}
		else {
			//%CTS fix this URL
			verbs.openURL (path_settings);
		}
	}
	

module.exports.hideSettings = function () {
		if (cx.hasGUI) {
		}
		else {
		}
	}
	
	/*
	* load a settings object from the settings ODB
	* returns {object} the settings
	*/
module.exports.loadSettings = function () {
		debug ("LoadSettings service");
		var settings = {};
		var settingsODB = GetSettingsODB();
		var keys = settingsODB.getAttributeChildren ("system/settings");
		for (var i = 0; i < keys.length; i++) {
			settings [keys[i]] = settingsODB.getAttribute ("system/settings/" + keys[i]);
		}
		return settings;
	}
	
	
	/*
	* save the settings to the ODB
	* param {object} settings - the settings object to save 
	*/
module.exports.saveSettings = function (settings) {		
		debug ("SaveSettings service: " + JSON.stringify (settings));
		var settingsODB = GetSettingsODB();
		for (var key in settings) {
			if (key == "adminPassword") {
				if (settings [key].length > 0) {
					settings [key] = cx.verbs.hash (settings [key] + 'mrwheat');
					settingsODB.setAttribute ("system/settings/" + key, "text", settings [key]);
				}
			}
			else {
				settingsODB.setAttribute ("system/settings/" + key, "text", settings [key]);
			}
		}
		settingsODB.saveODB();
	}
	
	
module.exports.getSettingsFolder = function (event, arg) {
		var fileResult = dialog.showOpenDialog (settingsWindow, {properties: ['openDirectory']},
			function (files) {
				if (files) {
					console.log ("Folder selected: " + JSON.stringify (files));
					event.sender.send ("do-command", {command:arg.cmd, msg: {which: arg.args, files:files}});
				}
			});
	}	
	
module.exports.getSettingsFile = function (event, arg) {
		var fileResult = dialog.showOpenDialog (settingsWindow, {properties: ['openFile']},
			function (files) {
				if (files) {
					console.log ("File selected: " + JSON.stringify (files));
					event.sender.send ("do-command", {command:arg.cmd, msg: {which: arg.args, files:files}});
				}
			});
	}
	
module.exports.init = function (args) {
	settingsArgs = args;
}