localstorage = {
	// TODO Make this a template so that it doesn't execute multiple times
	persist:function(variable, name) {
		<script variable=variable name=name>
			if (!__hackFirstExecution) { return }
			var key = name.getContent(),
				persistedLiteral = localStorage.getItem(key)
			
			if (persistedLiteral && persistedLiteral != 'null') {
				variable.mutate('set', [fun.expressions.fromLiteral(persistedLiteral)])
			}
			
			variable.observe(function() {
				localStorage.setItem(key, variable.asLiteral())
			})
		</script>
	}
}
