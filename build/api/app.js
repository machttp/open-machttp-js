/**
 * 
 * @file 
 * @author cshotton
 * @copyright Copyright ©2016, Chuck Shotton. All rights reserved.
 */
var ApiBuilder = require('claudia-api-builder'),
  versionAPI = new ApiBuilder();

const AWS = require ('aws-sdk');
AWS.config.update({accessKeyId: 'XXXX', secretAccessKey: 'YYYY'});
var s3 = new AWS.S3();

function GetS3ReleaseInfo (key) {
	var params = {Bucket: 'downloads.machttp.org', Key: "machttp-js/" + key + "/version.json"};
	console.log ("getting s3 data");
	return s3.getObject(params).promise();
}

function CheckVersion (version, platform) {
	return GetS3ReleaseInfo (platform).then (function (data) {
			var v = JSON.parse (data.Body.toString());
			var status = 204;
			var contentType = "text/plain";
			var responseBody = null;
			
			if (version !== v.version) {
				status = 200;
				contentType = "application/json";
				responseBody = v;
			}
			
			return new versionAPI.ApiResponse (responseBody, {'Content-Type' : contentType}, status);
		});
}

versionAPI.get('/macversion', function (request) {
    var qVersion = request.queryString.version;
	return CheckVersion (qVersion, "mac");
});

module.exports = versionAPI;

