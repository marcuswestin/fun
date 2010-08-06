/**********
 * Import *
 **********/
var sys = require('sys'),
	fs = require('fs'),
	child_process = require('child_process'),
	util = require('./util')

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

var compiler = require('./language/compiler'),
	grammarPath = './language/grammar.peg'

/*********
 * Parse *
 *********/
var code = fs.readFileSync('./' + opts.code),
	result = util.parseWithGrammar(code, grammarPath)
if (result.error) {
	sys.puts("Fun parse error", JSON.stringify(result))
} else if (opts.verbose) {
	var styleArr = [],
		styles = { position:'fixed', top:'5px', right:'5px', width:'500px', 
				height:'95%', border:'1px solid #333', overflow:'auto', padding: '2px' }
		
	
	for (var key in styles) { styleArr.push(key+':'+styles[key]) }
	
	var output =
		'<div style="'+styleArr.join('; ')+'">'
			+ "<b>Fun</b><pre>" + code + "</pre>"
			+ "<br/><br/>"
			+ "<b>AST</b> <pre>" + util.prettyPrint(result.ast) + "</pre>"
		+ '</div>'
	
	sys.puts(output)
}

/***********
 * Compile *
 ***********/
var compileResult = compiler.compile(result.ast)
if (compileResult.error) {
	sys.puts(JSON.stringify(compileResult))
} else {
	sys.puts("<body><script src=\"lib/fin/fin.js\"></script><script>" + compileResult + "</script></body>")
}
