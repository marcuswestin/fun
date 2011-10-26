var util = require('./util')

module.exports = {
	expressionTypes: util.listToObject(['STATIC', 'COMPOSITE', 'RUNTIME_ITERATOR', 'TEMPLATE_ARGUMENT', 'ALIAS', 'INVOCATION', 'INLINE_SCRIPT', 'OBJECT_LITERAL', 'VALUE_LITERAL']),
	LOCAL_ID: -1,
	GLOBAL_ID: 0
}

