var util = require('./util')

module.exports = {
	expressionTypes: util.listToObject(['STATIC', 'COMPOSITE', 'ITEM_PROPERTY', 'RUNTIME_ITERATOR', 'TEMPLATE_ARGUMENT', 'ALIAS', 'INVOCATION', 'INLINE_SCRIPT']),
	LOCAL_ID: -1,
	GLOBAL_ID: 0
}

