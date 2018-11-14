/**
 * electronMenu.js - code for setting up electron menus
 * *module modules/electronMenu
 * @file  electronMenu.js - code for setting up electron menus
 * @author cshotton
 * @copyright Copyright ©2016, Chuck Shotton. All rights reserved.
 */
"use strict";

	const appRoot = require ('app-root-path');
	const settings = require (appRoot + '/modules/settings');
	const cx = require (appRoot + '/modules/context');

	const electron = require('electron')
	const BrowserWindow = electron.BrowserWindow
	const Menu = electron.Menu
	const app = electron.app
	const dialog = require('electron').dialog;
	const nativeImage = require('electron').nativeImage;
	
	var menuArgs = {};

	function ShowAboutBox () {
		let image = nativeImage.createFromPath('./_static/images/machttp-icon.png');
		var selected = dialog.showMessageBox (
			{'type': 'info', 'title':'About MacHTTP-js', 'buttons': ['OK'], 
			'message': cx.copyright, 'icon': image},
			function (response) { });
	}
	
	let template = [{
	  label: 'Edit',
	  submenu: [{
		label: 'Undo',
		accelerator: 'CmdOrCtrl+Z',
		role: 'undo'
	  }, {
		label: 'Redo',
		accelerator: 'Shift+CmdOrCtrl+Z',
		role: 'redo'
	  }, {
		type: 'separator'
	  }, {
		label: 'Cut',
		accelerator: 'CmdOrCtrl+X',
		role: 'cut'
	  }, {
		label: 'Copy',
		accelerator: 'CmdOrCtrl+C',
		role: 'copy'
	  }, {
		label: 'Paste',
		accelerator: 'CmdOrCtrl+V',
		role: 'paste'
	  }, {
		label: 'Select All',
		accelerator: 'CmdOrCtrl+A',
		role: 'selectall'
	  }]
	}, {
	  label: 'View',
	  submenu: [{
		label: 'Reload',
		accelerator: 'CmdOrCtrl+R',
		click: function (item, focusedWindow) {
		  if (focusedWindow) {
			// on reload, start fresh and close any old
			// open secondary windows
			if (focusedWindow.id === 1) {
			  BrowserWindow.getAllWindows().forEach(function (win) {
				if (win.id > 1) {
				  win.close()
				}
			  })
			}
			focusedWindow.reload()
		  }
		}
	  }, {
		label: 'Toggle Full Screen',
		accelerator: (function () {
		  if (process.platform === 'darwin') {
			return 'Ctrl+Command+F'
		  } else {
			return 'F11'
		  }
		})(),
		click: function (item, focusedWindow) {
		  if (focusedWindow) {
			focusedWindow.setFullScreen(!focusedWindow.isFullScreen())
		  }
		}
	  }, {
		label: 'Toggle Developer Tools',
		accelerator: (function () {
		  if (process.platform === 'darwin') {
			return 'Alt+Command+I'
		  } else {
			return 'Ctrl+Shift+I'
		  }
		})(),
		click: function (item, focusedWindow) {
		  if (focusedWindow) {
			focusedWindow.toggleDevTools()
		  }
		}
	  }/*, {
		type: 'separator'
	  }, {
		label: 'App Menu Demo',
		click: function (item, focusedWindow) {
		  if (focusedWindow) {
			const options = {
			  type: 'info',
			  title: 'Application Menu Demo',
			  buttons: ['Ok'],
			  message: 'This demo is for the Menu section, showing how to create a clickable menu item in the application menu.'
			}
			electron.dialog.showMessageBox(focusedWindow, options, function () {})
		  }
		}
	  }*/]
	}, {
	  label: 'Window',
	  role: 'window',
	  submenu: [{
		label: 'Minimize',
		accelerator: 'CmdOrCtrl+M',
		role: 'minimize'
	  }, {
		label: 'Close',
		accelerator: 'CmdOrCtrl+W',
		role: 'close'
	  }, {
		type: 'separator'
	  } /*, {
		label: 'Reopen Window',
		accelerator: 'CmdOrCtrl+Shift+T',
		enabled: false,
		key: 'reopenMenuItem',
		click: function () {
		  app.emit('activate')
		}
	  }*/]
	}, {
	  label: 'Help',
	  role: 'help',
	  submenu: [
	  	{
	  		label: 'Quick Start Guide',
	  		click: function () {
	  			settings.showQuickStart ();
	  		}
	  	},
	  	{
	  		label: 'Release Notes',
	  		click: function () {
	  			settings.showReleaseNotes ();
	  		}
	  	},
	  	{
			label: 'MacHTTP-js Web Site...',
			click: function () {
		  		electron.shell.openExternal('http://www.machttp.org')
			}
	  	}]
	}]

	function addUpdateMenuItems (items, position) {
	  if (process.mas) return

	  const version = electron.app.getVersion()
	  let updateItems = [{
		  type: 'separator'
		}, {
		label: `Version ${version}`,
		enabled: false
	  }/*, {
		label: 'Checking for Update',
		enabled: false,
		key: 'checkingForUpdate'
	  }, {
		label: 'Check for Update',
		visible: false,
		key: 'checkForUpdate',
		click: function () {
//		  require('electron').autoUpdater.checkForUpdates()
		}
	  }, {
		label: 'Restart and Install Update',
		enabled: true,
		visible: false,
		key: 'restartToUpdate',
		click: function () {
//		  require('electron').autoUpdater.quitAndInstall()
		}
	  }*/]

	  items.splice.apply(items, [position, 0].concat(updateItems))
	}


	if (process.platform === 'darwin') {
	  const name = electron.app.getName()
	  template.unshift({
		label: name,
		submenu: [{
		  label: `About ${name}`,
		  click: function () {
		  	ShowAboutBox ();
		  }
//		  role: 'about'
		}, {
		  type: 'separator'
		}, {
			label: 'Preferences',
			click: function () {
				settings.showSettings (null);
			}
		}, {
		  label: 'Services',
		  role: 'services',
		  submenu: []
		}, {
		  type: 'separator'
		}, {
		  label: `Hide ${name}`,
		  accelerator: 'Command+H',
		  role: 'hide'
		}, {
		  label: 'Hide Others',
		  accelerator: 'Command+Alt+H',
		  role: 'hideothers'
		}, {
		  label: 'Show All',
		  role: 'unhide'
		}, {
		  type: 'separator'
		}, {
		  label: 'Quit',
		  accelerator: 'Command+Q',
		  click: function () {
			app.quit()
		  }
		}]
	  })

	  // Window menu.
	  template[3].submenu.push({
		type: 'separator'
	  }, {
		label: 'Bring All to Front',
		role: 'front'
	  })

	  addUpdateMenuItems(template[0].submenu, 1)
	}

	if (process.platform === 'win32') {
	  const helpMenu = template[template.length - 1].submenu
	  addUpdateMenuItems(helpMenu, 0)
	}

	module.exports.init = function init (args) {
		menuArgs = args;
		const menu = Menu.buildFromTemplate(template)
		Menu.setApplicationMenu(menu)
	}