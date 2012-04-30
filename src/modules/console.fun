console = {
	log: function(a,b,c) {
		<script a=a b=b c=c>
			var args = []
			if (a) { args.push(a.toJSON()) }
			if (b) { args.push(b.toJSON()) }
			if (c) { args.push(c.toJSON()) }
			window.console.log.apply(console, args)
		</script>
	}
}

