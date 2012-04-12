text = {
	trim: function(text) {
		<script text=text>
			var strip = require('fun/node_modules/std/strip')
			yieldValue(fun.expressions.Text(strip(text.getContent())))
		</script>
	}
}