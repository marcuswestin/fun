alert = function(a,b,c) {
	<script a=a b=b c=c>
		var msg = []
		if (a) { msg.push(a.asString()) }
		if (b) { msg.push(b.asString()) }
		if (c) { msg.push(c.asString()) }
		alert(msg.join(' '))
	</script>
}
