/**
 * odbService.js - Express route for setAttribute. debug with odbAPI
 * @module routes/odbSetAttribute
 * @file Express route for setAttribute. debug with odbAPI
 * @author cshotton
 * @copyright Copyright ©2016, Chuck Shotton. All rights reserved.
 */
"use strict";
 
 	const appRoot = require ('app-root-path');
	const debug = require('debug')('odbAPI');
	debug.log = console.info.bind(console); //https://github.com/visionmedia/debug#readme

	var express = require('express');
	var router = express.Router();
	var cx = require (appRoot + '/modules/context');
	var odb = cx.context.odb;
	var verbs = cx.context.verbs;
//	var stats = cx.context.stats;
	var Scripts = require (appRoot + '/modules/scripts');
	var scripts = new Scripts ();
	
//----------------------------------------------------
	function SetCurrentObject (data) {
		var resp = {};
		var children_list = null;
		var i;
		var has_children = odb.attributeHasChildren (data.path);
		var content = null;

		if (has_children) {
//			verbs.DebugMessage ("has children");
			children_list = odb.getAttributeChildren (data.path).sort();
		}
		else { //attribute, get contents
//			content = encodeURIComponent(odb.getAttribute (data.path));
			content = odb.getAttribute (data.path);
		}

		var kind = odb.getAttributeKind (data.path);
		var trigger = "";
		
		resp = { 
					"result" : "OK",
					"command" : "setcurrentobject",
					"path" : data.path,
					"has_children" : has_children,
					"children" : children_list,
					"kind" : kind,
					"trigger" : trigger,
					"content" : content
				};

		return resp;
	}

//----------------------------------------------------
	function ShowCurrentObject (data) {
		var resp = {};
		var children_list = null;
		var i;
		var has_children = odb.attributeHasChildren (data.path);
		var content = null;
		var editor = "text";
		
		if (has_children) {
//			verbs.DebugMessage ("has children");
			children_list = odb.getAttributeChildren (data.path).sort();
		}
		else { //attribute, get contents
//			content = encodeURIComponent(odb.getAttribute (data.path));
			content = odb.getAttribute (data.path);
		}

		var kind = odb.getAttributeKind (data.path);
		var trigger = "";
		editor = odb.getAttribute ("system/types/" + kind + "/editor");
		
		resp = { 
					"result" : "OK",
					"command" : "showcurrentobject",
					"path" : data.path,
					"has_children" : has_children,
					"children" : children_list,
					"kind" : kind,
					"editor" : editor,
					"trigger" : trigger,
					"content" : content
				};

		return resp;
	}

	//----------------------------------------------------
	function GetKinds () {
		var resp = {};
		var children_list = null;
		children_list = odb.getAttributeChildren ("system/types").sort();

		resp = { 
					"result" : "OK",
					"command" : "getkinds",
					"kinds" : children_list,
				};

		return resp;
	}

	//----------------------------------------------------
	function SaveAttribute (data) {
		var resp=null;
		var err = "";
		var tcontent = data.content;
		odb.setAttribute (data.path, data.kind, tcontent);
		resp = {
			"result" : "OK",
			"command": "saveattribute",
			"path" : data.path,
			"name" : data.name
		};
		return resp;
	}
	
	//----------------------------------------------------
	function NewObject (data) {
		var resp = null;
		var tpath = data.path;
		var err = "";
		
		if (tpath == "" || tpath == null) {
			tpath = data.name;
		}
		else {
			tpath = data.path + "/" + data.name;
		}
//verbs.DebugMessage (data.command + ": " + tpath + ", " + data.kind);

		odb.setAttribute (tpath, data.kind, null);
		
		resp = {
			"result" : "OK",
			"command": "newobject",
			"path" : data.path,
			"name" : data.name
		};
//verbs.DebugMessage (resp);
		return resp;
	}
	
	//----------------------------------------------------
	function NewAttribute (data) {
		var tpath = "";
		if (data.path == "" || data.path == null)
			tpath = data.name;
		else
			tpath = data.path + "/" + data.name;
	
//		odb.setAttribute (tpath, data.kind, decodeURIComponent (data.content));
		odb.setAttribute (tpath, data.kind, data.content);

		var resp = {
			"result" : "OK",
			"command": "newattribute",
			"path" : data.path,
			"name" : data.name
		};

		return resp;
	}
		
	//----------------------------------------------------
	function Delete (data) {
		var resp = null;
		var tpath = data.path;
		var err = "";
		
		if (tpath == "" || tpath == null) {
			tpath = data.selected;
		}
		else {
			tpath = data.path + "/" + data.selected;
		}
		
		if (data.selected.length > 0) {
			odb.deleteAttribute (tpath);
		}
		else {
			err = "No item was selected. Delete not performed.";
		}
		
		if (err=="") {
			resp = {
				"result" : "OK",
				"command": "delete",
				"path" : data.path,
				"selected": data.selected
			};
		}
		else {
			resp = {
				"result" : "ERR",
				"reason" : err
			}
		}
		return resp;
	}
	
	//----------------------------------------------------
	function RunScript (data) {
		var resp=null;
		var err = "";
//		var tcontent = decodeURIComponent(data.content);
		var tcontent = data.content;
		scripts.runScript (tcontent, null);
		resp = {
			"result" : "OK",
			"command": "runscript",
			"path" : data.path,
			"name" : data.name
		};
		return resp;
	}
	
	//----------------------------------------------------
	function SaveODB (data) {
		odb.saveODB ();
		var resp = {
			"result" : "OK",
			"command": "saveodb"
		};
		return resp;
	}
	
	//----------------------------------------------------
	function Export (data) {
		var json = odb.getObjectJSON (data.path);
		var resp = {
			"result" : "OK",
			"command": "export",
			"json"	: json
		};
		return resp;
	}

	//----------------------------------------------------
	function Import (data) {
		var resp = {
			"result" : "OK",
			"command": "import",
			"path"   : data.path
		};
		
		debug ("Import into " + data.path);
		var json = JSON.parse (data.content);
		var o = odb.getObject (data.path);
		var name = data.name;
		
		if (o!=null) {
			debug ("Import child " + data.name + " into " + data.path + " parent");
			if (name != null && name != "") {
				o.children [data.name] = json;
			}
			else {
				resp.result = "ERR";
				resp.reason = "No name for imported object was supplied.";
				debug ("Import failed -- no name supplied for imported object");
			}
		}
		else {
			resp.result = "ERR";
			resp.reason = "Can't import an entire ODB";
			debug ("Import failed -- parent object was null");
		}			
		return resp;
	}
	
	
	//----------------------------------------------------
	function ProcessCommand (data) {
		var resp = "";

		switch (data.command) {
			case "setcurrentobject":
				resp = SetCurrentObject (data);
				break;
			
			case "showcurrentobject":
				resp = ShowCurrentObject (data);
				break;
			
			case "saveattribute":
				resp = SaveAttribute (data);
				break;
				
			case "newattribute":
				resp = NewAttribute (data);
				break;
				
			case "newobject":
				resp = NewObject (data);
				break;
				
			case "delete":
				resp = Delete (data);
				break;
				
			case "saveodb":
				resp = SaveODB (data);
				break;
				
			case "runscript":
				resp = RunScript (data);
				break;
				
			case "getkinds":
				resp = GetKinds();
				break;
				
			case "export":
				resp = Export (data);
				break;
				
			case "import":
				resp = Import (data);
				break;
				
			default:
				resp = {"result":"ERR", "reason":"Unknown command " + data.command};
		}

		debug ("ProcessCommand: response: " + JSON.stringify (resp));
		return resp;
	}
	
//----------------------------------------------------

	router.post ('/', function (req, res, next) {
//		stats.openConnection ();
		var path = req.params[0];
		
		debug ("odbService: body=" + JSON.stringify(req.body));
		//debug ("odbService: context is: " + JSON.stringify (cx.context));
		
		try {
			res.send (ProcessCommand (req.body));
//			stats.closeConnection (false);
		}
		catch (err) {
			debug ("odbService: error processing JSON: " + err);
			res.send ("{\"result\":\"ERR\",\"reason\":\"JSON syntax error\"}");
//			stats.closeConnection (true);
		}
	});
	
	module.exports = router;