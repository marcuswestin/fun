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
	opts = { grammar: 1, code: 'name_and_age.fun', verbose: true }

void(function(){
	for (var i=0, arg; arg = args[i]; i++) {
		var kvp = arg.split('=')
		opts[kvp[0]] = kvp[1]
	}
})()

if (opts.verbose.toLowerCase() == 'false') { opts.verbose = false }

var compiler = require('./versions/' + opts.grammar + '/compiler'),
	grammarPath = './versions/' + opts.grammar + '/grammar.peg'

/*********
 * Parse *
 *********/
var result = util.parseWithGrammar('./versions/' + opts.grammar + '/samples/' + opts.code, grammarPath)
if (result.error) {
	sys.puts("Error: " + result.error)
} else if (opts.verbose) {
	sys.puts("AST:", util.prettyPrint(result.ast))
}

/***********
 * Compile *
 ***********/
var output = compiler.compile(result.ast)
if (opts.verbose) {
	sys.puts("Output:")
}
sys.puts("<body><script>" + output + "</script></body>")
