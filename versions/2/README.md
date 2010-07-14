Fun parser step 2
=================
 * Created Local keyword and Local.mouseX and Local.mouseY
 * Referencing Local.mouseX and Local.mouseY references the mouse coordinates in real time

Grammar
-------
    
Added the LocalReference type, which starts with "Local." This should probably
change to be a nested thing, e.g. Local.mouse.x and Local.mouse.y
    
Compiler
--------

Added support for LocalReferences to use fin.observeLocal. Also added a call
from document mousemove to update mouseX and mouseY using fin.setLocal

Library
-------
Added fun.on for event listeners

Next steps
----------
 * Add inline XML to grammar and compiler
 * Allow for positioning a div according to the mouse X/Y coordinates
 * Create function declarations and invocations
