void(function() {
	window.FacebookModule = {}
	
	var fbRootDiv, doc = document
	FacebookModule.connect = function(appId) {
		FB.init({ appId:appId, status:true, cookie:true, xfbml:false })
		FB.login(_handleLoginResponse)
	}
	
	function _handleLoginResponse(response) {
		if (response.status == 'connected') {
			fun.mutate('SET', 'LOCAL', '__FacebookConnected__', [true])
		}
	}
	
	function _init() {
		fbRootDiv = doc.body.appendChild(doc.createElement('div'))
		fbRootDiv.id = 'fb-root'
		fbRootDiv.style.display = 'none'
		
		var s = doc.createElement('script')
		s.type = 'text/javascript'
		s.src = '//connect.facebook.net/en_US/all.js'
		s.async = true
		fbRootDiv.appendChild(s)
	}
	
	_init()
})();
