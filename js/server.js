/**
 * Copyright 2014-2016 Stewart Allen -- All Rights Reserved
 */

Array.prototype.contains = function(v) {
	return this.indexOf(v) >= 0;
};

Array.prototype.appendAll = function(a) {
	this.push.apply(this,a);
	return this;
};

Array.prototype.peek = function() {
	return this[this.length-1];
};

function log(o) {
	if (!o.time) o.time = time();
	console.log(encode(o));
}

function promise(resolve, reject) {
	return new Promise(resolve, reject);
}

function random() {
	return (Math.round(Math.random()*0xffffffff)).toString(36);
}

function guid() {
	return time().toString(36)+rval()+rval()+rval();
}

function time() {
	return new Date().getTime();
}

/**
 * @param {String[]} path
 */
function mkdirs(path) {
	var root = "";
	path.forEach(seg => {
		if (root) {
			root = root + "/" + seg;
		} else {
			root = seg;
		}
		lastmod(root) || fs.mkdirSync(root);
	});
}

function encode(o) {
	return JSON.stringify(o);
}

function decode(s) {
	return JSON.parse(s);
}

/**
 * sync return mtime for file or 0 for non-existent file
 *
 * @param {String} path
 * @returns {number}
 */
function mtime(path) {
	try {
		return fs.statSync(path).mtime.getTime();
	} catch (e) {
		return 0;
	}
}

// dispatch for path prefixs
// pre = array of "key", Function pairs
function prepath(pre) {

	function handle(req, res, next) {
		pre.uid = pre.uid || guid();
		req.ppi = req.ppi || {};

		var path = req.info.path,
			key, fn, i = req.ppi[pre.uid] || 0;

		while (i < pre.length) {
			key = pre[i][0];
			fn = pre[i++][1];
			if (path.indexOf(key) === 0) {
				return fn(req, res, () => {
					req.ppi[pre.uid] = i;
					handle(req, res, next);
				});
			}
		}

		next();
	}

	return handle;
}

// dispatch full fixed paths
function fullpath(map) {
	return (req, res, next) => {
		var fn = map[req.info.path];
		if (fn) fn(req, res, next);
		else next();
	};
}

// dispatch full paths based on a prefix and a function map
function fixedmap(prefix, map) {
	return (req, res, next) => {
		var path = req.info.path;
		if (path.indexOf(prefix) != 0) return next();
		var fn = map[path.substring(prefix.length)];
		if (fn) fn(req, res, next); else next();
	};
}

/**
 * @param {Object} res
 * @param {String} url
 */
function redirect(res, url) {
	res.writeHead(302, { "Location": url });
	res.end();
}

// HTTP 302 redirect
function redir(path) {
	return (req, res, next) => redirect(res, path);
}

// mangle request path
function remap(path) {
	return (req, res, next) => {
		req.url = req.info.path = path;
		next();
	}
}

/**
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
function setup(req, res, next) {
	var parsed = url.parse(req.url, true);

	req.info = {
		time: time(),
		url: parsed,
		path: parsed.pathname,
		query: parsed.query,
	};

	if (req.method === 'OPTIONS') {
		addCorsHeaders(req, res);
		res.end();
    } else {
        next();
    }
}

function addCorsHeaders(req, res, headers) {
	if (headers) res.setHeader('Access-Control-Allow-Headers', headers.join(', '));
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.setHeader("Access-Control-Allow-Origin", req.headers['origin'] || '*');
	res.setHeader("Allow", "GET,POST,OPTIONS");
}

/* *********************************************
 * Start it up
 ********************************************* */

var port = 8000,
  	fs = require('fs'),
  	url = require('url'),
  	dns = require('dns'),
  	util = require('util'),
  	spawn = require('child_process').spawn,
  	connect = require('connect'),
  	serveStatic = require('serve-static'),
  	querystring = require('querystring'),
 	currentDir = process.cwd(),
 	startTime = time(),
	serveWeb = serveStatic(currentDir+"/web/"),
	serveCode = serveStatic(currentDir+"/js/");


// ajax api
var api = {
	log: (req, res, next) => {
		log(req.info.query);
		res.end("got it");
	}
};

// read command line args
process.argv.slice(2).forEach(arg => {
	switch (arg) {
		default: break;
	}
});

// create web handler chain
connect()
	.use(setup)
	.use(fullpath({
		"/index.html" : redir("/"),
	}))
	// .use(prepath([
	// 	[ "/js/", keyFunctionPairs ]
	// ]))
	.use(fixedmap("/api/", api))
	.use(serveWeb)
	.use(serveCode)
	.listen(port);

console.log("-------------------------------------------");
console.log(new Date());
console.log("web worker test server started on port="+port);
console.log("-------------------------------------------");
