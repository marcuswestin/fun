void(function() {
	window.FacebookModule = {
		connect: connect
	}
	
	var doc = document,
		fbRootDiv
	
	function connect(appId) {
		FB.init({ appId:appId, status:true, cookie:true, xfbml:false })
		FB.login(_handleLoginResponse)
	}
	
	function _handleLoginResponse(response) {
		if (response.status == 'connected') {
			fun.mutate('SET', fun.local, '__Facebook_connected__', [true])
			fun.mutate('SET', fun.local, '__Facebook_user_id__', [response.session.uid])
			FB.api('/me', function(response) {
				fun.mutate('SET', fun.local, '__Facebook_user_name__', [response.name])
			});
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
		
		fun.mutate('SET', fun.local, '__Facebook_connected__', [false])
	}
	
	_init()
	
})();
