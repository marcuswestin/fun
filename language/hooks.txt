A Hook is a node in the DOM that corresponds to an emitting Fun statement.

Each hook has a an ID and a name. The ID is unique for each hook and gets assigned either statically at compile time, or dynamically at run time. A for loop can generate any number of dom hooks at runtime, and each hook will be assigned a unique ID.

The name of a hook corresponds to a javascript variable, and is generated at compile time. Each time a for loop emits it will create new hooks with unique IDs, but the hooks will share the same name. Since the code for emitting the output of a for loop exists within a closure, each emit will reference a unique set of DOM hooks. 
