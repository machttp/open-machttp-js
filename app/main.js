/**
 * 
 * @file main entry point for MacHTTP-js, sets up Electron app and handles services for UI
 * @author cshotton
 * @copyright Copyright ©2016, Chuck Shotton. All rights reserved.
 */
"use strict";

var isElectron = (typeof process.versions['electron'] !== "undefined");
// Handle Squirrel events for Windows immediately on start
//if(require('electron-squirrel-startup')) return;

var settingsPort = "3000";
var port = null;
var hostname = null;
var home = null;
var server = null;
const default_password = "ab1b102bf524554eb1b121cb8277dd40"; //machttp

var adminPass = default_password;
var externalIP = null;
var upnpTTL = 3600;

/**
 * Module dependencies.
 */ 
var appRoot = require ('app-root-path');
var A2H = require ('ansi-to-html');
var a2h = new A2H();

var os = require ("os");
var ip = require ("ip");
var natUpnp = require('nat-upnp');

var cmdOpts = null;
if (!isElectron) {
	cmdOpts = require ("nomnom")
	.option ('port', {
		abbr: 'p',
		default: settingsPort,
		metavar: "PORT",
		help: 'port number for server to listen on'
	})
	.option ('odb', {
		abbr: 'o',
		metavar: "ODB_PATH",
		help: 'path to alternate ODB to open'
	})
	.option ('docroot', {
		abbr: 'd',
		position: 0,
		metavar: "DOCROOT_PATH",
		help: 'path to the directory containing Web site content to serve'
	})
	.parse();
}

//set up the global context
const packageJSON = require (appRoot + '/package.json');
const kvs = require (appRoot + '/modules/kvs');

var Context = require (appRoot + '/modules/context');
var globalContext = Context.init(cmdOpts);	//this sets up all of the runtime context info
var odb = globalContext.odb;
var verbs = globalContext.verbs;
var stats = globalContext.stats;
var logger = globalContext.logger;

var appShouldQuit = false;			//global flag for quitting app if beta expired

// set up the stats handler
stats.init (function (stats) {
	if (isElectron) {
		mainWindow.webContents.send ("do-command", {command:"stats",msg:stats});
	}
});

var Scripts = require (appRoot + "/modules/scripts");
var scripts = new Scripts(globalContext);
var app = require(appRoot + '/app'); //set-up for express
var debug = require('debug')('machttp-js:server');
var http = require('http');
const settings = require (appRoot + '/modules/settings');
const realms = require (appRoot + '/modules/realms');
const actions = require (appRoot + '/modules/actions');

//******* machttp-js start-up continues here... *************

//paths for extra functions
const path_editor = odb.getAttribute ("system/config/gui_hooks/editor_button"); //"/_static/admin/editor.jhtml";
const path_home = odb.getAttribute ("system/config/gui_hooks/home_button"); //"/odb/system/html/index";
const path_help = odb.getAttribute ("system/config/gui_hooks/help_button"); //"/_static/help/help.jhtml";
const path_settings = odb.getAttribute ("system/config/gui_hooks/settings_button"); //"/_static/admin/settings.jhtml?electron=1";
const path_realms = odb.getAttribute ("system/config/gui_hooks/realms_button"); //"/_static/admin/realms.jhtml?electron=1";
const path_actions = odb.getAttribute ("system/config/gui_hooks/actions_button"); //"/_static/admin/actions.jhtml?electron=1";
const url_crash = odb.getAttribute ("system/config/urls/crash"); //"http://www.machttp.org/";
const url_update = odb.getAttribute ("system/config/urls/update"); //"https://nss4lnoik7.execute-api.us-east-1.amazonaws.com/prod/version";
const path_quickstart = odb.getAttribute ("system/config/gui_hooks/quickstart"); //"/_static/help/quickstart.jhtml";
const path_releasenotes = odb.getAttribute ("system/config/gui_hooks/releasenotes"); //"/_static/help/release_notes.jhtml";

const ui_strings = {
	'change_password' : 'WARNING! Your server is insecure.\nChange the default admin password in Settings->User immediately!!!',
	'beta_expired'	: 'This beta version of MacHTTP-js has expired.\nPlease visit http://www.machttp.org/ to obtain a new version.',
	'beta_will_expire' : 'This beta version of MacHTTP-js will expire on '
	};

process.on( 'SIGINT', function() {
	logger.warn ("(Ctrl-C) MacHTTP-js terminating.");
	// some other closing procedures go here
	process.exit();
});

process.on('uncaughtException', function (err) {
  console.log(err);
});

//*** Electron inits *** (all null until we decide if this is running in Electron)
// For Electron, hook into stdout so it can be routed to the console display field
//global.console_out = {data:""};

// as per https://gist.github.com/pguillory/729616
function hook_stdout(callback) {
    var old_write = { out: process.stdout.write, err: process.stderr.write };

    process.stdout.write = process.stderr.write = (function(write) {
        return function(string, encoding, fd) {
            write.apply(process.stdout, arguments)
            callback(string, encoding, fd)
        }
    })(process.stdout.write)

    return function() {
        process.stdout.write = old_write.out;
        process.stderr.write = old_write.err;
    }
}

var unhook = null;

var electron = null;
var dialog = null;
var ipcMain = null;
var eapp = null;  			// Module to control application life.
var BrowserWindow = null;	// Module to create native browser window.
var mainWindow = null;
var electronMenus = null;
var nativeImage = null;
var autoUpdater = null;

//do some basic electron setup before starting the web server
if (isElectron) {
	electron = require('electron');
	dialog = require('electron').dialog;
	ipcMain = require ('electron').ipcMain;
	eapp = electron.app;  // Module to control application life.
	nativeImage = require('electron').nativeImage;
	BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
	
	//add event handler for open document events
	eapp.on ('will-finish-launching', function () {
		eapp.on ('open-file', function (event, path) {
			event.preventDefault();
			app.adjustDynamicRouter (path); //switch to the user-dragged folder for docroot
		});
		eapp.on ('open-files', function (event, path) {
			event.preventDefault();
//			app.adjustDynamicRouter (path); //switch to the user-dragged folder for docroot
		});
	});
	
	// Report crashes to our server.
//	electron.crashReporter.start({productName:"machttp-js",
//					companyName:"chuck",
//					submitURL: url_crash});
}

//start all of the Express-related services
StartWebServer();

//finish up the electron app start-up
if (isElectron) {
	eapp.on('window-all-closed', function() {
 	 // On OS X it is common for applications and their menu bar
 	 // to stay active until the user quits explicitly with Cmd + Q
	//  if (process.platform != 'darwin') {
    	eapp.quit();
	//  }
	});


	eapp.on('ready', function() {
		// Create the browser window.
		mainWindow = new BrowserWindow({width: 1024, height: 720, show:false});
		mainWindow.loadURL("http://" + hostname + ":" + port + "/_static/console.jhtml");
		kvs.set ("_console", mainWindow); //sneak the console window into the kvs so we can script it later
		
		mainWindow.once ('ready-to-show', () => {
			mainWindow.show();
			//hook stdout and push it to the console browser display with events
			unhook = hook_stdout(function(string, encoding, fd) {
				var s = a2h.toHtml(string) + "<br />";
				mainWindow.webContents.send ("do-command", {command:"msg",msg:s});
			});
			// do the rest of the app startup here when we are sure 
			// the console display is up and running
			DoStartup();
		});

		// Open the DevTools.
//		mainWindow.webContents.openDevTools({mode:"bottom"});
	
		// Emitted when the window is closed.
		mainWindow.on('closed', function() {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
			mainWindow = null;
		});

//	    autoUpdater.initialize()

		// set up the menus
		electronMenus = require (appRoot + '/modules/electronMenu');
		electronMenus.init ();
		
//		autoUpdater.updateMenu()
	});
	
	ipcMain.on('do-command', function(event, arg) {
//		console.log(arg);
		var contents = "";
	
		switch (arg.cmd) {
			case "new-editor":
				verbs.openURL ("http://" + hostname + ":" + port + path_editor);
				break;
			
			case "new-settings":
				settings.showSettings (mainWindow);
				break;
			
			case "new-realms":
				realms.showRealms (mainWindow);
				break;
			
			case "new-actions":
				actions.showActions (mainWindow);
				break;
			
			case "home":
				verbs.openURL ("http://" + hostname + ":" + port + path_home);
				break;
				
			case "reload-console":
				mainWindow.loadURL(`file://${__dirname}/../console.html`);
				break;

			case "toggle-dev-tools": 
				mainWindow.webContents.toggleDevTools({mode:"bottom"});
				break;
						
			case "help":
				settings.showQuickStart (mainWindow);
				break;
				
			case "open-in-browser":
				verbs.openURL (arg.args);
				break;
				
			case "select-settings-folder":
				var fileResult = settings.getSettingsFolder (event, arg);
				break;
				
			case "select-settings-file":
				var fileResult = settings.getSettingsFile (event, arg);
				break;
				
			case "select-actions-file":
				var fileResult = actions.getScriptFile (event, arg);
				break;
				
			case "server-alert":
				ServerAlert (arg.args);
				break;
			
			default:
				break;
		}
	});
} // if electron
else {
	DoStartup ();
}

//------------------------------------------

function ServerAlert (args) {
	if (isElectron) {
		let image = nativeImage.createFromPath('./_static/images/machttp-icon.png');
		var win = mainWindow;
		if (args.parent == "settings") {
			win = settings.getSettingsWindow();
		}
		else if (args.parent == "realms") {
			win = realms.getRealmsWindow ();
		}
		else if (args.parent === undefined || args.parent === null || args.parent == "none") {
		}
		var selected = dialog.showMessageBox (win, 
				{'type': 'warning', 'buttons': ['OK'], 'message': args.msg, 'icon': image},
				function (response) {
					if (appShouldQuit) {
						eapp.exit(1);
					}
				});
	}
	
	logger.log ('warn', args.msg); //always stick the message in the log

	if (appShouldQuit && !isElectron) {
		process.exit(1);
	}
}


//------------------------------------------

function InitializeSettings () {
    if (odb.attributeHasChildren("system/settings")) {
        var kids = odb.getAttributeChildren ("system/settings");
        for (var k in kids) {
            var kval = odb.getAttribute ("system/settings/" + kids[k]);
            logger.log ('verbose', (kids[k] + ": " + kval));
        }
    }
    else {
        //new settings file is needed
        odb.setAttribute ("system/settings/firstName", "text", "first");
        odb.setAttribute ("system/settings/lastName", "text", "last");
        odb.setAttribute ("system/settings/webSite", "text", "./public/");
        odb.setAttribute ("system/settings/sharedData", "text", "./shared/");
        odb.setAttribute ("system/settings/port", "text", "3000");
        odb.setAttribute ("system/settings/adminPassword", "text", "machttp");
        odb.setAttribute ("system/settings/globalTheme", "text", "Dark");
        odb.setAttribute ("system/settings/isNew", "text", "1");
        odb.saveODB();
    }
	
	adminPass = odb.getAttribute ("system/settings/adminPassword");
}


//------------------------------------------

function HandleStats (stats) {
	if (isElectron) {
		mainWindow.webContents.send ("do-command", {command:"stats",msg:stats});
	}
}


//------------------------------------------

function DetermineHostname () {
//currently, this is returning the public IP address of the server to work around a macOS bug
// with zeroconf name resolution when sharing is disabled.
//	var name = os.hostname ().toLowerCase();
	return ip.address();
}

//------------------------------------------
function RenewUPNPLease (thePort) {

	var uclient = natUpnp.createClient();

	uclient.portMapping({
		public: thePort,
		private: thePort,
		ttl: upnpTTL
	}, function(err) {
		if (err === null) {
			uclient.externalIp(function(err, ip) {
				externalIP = ip;
			});				
		}
	});
}

//------------------------------------------

function StartWebServer () {
	/**
	* load the settings ODB 
 	*/
 	InitializeSettings ();
 	
	var tport = normalizePort (odb.getAttribute ("system/settings/port"));
	if (tport > 0) 
		settingsPort = tport;
		
	if (cmdOpts != null && cmdOpts.port !== undefined && cmdOpts.port !== null) //override port with command line
		settingsPort = cmdOpts.port;
 	
	/**
	 * Get port from environment and store in Express.
	 */

	port = normalizePort(process.env.PORT || settingsPort);
	app.set('port', port);
	hostname = DetermineHostname ();
	home = process.env.HOME;

	//save these in the kvs for other modules to reference
	kvs.set ('_hostname', hostname);
	kvs.set ('_port', port);
	
	//see if we need to set up a UPnP mapping for the server
	try {
		var portMapping = (odb.getAttribute ("system/settings/upnp") === "on");
		var ttl = odb.getAttribute ("system/settings/upnpTTL");
		if (ttl === undefined || ttl === null || ttl ==='' || ttl < 120)
			ttl = upnpTTL;
		upnpTTL = ttl;
		
		if (portMapping) {
			RenewUPNPLease (port);
			setInterval (function () {
					RenewUPNPLease (port);
				}, (upnpTTL-60) * 1000);			
		}
		
		//make sure we renew the lease one minute before it expires
	} catch (err) {
		logger.log ('warn', "Error: unable to establish port mapping: " + err);
	}
	
	// now see if we have a new docroot that we need to be using (from command line)
	if (cmdOpts !== null && cmdOpts.docroot !== undefined && cmdOpts.docroot !== null) {
		app.adjustDynamicRouter (cmdOpts.docroot);
	}
	
	/*
	var https = require ("https");
	const fs = require('fs');
	const options = {
		key: fs.readFileSync('/Users/cshotton/Dropbox/projects/certs/privkey1.pem'),
		cert: fs.readFileSync('/Users/cshotton/Dropbox/projects/certs/cert1.pem')
	};
	server = https.createServer(options, app);
	*/
	/**
	 * Create HTTP server.
	 */

	server = http.createServer(app);
	/**
	 * Listen on provided port, on all network interfaces.
	 */
	server.listen(port);
	server.on('error', onError);
	server.on('listening', onListening);
}


//------------------------------------------

function DoUpdateDialog (releaseNotes, releaseName, releaseDate, updateURL, quitAndUpdate) {
	dialog.showMessageBox(/*mainWindow,*/ {
				type: 'info',
				buttons: ['Update Now', 'Later'],
				title: releaseName,
				message: 'The ' + releaseName + ' update has been downloaded. Click Update Now to automatically install and restart with the new version. Otherwise, MacHTTP-js will update itself when you quit.',
				detail: releaseName + "\n" + releaseNotes
			}, 
			function (index) {
				if (index === 1) {
					return;
				}
				else {
					//# restart app, then update will be applied
					quitAndUpdate();
					process.exit();
				}
			}
	);

}


//------------------------------------------

function InitAutoUpdates () {
	var doUpdates = odb.getAttribute ("system/settings/autoUpdates") === "on";
	
	if (isElectron && !globalContext.developmentMode && doUpdates && !globalContext.firstRun) {
		const {autoUpdater} = electron;
				
		autoUpdater.on("update-available", function(event) {
			logger.info ("A new update is available.");
			if (mainWindow) {
//				mainWindow.webContents.send('update-message', 'update-available');
//				ServerAlert ({'msg': "A new update is available"});
			}
		});
		autoUpdater.on("update-downloaded", function(event, releaseNotes, releaseName, releaseDate, updateURL, quitAndUpdate) {
			logger.info (`${releaseName} is downloaded and will be automatically installed on Quit`);
			if (mainWindow) {
				DoUpdateDialog (releaseNotes, releaseName, releaseDate, updateURL, quitAndUpdate);
			}
		});
		autoUpdater.on("error", function(error) {
			logger.error(error);
			if (mainWindow) {
//				mainWindow.webContents.send('update-message', 'update-error');
				ServerAlert ({'msg': "AutoUpdate error: " + error});
			}
		});
		autoUpdater.on("checking-for-update", function(event) {
			logger.info("Checking for updates to MacHTTP-js.");
			if (mainWindow) {
//				mainWindow.webContents.send('update-message', 'checking-for-update');
			}
		});
		autoUpdater.on("update-not-available", function() {
			logger.info("MacHTTP-js is up to date.");
			if (mainWindow) {
//				mainWindow.webContents.send('update-message', 'update-not-available');
			}
		});
	
		const appVersion = require(appRoot + '/package.json').version;
		const feedURL = url_update + '?version=' + appVersion;
//		logger.debug ("Setting update URL to " + feedURL);
		
		autoUpdater.setFeedURL(feedURL);
		autoUpdater.checkForUpdates();
	}
/**
	else {
		DoUpdateDialog ("These are the release notes on\nmore than one line.", "MacHTTP-js x.y.z", "today", "http://localhost:3000",
			function () {console.log("quitAndUpdate goes here.")});
	}
/**/
}


//------------------------------------------

// Run all of the related startup items once the app is up and functioning

function DoStartup () {
	
	// start up the server, etc.
	logger.info (Context.copyright);
	logger.info ("Running " + Context.appName + " v." + Context.appVersion);
	logger.info ('Local URL: http://' + hostname + ':' + port + '/');
	if (externalIP !== null) {
		logger.info ('Public URL: http://' + externalIP + ':' + port + '/');
	}
	
	logger.info ("Document root is: " + app.getDocRoot());
	
	var apath = process.cwd();
	
	if (isElectron) {
		apath = eapp.getAppPath ();
	}
	
	logger.info ("Application path is: " + apath);
	odb.setAttribute ("system/config/appPath", "text", apath);

	// configure settings UI module
	var adminPass = odb.getAttribute ("system/settings/adminPassword");
	var settingsArgs = {
			'mainWindow' : mainWindow,
			'path_settings' : path_settings,
			'path_quickstart' : path_quickstart,
			'path_releasenotes' : path_releasenotes,
			'path_realms' : path_realms,
			'path_actions' : path_actions,
			'hostname' : hostname,
			'port' : port,
			'adminPass' : adminPass
			};
			
	settings.init (settingsArgs);
	realms.init (settingsArgs);
	actions.init (settingsArgs);
	
	/**
	 * Run the startup script 
	 */
	scripts.runScriptODB ("system/scripts/startup", {
		"hostname" : hostname,
		"port" : port + "",
		"home" : home,
		"appRoot" : appRoot
		});
		
	if (adminPass == default_password) {
		ServerAlert ({'msg': ui_strings ['change_password']});
	}
	
	InitAutoUpdates ();
	CheckExpired ();

}

//------------------------------------------

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
	var port = parseInt(val, 10);

	if (isNaN(port)) {
		// named pipe
		return val;
	}

	if (port >= 0) {
		// port number
		return port;
	}

	return false;
}

//------------------------------------------

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
	if (error.syscall !== 'listen') {
		throw error;
	}

	var bind = typeof port === 'string'
		? 'Pipe ' + port
		: 'Port ' + port;

	// handle specific listen errors with friendly messages
	switch (error.code) {
		case 'EACCES':
			console.error(bind + ' requires elevated privileges');
			process.exit(1);
			break;
			
		case 'EADDRINUSE':
			console.error(bind + ' is already in use');
			process.exit(1);
			break;
			
		default:
			throw error;
	}
}

//------------------------------------------

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
	var addr = server.address();
	var bind = typeof addr === 'string'
		? 'pipe ' + addr
		: 'port ' + addr.port;
	debug('Listening on ' + bind);
}

//------------------------------------------

//check for beta expiration
function CheckExpired () {
	if (packageJSON.expires) {
		var expiresOn = new Date (packageJSON.expiresDate);
		var now = Date.now();
//console.log ('now ' + now + ', exipresDate: ' + expiresOn.valueOf());
		if (now > expiresOn.valueOf()) {
			appShouldQuit = true;
			ServerAlert ({'msg': ui_strings ['beta_expired']});
		}
		else {
			ServerAlert ({'msg': ui_strings ['beta_will_expire'] + expiresOn.toLocaleDateString()});
		}
	}
}