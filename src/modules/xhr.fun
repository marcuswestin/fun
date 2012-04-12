xhr = {
	post:function(path, args, responseHandler) {
		return xhr._send('post', path, args, responseHandler)
	},
	get: function(path, args, responseHandler) {
		return xhr._send('get',  path, args, responseHandler)
	},
	_send: function(method, path, args, responseHandler) {
		result = { loading:true, error:null, response:null }
		<script method=method path=path args=args responseHandler=responseHandler result=result>
			if (!__hackFirstExecution) { return }
			var xhr = require('fun/node_modules/std/xhr')
			xhr[method.asString()](path.asString(), args && args.asJSONObject(), function(err, response) {
				if (responseHandler && !responseHandler.isNull()) {
					var event = fun.expressions.fromJsValue({ type:'xhr-response', error:err, response:response })
					responseHandler.invoke(null, event)
				}
				result.set(['loading'], fun.expressions.No)
				if (err) {
					result.set(['error'], fun.expressions.fromJsValue(err))
				} else {
					result.set(['response'], fun.expressions.fromJsValue(response))
				}
			})
		</script>
		return result
	}
}
