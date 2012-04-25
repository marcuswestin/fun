localstorage = {
	// TODO Make this a template so that it doesn't execute multiple times
	persist:function(variable, name) {
		<script variable=variable name=name>
			if (!__hackFirstExecution) { return }
			var key = name.getContent(),
				persistedJSON = localStorage.getItem(key)
			
			if (persistedJSON && persistedJSON != 'null') {
				variable.mutate('set', [fun.expressions.fromJSON(persistedJSON)])
			}
			
			variable.observe(function() {
				localStorage.setItem(key, variable.asJSON())
			})
		</script>
	}
}
