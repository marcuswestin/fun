var fs = require('fs')

exports.prettyPrint = function(ast, indent) {
	if (ast instanceof Array) {
		var result = []
		for (var i=0; i < ast.length; i++) {
			result.push(util.prettyPrint(ast[i], indent))
		}
		return "\n" + result.join('')
	} else if (typeof ast == 'object') {
		indent = (typeof indent == 'undefined' ? '' : indent + '\t')
		var result = []
		for (var key in ast) {
			result.push(indent + key + ':' + util.prettyPrint(ast[key], indent))
		}
		return "\n" + result.join('')
	} else {
		return JSON.stringify(ast) + "\n"
	}
}

exports.highlightCode = function(code) {
	var lines = code.split('\n'), newLines = []
	for (var i=0; i < lines.length; i++) {
		newLines.push(exports.highlightLine(lines[i]))
	}
	return newLines.join('\n')
}
function highlightLine(line) {
	return line
		.replace(/"([^"]*)"/g, function(m) { return '<span class="string">'+m+'</span>'})
		.replace(/'([^']*)'/g, function(m) { return '<span class="string">'+m+'</span>'})
		.replace(/(let|for|in|if|else) /g, function(m) { return '<span class="keyword">'+m+'</span>'})
		.replace(/(handler) ?/g, function(m) { return '<span class="type">'+m+'</span>'})
		.replace(/(Session|Local|Global)/g, function(m) { return '<span class="global">'+m+'</span>'})
		.replace(/(data|onClick)=/g, function(m,m2) { return '<span class="attr">'+m2+'</span>='})
		.replace(/(&lt;|&gt;)/g, function(m) { return '<span class="xml">'+m+'</span>'})
		.replace(/ = /g, '<span class="operator"> = </span>')
}
