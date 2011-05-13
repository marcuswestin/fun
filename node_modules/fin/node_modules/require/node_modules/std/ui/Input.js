var Class = require('std/Class'),
	UIComponent = require('std/ui/Component'),
	extend = require('std/extend'),
	bind = require('std/bind')

module.exports = Class(UIComponent, function(supr) {
	
	var defaults = {
		defaultValue: null
	}

	this._elTag = 'input'
	this._elType = 'text'

	this._init = function(opts) {
		supr(this, '_init', arguments)
		opts = extend(opts, defaults)
		this._defaultValue = opts.defaultValue
	}

	this.value = function(value) {
		var el = this.getElement()
		if (typeof value == 'undefined') { return el.value == this._defaultValue ? '' : el.value } // getter
		el.value = value
	}

	this._createContent = function() {
		this._on('focus', bind(this, '_onFocus'))
		this._on('blur', bind(this, '_onBlur'))
		this._on('keypress', bind(this, '_onKeyPress'))
		this._onBlur()
	}

	this._onFocus = function() {
		if (this._el.value != this._defaultValue) { return }
		this._el.value = ''
		this.removeClass('defaultValue')
	}

	this._onBlur = function() {
		if (this._el.value) { return }
		this._el.value = this._defaultValue
		this.addClass('defaultValue')
	}

	this._onKeyPress = function() {
		setTimeout(bind(this, '_publish', 'KeyPress'), 0)
	}
})
