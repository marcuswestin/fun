var Class = require('../Class'),
	Component = require('./Component'),
	extend = require('../extend')

module.exports = Class(Component, function() {
	
	var defaults = {
		title: 'Select',
		values: []
	}

	this._init = function(opts) {
		opts = extend(opts, defaults)
		this._values = [opts.title].concat(opts.values)
	}

	this._createElement = function() {
		this.append(this._dom({ 'class':'label', html:this._title }))
		var dropDown = this.append(this._dom({ class:'dropDown' }))
		var arrowStyle = { border:'10px dotted #333', borderStyleBottom:'solid' }
		dropDown.appendChild(this._dom({ 'class':'arrow', style:arrowStyle }))
		this._menu = this._dom({ 'class':'values' })
	}
}
