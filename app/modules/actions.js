/**
 * module Actions
 * @file actions.js - user-defined routes
 * @author cshotton
 * @copyright Copyright ©2016, Chuck Shotton. All rights reserved.
 */
"use strict";

const appRoot = require ('app-root-path');
const debug = require('debug')('actions');
debug.log = console.info.bind(console); //https://github.com/visionmedia/debug#readme
const cx = require (appRoot + '/modules/context').context;

const actionsPrefix = "system/actions";  //prefix for ODB paths to access action info

var electron = null;
var dialog = null;
var ipcMain = null;
var BrowserWindow = null;	// Module to create native browser window.

var actionsWindow = null;
var actionsArgs = {};

if (cx.hasGUI) {
	electron = require('electron');
	dialog = require('electron').dialog;
	ipcMain = require ('electron').ipcMain;
	BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
}

function GetActionsODB () {
    return cx.odb;
}

module.exports.SaveActions = function () {
	GetActionsODB().saveODB();
}

module.exports.getActionsWindow = function () {
		return actionsWindow;
	}
	

module.exports.showActions = function (parent) {
		var path_actions = "http://admin:" + actionsArgs.adminPass + "@" + 
							actionsArgs.hostname + ":" + actionsArgs.port + 
							actionsArgs.path_actions;
		if (cx.hasGUI) {
			var winArgs = {width: 1080, height:600, show:false};
			if (parent !== undefined && parent != null) {
				var pos = parent.getPosition();
				winArgs.x = pos[0] + 10;
				winArgs.y = pos[1] + 20;
//				winArgs.parent = parent; //this makes a weird linkage on Macs between parent movement and child position
			}

			actionsWindow = new BrowserWindow (winArgs);
			actionsWindow.loadURL(path_actions);
			actionsWindow.once ('ready-to-show', () => {
				actionsWindow.show();
			});
		}
		else {
			//%CTS fix this URL
			verbs.openURL (path_actions);
		}
	}
	

module.exports.hideActions = function () {
		if (cx.hasGUI) {
		}
		else {
		}
	}

module.exports.listActions = function () {
	var kids = cx.odb.getAttributeChildren (actionsPrefix);
	if (kids === null)
		kids = [];
	else
		kids = kids.sort();
	return kids;
}
	
module.exports.get1Action = function (key) {
	var act = {
			'name': key,
			'path': cx.odb.getAttribute (actionsPrefix + "/" + key + "/path"),
			'script' : cx.odb.getAttribute (actionsPrefix + "/" + key + "/script")
		};

	return act;
}
	
module.exports.set1Action = function (key, path, script) {
	cx.odb.setAttribute (actionsPrefix + "/" + key + "/path", "text", path);
	cx.odb.setAttribute (actionsPrefix + "/" + key + "/script", "text", script);
}
	
module.exports.delete1Action = function (key) {
	cx.odb.deleteAttribute (actionsPrefix + "/" + key);
}
	
module.exports.getScriptFile = function (event, arg) {
		var fileResult = dialog.showOpenDialog (actionsWindow, {properties: ['openFile']},
			function (files) {
				if (files) {
					debug ("File selected: " + JSON.stringify (files));
					event.sender.send ("do-command", {command:arg.cmd, msg: {which: arg.args, files:files}});
				}
			});
	}
	
module.exports.init = function (args) {
	actionsArgs = args;
}