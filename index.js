/*jshint node: true*/
/*eslint-env node*/

var http = require('http');
var querystring = require('querystring');

var debug = {
	error: function () {
		'use strict';
		if (process.env.DEBUG) {
			console.error.apply(console, arguments);
		}
	},
	log: function () {
		'use strict';
		if (process.env.DEBUG) {
			console.log.apply(console, arguments);
		}
	}
};

function validateMethod(serv) {
	'use strict';

	return new Promise(function (resolve, reject) {

		debug.log('validate method');

		if (serv.req.method === 'POST') {
			resolve(serv);
		} else {
			serv.error = {
				statusCode: 405,
				message: 'Invalid Method'
			};
			reject(serv);
		}
	});
}

function parseBody(serv) {
	'use strict';
	return new Promise(function (resolve, reject) {
		var body = '';

		serv.req.on('data', function (data) {
			body += data.toString('utf8');
		});

		serv.req.on('end', function () {
			serv.req.body = querystring.parse(body);

			resolve(serv);
		});

		serv.req.on('error', function (e) {
			serv.error = {
				statusCode: 500,
				message: e.message
			};
			reject(serv);
		});
	});
}

function validateSlackToken(slackToken) {
	'use strict';

	return function (serv) {
		return new Promise(function (resolve, reject) {
			if (serv.req.body.token !== slackToken) {
				serv.error = {
					statusCode: 403,
					message: 'Permission Denied'
				};
				reject(serv);
			} else {
				resolve(serv);
			}
		});
	};
}

function catchErr(serv) {
	'use strict';

	debug.log('catch error');

	debug.error(serv.error);
	serv.res.writeHead(serv.error.statusCode || 500);
	serv.res.end(serv.error.message || 'Error occured');


	debug.error('Error occured', serv.error);
}

function httpHandler(token, cb) {
	'use strict';

	return function onRequest(req, res) {
		var serv;

		debug.log('request');


		var promise = new Promise(function (resolve) {

			serv = {
				req: req,
				res: res
			};

			serv.respond = function (text) {
				serv.responseText = text;
			};

			resolve(serv);
		})
		.then(validateMethod)
		.then(parseBody)
		.then(validateSlackToken(token));

		debug.log('validators added');

		cb(promise)
			.then(function (serv) {
				serv.res.writeHead(200);
				serv.res.end(serv.responseText);
			})
			.catch(catchErr);
	};
}

function createServer(token) {
	'use strict';

	var middlewares = [];

	var server = http.createServer(httpHandler(token, function (promise) {
		debug.log('add user methods');

		middlewares.forEach(function (middleware) {
			promise = middleware(promise);
		});

		return promise;
	}));

	return {
		server: server,
		use: function (cb) {
			middlewares.push(cb);
		}
	};
}

module.exports = function (token) {
	'use strict';

	return createServer(token);
};
