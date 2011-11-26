var proto = require('std/proto')

var number = proto(function(content) { this.content = content }, {
	type:'number',
	atomic:true,
	// asText:function() { return text(this.content.toString()) }
	toString:function() { return this.content.toString() }
})

var text = proto(function(content) { this.content = content }, {
	type:'text',
	atomic:true,
	// asText:function() { return this },
	toString:function() { return this.content }
})

module.exports = {
	number:number,
	string:text,
	text:text
}
