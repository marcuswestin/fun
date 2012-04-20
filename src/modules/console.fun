console = {
	log: function(a,b,c) {
		<script a=a b=b c=c>
			var args = []
			if (a) { args.push(a) }
			if (b) { args.push(b) }
			if (c) { args.push(c) }
			console.log.apply(console.log, args)
		</script>
	}
}

