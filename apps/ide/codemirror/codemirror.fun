<link rel="stylesheet" href="./codemirror.css" />
<script src="./codemirror.js"></script>

codemirror = {
	render:template(size, changeHandler) {
		sizeStyle = { style:size }
		<script sizeStyle=sizeStyle changeHandler=changeHandler>
			var xhr = require('fun/node_modules/std/xhr')
			
			fun.hooks[hookName].style.display = 'block'
			fun.attrExpand(hookName, sizeStyle)
			
			var code = [
				'world = \'world\'',
				'<div>\'Hello \'world</div onclick=handler() {',
				'	world set: \'fun world!\'',
				'}>']
			
			CodeMirror(fun.hooks[hookName], { value:code.join('\\n'), onChange:function(editor, change) {
				xhr.post('/compile', { code:encodeURIComponent(editor.getValue()) }, function(err, html) {
					var event = fun.expressions.fromJsValue({ error:err, html:html })
					changeHandler.invoke([event])
				})
			} })
		</script>
	}
}