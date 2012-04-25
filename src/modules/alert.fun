alert = function(a,b,c) {
	<script a=a b=b c=c>
		var msg = []
		if (a) { msg.push(a) }
		if (b) { msg.push(b) }
		if (c) { msg.push(c) }
		alert(msg.join(' '))
	</script>
}
