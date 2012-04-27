<link rel="stylesheet" href="./codemirror.css" />
<script src="./codemirror.js"></script>

codemirror = {
	render:template(size, changeHandler) {
		sizeStyle = { style:size }
		<script sizeStyle=sizeStyle changeHandler=changeHandler>
			var xhr = require('fun/node_modules/std/xhr')
			
			fun.hooks[hookName].style.display = 'block'
			fun.attrExpand(hookName, sizeStyle)
			
			xhr.get('/ide/load', null, function(err, res) {
				if (err) {
					console.warn(err)
					return
				}
				
				var editor = CodeMirror(fun.hooks[hookName], { value:res, onChange:onChange })
				onChange(editor)
			})
			
			function onChange(editor, change) {
				xhr.post('/ide/compile', { code:encodeURIComponent(editor.getValue()) }, function(err, html) {
					var event = fun.expressions.fromJsValue({ error:err, html:html })
					changeHandler.invoke([event])
				})
			}
		</script>
	}
}