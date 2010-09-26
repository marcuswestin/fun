/**********
 * Import *
 **********/
var sys = require('sys'),
	fs = require('fs'),
	child_process = require('child_process'),
	util = require('./util'),
	syntaxHighlighter = require('./syntaxHighlighter')

/*****************************
 * Parse commandline options *
 *****************************/
var args = process.argv.slice(2),
	opts = { code: 'fun_code/if_else.fun', verbose: "true" }

void(function(){
	for (var i=0, arg; arg = args[i]; i++) {
		var kvp = arg.split('=')
		opts[kvp[0]] = kvp[1]
	}
})()

if (opts.verbose.toLowerCase() == 'false') { opts.verbose = false }

if (!opts.code) {
	var files = fs.readdirSync('./fun_code/')
	for (var i=0, file; file = files[i]; i++) {
		if (!file.match(/\.fun$/)) { continue }
		sys.puts('<br /><a href="parse_and_run?code='+file+'">'+file+'</a>')
	}
} else {
	var compiler = require('./language/compiler'),
		grammarPath = './language/grammar.peg'

	/*********
	 * Parse *
	 *********/
	var code = fs.readFileSync('./' + opts.code).toString(),
		result = util.parseWithGrammar(code, grammarPath)
	if (result.error) {
		sys.puts("Fun parse error", JSON.stringify(result))
	} else if (opts.verbose) {
		var displayCode = code
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')

		var output = '<link href="syntaxHighlighter.css" type="text/css" rel="stylesheet" />'
			+ '<div id="verbose-output">'
				+ '<button onclick="document.getElementById(\'verbose-output\').style.display=\'none\';">hide</button>'
				+ "<b>Fun</b><pre><code>" + syntaxHighlighter.highlightCode(displayCode) + "</code></pre>"
				+ "<br/><br/>"
				+ "<b>AST</b><pre>" + util.prettyPrint(result.ast) + "</pre>"
			+ '</div>'

		sys.puts(output)
	}

	/***********
	 * Compile *
	 ***********/
	var compileResult = compiler.compile(result.ast)
	if (compileResult.error) {
		sys.puts(JSON.stringify(compileResult).replace(/\\n/g, '<br /> - '))
	} else {
		sys.puts("<body><script src=\"lib/fin/fin.js\"></script><script>" + compileResult + "</script></body>")
	}
}

