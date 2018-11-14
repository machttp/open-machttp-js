/**
 * realms.js - basic authentication by realm
 * @module Realms
 * @file  basic authentication by realm
 * @author cshotton
 * @copyright Copyright ©2016, Chuck Shotton. All rights reserved.
 */
"use strict";

const appRoot = require ('app-root-path');
const debug = require('debug')('realms');
debug.log = console.info.bind(console); //https://github.com/visionmedia/debug#readme
const cx = require (appRoot + '/modules/context').context;

const realmsPrefix = "system/realms";  //prefix for ODB paths to access realm info

var electron = null;
var dialog = null;
var ipcMain = null;
var BrowserWindow = null;	// Module to create native browser window.

var realmsWindow = null;
var realmsArgs = {};

if (cx.hasGUI) {
	electron = require('electron');
	dialog = require('electron').dialog;
	ipcMain = require ('electron').ipcMain;
	BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
}

function GetRealmsODB () {
    return cx.odb;
}

module.exports.SaveRealms = function () {
	GetRealmsODB().saveODB();
}

module.exports.getRealmsWindow = function () {
		return realmsWindow;
	}
	

module.exports.showRealms = function (parent) {
		var path_realms = "http://admin:" + realmsArgs.adminPass + "@" + 
							realmsArgs.hostname + ":" + realmsArgs.port + 
							realmsArgs.path_realms;
		
		if (cx.hasGUI) {
			var winArgs = {width: 1080, height:600, show:false};
			if (parent !== undefined && parent != null) {
				var pos = parent.getPosition();
				winArgs.x = pos[0] + 10;
				winArgs.y = pos[1] + 20;
//				winArgs.parent = parent; //this makes a weird linkage on Macs between parent movement and child position
			}

			realmsWindow = new BrowserWindow (winArgs);
			realmsWindow.loadURL(path_realms);
			realmsWindow.once ('ready-to-show', () => {
				realmsWindow.show();
			});
		}
		else {
			//%CTS fix this URL
			verbs.openURL (path_realms);
		}
	}
	

module.exports.hideRealms = function () {
		if (cx.hasGUI) {
		}
		else {
		}
	}

module.exports.listUsers = function (realm) {
	var kids = cx.odb.getAttributeChildren (realmsPrefix + "/" + realm + "/users");
	if (kids === null)
		kids = [];
	else
		kids = kids.sort();
	return kids;
}
	
module.exports.get1User = function (realm, key) {
	return cx.odb.getAttribute (realmsPrefix + "/" + realm + "/users/" + key);
}
	
module.exports.set1User = function (realm, key, value) {
	var pass = cx.verbs.hash (value + 'mrwheat');
	cx.odb.setAttribute (realmsPrefix + "/" + realm + "/users/" + key, "text", pass);
}
	
module.exports.delete1User = function (realm, key) {
	cx.odb.deleteAttribute (realmsPrefix + "/" + realm + "/users/" + key);
}
	

module.exports.listRealms = function () {
	var kids = cx.odb.getAttributeChildren (realmsPrefix);
	if (kids === null)
		kids = [];
	else
		kids = kids.sort();
	return kids;
}
	
module.exports.get1Realm = function (key) {
	return cx.odb.getAttribute (realmsPrefix + "/" + key + "/path");
}
	
module.exports.set1Realm = function (key, value) {
	cx.odb.setAttribute (realmsPrefix + "/" + key + "/path", "text", value);
}
	
module.exports.delete1Realm = function (key) {
	cx.odb.deleteAttribute (realmsPrefix + "/" + key);
}
	
module.exports.init = function (args) {
	realmsArgs = args;
}