require('./lib/ometa-js/ometa-node');
var fs = require('fs')
var sys = require('sys')

var ometaCode = fs.readFileSync('./parsers/fun.ometa') + "\n"
try {
	ometa(ometaCode)
	
	var code = fs.readFileSync(process.argv[2]);
	
	var tree = FunParser.matchAll(code, "Fun");
	sys.puts(tree)
	
} catch(e) {
	error = true
	var errorMsg = "Error: " + e;
	if (e.errorPos) { 
		errorMsg += " at pos " + e.errorPos + " >>>" + ometaCode.substr(e.errorPos, 30) 
	}
	sys.puts(errorMsg)
}

// var output = CalcCompiler.match(tree, "xml");
// fs.writeFileSync("./output.js", output + "\n");
