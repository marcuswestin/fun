var curry = require('./curry'),
	map = require('./map')

module.exports = {
	request: request,
	get: curry(request, 'get'),
	post: curry(request, 'post'),
	jsonGet: curry(json, 'get'),
	jsonPost: curry(json, 'post')
}

var XHR = window.XMLHttpRequest || function() { return new ActiveXObject("Msxml2.XMLHTTP"); }

function request(method, url, params, callback, opts) {
	var xhr = new XHR()
	method = method.toUpperCase()
	opts = opts || {}
	xhr.onreadystatechange = function() {
		var err, result
		try {
			if (xhr.readyState != 4) { return }
			if (xhr.status != 200) { return callback(new Error(xhr.status)) }
			result = (opts.json ? JSON.parse(xhr.responseText) : xhr.responseText)
		} catch(e) {
			err = e
		}
		if (err || result) {
			_abortXHR(xhr)
			callback(err, result)
		}
	}
	var data = null,
		encode = (opts.encode !== false),
		queryArr = map(params, function(value, key) {
			return (encode ? encodeURIComponent(key) : key) + '=' + (encode ? encodeURIComponent(JSON.stringify(value)) : value) })
	if (method == 'GET') {
		if (url.indexOf('?') == -1) { url = url + '?' }
		url += queryArr.join('&')
	} else if (method == 'POST') {
		data = queryArr.join('&')
	}
	xhr.open(method, url, true)
	if (method == 'POST') {
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.setRequestHeader("Content-length", data.length);
		xhr.setRequestHeader("Connection", "close");
	}
	xhr.send(data)
}

function json(method, url, params, callback) {
	return request(method, url, params, callback, { json:true })
}

function _abortXHR(xhr) {
	try {
		if('onload' in xhr) {
			xhr.onload = xhr.onerror = xhr.ontimeout = null;
		} else if('onreadystatechange' in xhr) {
			xhr.onreadystatechange = null;
		}
		if(xhr.abort) { xhr.abort(); }
	} catch(e) {}
}
