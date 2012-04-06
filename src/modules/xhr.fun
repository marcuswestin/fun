let xhr = {
	post:function(path, args, responseHandler) {
		return xhr._send('post', path, args, responseHandler)
	},
	get: function(path, args, responseHandler) {
		return xhr._send('get',  path, args, responseHandler)
	},
	_send: function(method, path, args, responseHandler) {
		let result = { loading:true, error:null, response:null }
		<script method=method path=path args=args responseHandler=responseHandler result=result>
			var xhr = require('std/xhr')
			xhr[method.asString()](path.asString(), args, function(err, response) {
				if (responseHandler && !responseHandler.isNull()) {
					var event = fun.expressions.fromJsValue({ type:'xhr-response', error:err, response:response })
					responseHandler.handle(event)
				}
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
