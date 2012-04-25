var reporter = require('nodeunit').reporters.default;

var run = function(files) {
	reporter.run(['test/tests/'+files[0]], null, function(err) {
		if (err) { return }
		files.shift()
		if (files.length) { run(files) }
	})
}

var tests = []
tests.push('test-1-runtime-library.js')
tests.push('test-2-parser.js')
tests.push('test-3-resolver.js')
tests.push('test-4-compiler.js')

run(tests)