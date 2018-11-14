/**
 * 
 * @file Express.js app object, handles setting up HTTP server routes and logging
 * @author cshotton
 * @copyright Copyright ©2016, Chuck Shotton. All rights reserved.
 */
"use strict";

var appRoot = require ('app-root-path');
const fs = require('fs');
var express = require('express');
var Path = require('path');
var favicon = require('serve-favicon');

//var winston = require ('winston');
//var expressWinston = require ('express-winston');
var httpLogger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var auth = require('basic-auth');

const kvs = require (appRoot + '/modules/kvs');

var routes = require(appRoot + '/routes/index');
var users = require(appRoot + '/routes/users');

var globalContext = require (appRoot + '/modules/context').context;
var odb = globalContext.odb;
var verbs = globalContext.verbs;
var stats = globalContext.stats;
var logger = globalContext.logger;

//--- Web Services routes
var odbService = require (appRoot + '/routes/odbService');
var odbRoute = require (appRoot + '/routes/odbRoute');

logger.log ('verbose', "initializing app");

var Scripts = require (appRoot + '/modules/scripts');
var scripts = new Scripts();
var Verbs = require (appRoot + '/modules/verbs');
var verbs = new Verbs ();

var app = express();

//set up the path for the route to the user's public web server folder
var tweb = null;
try {
	tweb = odb.getAttribute ("system/settings/webSite");
	if (tweb === null || tweb == "")
		tweb = "./public/";
}
catch (e) {
	logger.error ("app: Error loading settings file. " + e);
	tweb = "./public/";
}

//--- jhtml processing
const JHTML = require (appRoot + '/modules/jhtml');
var jhtml = new JHTML (globalContext);

// view engine setup (route established below)
app.engine ('jhtml', jhtml.engine());
app.set('view engine', 'jhtml');

//var engines = require ('consolidate');
//app.engine ('jhtml', engines.ejs);

app.set('views', [tweb, __dirname, Path.join(__dirname, 'views')]);

app.set ('x-powered-by', false);


// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));

// https://github.com/expressjs/morgan for format docs
//app.use(httpLogger('[:date[iso]] ":method :url" :status :res[content-length] :response-time', {

//-----------------------------------------------
// logger setup

var formatStr = odb.getAttribute ("system/settings/logFormat");
if (formatStr === null || formatStr === undefined || formatStr === "") {
	logger.log ('verbose', "No log format setting found. Using default.");
	formatStr = '[:date[iso]] :status :method :url :res[content-length] :response-time';
}

//set up console window logging
app.use(httpLogger(formatStr, {
		skip: function (req, res) { 
      		stats.openConnection();
      		if (res.statusCode < 400)
      			stats.closeConnection (false);
      		else
      			stats.closeConnection (true);
      		return false; 
      	}	
	}));

//set up file logging
var logFileName = odb.getAttribute ("system/settings/logFile");
if (logFileName === null) {
	//old odb, create new setting
console.log ("creating missing logFile setting");
	logFileName = "";
	odb.setAttribute ("system/settings/logFile", "text", logFileName);
}

if (logFileName !== "") {
	var logFile = fs.createWriteStream (Path.join (process.env.HOME,'machttp-js.log'), {flags:'a'});
	app.use (httpLogger (formatStr, {stream: logFile}));
	logger.log ('verbose', "Logging HTTP requests to " + logFileName);
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

//-----------------------------------------------
// set up authenticators for various paths 
//   https://davidbeath.com/posts/expressjs-40-basicauth.html
var basic_auth_admin = function (req, res, next) {
	function unauthorized(res) {
		res.set('WWW-Authenticate', 'Basic realm=MacHTTP-js Admin');
		return res.sendStatus(401);
	};

	var user = auth(req);
	var adminPass = odb.getAttribute ("system/settings/adminPassword");
	
	if (user === undefined /*|| !user.name || !user.pass */) {
		return unauthorized(res);
	};

	var pass = verbs.hash (user.pass + 'mrwheat');
	var localhost = kvs.get('_hostname') + ":" + kvs.get('_port');

	if (req.headers.host.toLowerCase() == localhost && req.query.electron == "1") {
		pass = user.pass;
	}
//return next();
	if (user.name === 'admin' && pass === adminPass) {
		return next();
	} else {
		return unauthorized(res);
	};
};

//-----------------------------------------------
//--- Web Service routes

if (globalContext.developmentMode) { //disallow these in production for security reasons
	app.use ('/odb', odbRoute);
	app.use ('/odbService', odbService);
}

//set up basic auth for admin functions
app.use ('/_static/admin', basic_auth_admin);

//set up basic auth for user-defined realms
const userAuth = require (appRoot + '/modules/userAuth');
userAuth.init (app);

//set up user-defined Actions (routes)
const userActions = require (appRoot + '/modules/userActions');
userActions.init (app);

//set up route for processing JHTML files from _static or user dir
app.use ("*.jhtml", function (req, res, next) {
	res.render(Path.join ('.' + req.baseUrl), {'req':req, 'res':res, 'next':next}, function (err, html) {
				if (!res.headersSent) {
					res.send (html);
				}
			});
});

app.use ("*.jcgi", function (req, res, next) {
//console.log ("jcgi: ");
	var path = req.baseUrl;
	var args = {"req": req, "res": res, "next" : next};
	var handled = false;
	var src = null;
	var obj = null;
	
//console.log (" path1 is " + path);
	try {
		if (path.indexOf ("/_static") == 0) {
			path = appRoot + path; //_static' + path.slice (8);
		}
		else {
			//prepend the user directory
			path = Path.join (tweb, path);
		}
//console.log (" path2 is " + path);
		if (verbs.fileExists (path)) {
			src = verbs.loadFile (path);
		}
		else {
//console.log ("jcgi: " + path + " does not exist.");
			res.status(404);
			res.render('error', {
				'req':req, 
				'res':res,
				'status': 404,
				message: "JCGI file not found",
				error: null
			});
			return;
		}
//console.log ("running script");
		obj = scripts.runScript (src, args);
//console.log ("jcgi ob: " + JSON.stringify (obj));
	}
	catch (err) {
//		console.log ('jcgi err: ' + err);
	}
	
	try {
		if (obj.handled) {
//			console.log ("jcgi: script handled returning results");
			handled = true;
//							stats.closeConnection (false);
		}
		else {
//			console.log ("jcgi: script didn't handle results");
		}
	}
	catch (err) {
//		console.log ("jcgi: unhandled javascript error");
	}
	if (!handled) {
//		console.log ("jcgi: returning unhandled javascript response");
		res.setHeader ("Content-Type", "text/html");
		res.writeHead (200);
		return res.end (obj);
	}
});

//-----------------------------------------------
//set up the route for internally served static data (libraries, etc.)
app.use("/_static", express.static(Path.join(__dirname, '_static')));
logger.log ('verbose', "The static document root is " + Path.join(__dirname, '_static'));

//logger.log ('verbose', "The public document root is " + tweb);

//-----------------------------------------------
// set up dynamic route for user web dir

//this is a "public" function that will be added to 'app' for use in main.js
var dynamicRouter = null;
var theDocRoot = "";


if (dynamicRouter === null) {
	adjustDynamicRouter (tweb);
}

function adjustDynamicRouter (path) {
	dynamicRouter = express.static(path);
	theDocRoot = path;
	logger.log ('verbose', "The public document root is now " + theDocRoot);
}

app.adjustDynamicRouter = adjustDynamicRouter;

app.getDocRoot = function getDocRoot () {
	return theDocRoot;
};

app.use(function (req, res, next) {
		dynamicRouter (req, res, next);
	});

app.use('/', routes);

//-----------------------------------------------
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

//-----------------------------------------------
// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
		'req':req, 
		'res':res,
		message: err.message,
		error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
		'req':req, 
		'res':res,
		message: err.message,
		error: {}
  });
});

module.exports = app;
