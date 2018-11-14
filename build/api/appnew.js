var ApiBuilder = require('claudia-api-builder'),
  versionAPI = new ApiBuilder();

var versionInfo = require ('./version.json');

module.exports = versionAPI;

versionAPI.get('/macversion2', function (request) {
    var vversion = versionInfo.version;

    var qVersion = request.queryString.version;

    var responseBody = null;
    var contentType = "text/plain";
    var status = 204;

    var d = new Date();
	var platform = versionInfo.platform;
    var latestRelease = versionInfo;
	latestRelease.url = "http://downloads.machttp.org/machttp-js/" + platform + "/MacHTTP-js-" + vversion + "-" + platform + ".zip";
	latestRelease.name = "MacHTTP-js " + vversion;


    if (qVersion === vversion) {
        console.log ("version is current");
    } else {
        console.log ("sending new version info");
        responseBody = latestRelease;
        status = 200;
        contentType = "application/json";
    }
	return new versionAPI.ApiResponse (responseBody, {'Content-Type' : contentType}, status);
});
