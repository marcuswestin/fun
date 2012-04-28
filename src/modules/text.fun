text = {
	trim: function(text) {
		<script text=text>
			var strip = require('std/strip')
			yieldValue(fun.expressions.Text(strip(text.getContent())))
		</script>
	}
}