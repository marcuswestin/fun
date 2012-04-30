uuid = {
	v4:function() {
		result = null
		<script result=result>
			// http://blog.snowfinch.net/post/3254029029/uuid-v4-js Public domain by Snowfinch. Thanks!
			var uuid = "", i, random;
			for (i = 0; i < 32; i++) {
				random = Math.random() * 16 | 0;
			
				if (i == 8 || i == 12 || i == 16 || i == 20) {
					uuid += "-"
				}
				uuid += (i == 12 ? 4 : (i == 16 ? (random & 3 | 8) : random)).toString(16);
			}
			fun.set(result, uuid)
		</script>
		return result.copy()
	}
}
