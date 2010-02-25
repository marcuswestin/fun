require('./lib/ometa-js/ometa-node');
var fs = require('fs')
var sys = require('sys')

var ometaCode = fs.readFileSync('./calc/calc.ometa') + "\n"
ometa(ometaCode)

var calcSource = fs.readFileSync('./calc/test.calc');
var tree = CalcParser.matchAll(calcSource, "expr");
var output = CalcCompiler.match(tree, "comp");
fs.writeFileSync("./output.js", output + "\n");
