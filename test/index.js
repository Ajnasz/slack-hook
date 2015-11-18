/*jshint node: true*/
/*global describe, beforeEach, afterEach, it*/
/*eslint-env node*/

var slackHook = require('../index');
var assert = require('assert');
var url = require('url');

var http = require('http');
var querystring = require('querystring');

function post(port, data, ok, fail) {
	'use strict';
	var options = url.parse('http://localhost:' + port);

	var postData = querystring.stringify(data);

	options.header = {
		'Content-Type': 'application/x-www-form-urlencoded',
		'Content-Length': postData.length
	};
	options.method = 'POST';

	var req = http
		.request(options, ok)
		.on('error', fail || function (err) {
			console.error(err);
			throw new Error('request failed');
		});

	req.write(postData);

	req.end();
}

describe('server', function () {
	'use strict';

	var server, token = 'SecretToken' + Math.random(), port;

	beforeEach(function (done) {
		server = slackHook(token);
		port = 15000 + Math.round(Math.random() * 10000);
		server.server.listen(port, function () {
			done();
		});
	});

	afterEach(function () {
		server.server.close();
	});

	describe('prevalidations', function () {
		it('should respond invalid method for get request', function (done) {
			http.get('http://localhost:' + port, function (res) {
				var expected = 405;
				var actual = res.statusCode;

				assert.equal(actual, expected, 'Should not allow GET method');
				done();
			}).on('error', function (err) {
				console.error(err);
				throw new Error('request failed');
			});
		});

		it('should not say invalid method for POST', function (done) {
			post(port, {}, function (res) {
				var notExpected = 405;
				var actual = res.statusCode;

				assert.notEqual(notExpected, actual);
				done();
			});
		});

		it('should say permission denied with invalid token', function (done) {
			post(port, {
				token: token + 'INVALID'
			}, function (res) {
				var expected = 403;
				var actual = res.statusCode;

				assert.equal(actual, expected);
				done();
			});
		});

		it('should say 200 with valid token', function (done) {
			post(port, {
				token: token
			}, function (res) {
				var expected = 200;
				var actual = res.statusCode;

				assert.equal(actual, expected);
				done();
			});
		});
	});

	describe('middlewares', function () {
		it('should call middleware', function (done) {
			var called = false;

			server.use(function (serv) {
				called = true;

				return Promise.resolve(serv);
			});

			post(port, {
				token: token
			}, function () {
				var expected = true;
				var actual = called;

				assert.equal(actual, expected);
				done();
			});
		});

		it('should respond 200 if middleware resolved', function (done) {
			server.use(function (serv) {
				return Promise.resolve(serv);
			});

			post(port, {
				token: token
			}, function (res) {
				var expected = 200;
				var actual = res.statusCode;

				assert.equal(actual, expected);
				done();
			});
		});

		it('should have serv.req property', function (done) {
			var rServ;

			server.use(function (serv) {
				rServ = serv;
				return Promise.resolve(serv);
			});

			post(port, {
				token: token
			}, function () {
				var actual = typeof rServ.req;
				var expected = 'object';

				assert.equal(actual, expected);
				done();
			});
		});

		it('should have serv.res property', function (done) {
			var rServ;

			server.use(function (serv) {
				rServ = serv;
				return Promise.resolve(serv);
			});

			post(port, {
				token: token
			}, function () {
				var actual = typeof rServ.res;
				var expected = 'object';

				assert.equal(actual, expected);
				done();
			});
		});

		it('should have serv.req.body property', function (done) {
			var rServ;

			server.use(function (serv) {
				rServ = serv;
				return Promise.resolve(serv);
			});

			post(port, {
				token: token
			}, function () {
				var actual = typeof rServ.req.body;
				var expected = 'object';

				assert.equal(actual, expected);
				done();
			});
		});

		it('should add all posted param to serv.req.body', function (done) {
			var rServ;

			server.use(function (serv) {
				rServ = serv;
				return Promise.resolve(serv);
			});

			var data = {
				token: token
			};

			var key = 'Foo' + Math.random(),
				value = 'Bar' + Math.random();

			data[key] = value;

			post(port, data, function () {
				var actual = typeof rServ.req.body[key];
				var expected = 'string';

				assert.equal(actual, expected);

				actual = rServ.req.body[key];
				expected = value;

				assert.equal(actual, expected);

				done();
			});
		});

		it('should respond with given responseText', function (done) {
			var text = 'Response Text ' + Math.random();

			server.use(function (serv) {
				serv.respond(text);
				return Promise.resolve(serv);
			});

			post(port, {
				token: token
			}, function (res) {
				var actual = '';
				var expected = text;

				res.on('data', function (data) {
					actual += data.toString('utf8');
				});

				res.on('end', function () {
					assert.equal(actual, expected);
					done();
				});
			});
		});

		it('should respond with 200 if has responseText', function (done) {
			var text = 'Response Text ' + Math.random();

			server.use(function (serv) {
				serv.respond(text);
				return Promise.resolve(serv);
			});

			post(port, {
				token: token
			}, function (res) {
				var actual = res.statusCode;
				var expected = 200;

				assert.equal(actual, expected);
				done();
			});
		});

		it('should respond with given status code on error', function (done) {
			var code = 900;

			server.use(function (serv) {
				serv.error = {
					statusCode: code
				};
				return Promise.reject(serv);
			});

			post(port, {
				token: token
			}, function (res) {
				var actual = res.statusCode;
				var expected = code;

				assert.equal(actual, expected);
				done();
			});
		});

		it('should respond with given message code on error', function (done) {
			var text = 'Response Text ' + Math.random();

			server.use(function (serv) {
				serv.error = {
					message: text
				};
				return Promise.reject(serv);
			});

			post(port, {
				token: token
			}, function (res) {
				var actual = '';
				var expected = text;


				res.on('data', function (data) {
					actual += data.toString('utf8');
				});

				res.on('end', function () {
					assert.equal(actual, expected);
					done();
				});
			});
		});
	});
});
