Fun parser step 1
=================

Grammar
-------
The grammar consists of a series of statements, where each 
statement is a declaration, a value, or a reference. 

 * A declaration assigns an alias to a value. 
 * A value is either an integer or a string. 
 * A reference references the value of a previous declaration.

EOF is not dealt with well - a script is required to end in a
single newline or it fails to parse.

Compiler
--------
The compiler takes an AST and compiles it into javascript, which
executes in an anonymous closure.

Each declaration results in a uniquely named variable local to the
closure. References to that declaration become references to the
uniquely named javascript variable.

Each fun statement that resolves to a value acquires an element in 
the dom (its "dom hook") and outputs code to manipulate the contents 
of that element.

The compiled javascript includes the contents of a library file lib.js.

Library
-------
A library of javascript utility functions get injected into the
compiled javascript. This library will serve to assist the compiled
javascript for things like references to the dom and hooking up 
to fin.

Next steps
----------

 * Create Local keyword and Local.mouse.x/y
 * Add inline XML to grammar and compiler
 * Create function declarations and invocations
