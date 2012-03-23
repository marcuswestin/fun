let filter = function(list, func) {
	<script list=list func=func>
		var result = [],
			items = list.getContent()
		// TODO use list.iterate(function(item) { ... }
		for (var i=0, item; item=items[i]; i++) {
			if (func.invoke([item]).isTruthy()) {
				result.push(item)
			}
		}
		yieldValue(result)
	</script>
}
