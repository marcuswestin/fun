var localstorage = {
	persist:function(variable, name) {
		<script variable=variable name=name>
			var key = name.getContent(),
				persistedJSON = localStorage.getItem(key)
			
			if (persistedJSON && persistedJSON != 'null') {
				variable.set(null, fun.expressions.fromJSON(persistedJSON))
			}
			
			variable.observe(function() {
				localStorage.setItem(key, variable.asJSON())
			})
		</script>
	}
}
