void(function() {
	window.HistoryModule = {
		navigate: _navigate
	}
	
	var _lastState = location.hash.substr(1),
		_pollInterval = 50
	
	function _navigate(state) {
		_lastState = state
		location.hash = '#'+state
		fun.mutate('SET', 'LOCAL', '__History_state__', [state])
	}
	
	function _pollHistory() {
		var currentState = location.hash.substr(1)
		if (currentState == _lastState) { return }
		_navigate(currentState)
	}
	
	function _init() {
		setInterval(_pollHistory, _pollInterval)
	}
	
	_init()
})()
