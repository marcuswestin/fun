exports.highlightLine = function(line) {
	return line
		.replace(/"([^"]*)"/g, function(m) { return '<span class="string">'+m+'</span>'})
		.replace(/(let|for|in|if|else) /g, function(m) { return '<span class="keyword">'+m+'</span>'})
		.replace(/(handler) ?/g, function(m) { return '<span class="type">'+m+'</span>'})
		.replace(/(Session|Local|Global)/g, function(m) { return '<span class="global">'+m+'</span>'})
		.replace(/(data|onClick)=/g, function(m,m2) { return '<span class="attr">'+m2+'</span>='})
		.replace(/(&lt;|&gt;)/g, function(m) { return '<span class="xml">'+m+'</span>'})
		.replace(/ = /g, '<span class="operator"> = </span>')
}

exports.highlightCode = function(code) {
	var lines = code.split('\n'),
		newLines = []
	
	for (var i=0; i < lines.length; i++) {
		newLines.push(exports.highlightLine(lines[i]))
	}
	return newLines.join('\n')
}