Emitting expressions
--------------------
An emitting expression is a value, a composite, a variable reference, with an optional chain.

A chain is simply a walk down a property path, e.g. if var foo={ bar:1 }, then foo.bar is a variable reference with the chain "bar", and 1.foo.bar is the value 1 with the chain "foo.bar" (which will emit null).

A value is simply a type and some content. In the JS implementation, "hi" is represented as { type:'text', content:'hi' } and 1 as { type:'number', content:1 }

A composite is an operator and two values, e.g. { left:{ type:'number', content:1 }, operator:'+', right:{ type:'number', content:2 } }.
	Alternatively, a composite can be a prefix operator with a single value, e.g. { prefix:'!', value:{ type:'logic', content:true } }

A variable has a name, a list of observers, and some content, e.g. { name:'foo', observers:{ '':[Function, ...], 'foo.bar':[Function, ...] }, content:{ type:'text', content:'hi' } }.
	A variables content is always static and non-composite - e.g. numbers, texts, dictionaries, lists, functions, handlers...



Aliases
-------
Aliases are resolved at compile-time to their values, and cannot be changed.