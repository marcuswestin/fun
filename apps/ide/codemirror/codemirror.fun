<link rel="stylesheet" href="./codemirror.css" />
<script src="./codemirror.js"></script>

codemirror = {
	render:template(size) {
		sizeStyle = { style:size }
		<script sizeStyle=sizeStyle>
			fun.hooks[hookName].style.display = 'block'
			fun.attrExpand(hookName, sizeStyle)
			CodeMirror(fun.hooks[hookName], { value:'foo bar cat', onChange:onChange })
			
			var form = fun.hooks[hookName].appendChild(document.createElement('form'))
			form.style.display = 'none'
			form.action = '/compile'
			form.method = 'post'
			form.target = 'output'
			
			var codeInput = form.appendChild(document.createElement('input'))
			codeInput.name = 'code'
			
			function onChange(editor, change) {
				codeInput.value = encodeURIComponent(editor.getValue())
				form.submit()
			}
		</script>
	}
}