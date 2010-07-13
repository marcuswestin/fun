var fun = {},
	doc = document

fun.getDomHook = function() {
	return doc.body.appendChild(doc.createElement('div'))
}