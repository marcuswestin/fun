var preprocessor = exports,
	fs = require('fs')

preprocessor.preprocess = function(code, rootPath) {
	var importRegex = /import\s+["']([\w\/]+)["']/,
		match,
		imported = {}
	
	while (match = code.match(importRegex)) {
		var fullMatch = match[0],
			moduleName = match[1],
			codePath = rootPath + '/' + moduleName + '.fun',
			importedCode = fs.readFileSync(codePath)
		
		code = code.replace(match[0], importedCode)
	}
	
	return code
}