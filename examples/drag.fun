import mouse

"Two divs that kind of follow the mouse."

<pre>'
var offset = 25
<div id="output1" style={ background:"red", width:100, height:100, position:"absolute", top:mouse.y + offset, left:mouse.x + offset }/>
<div id="output2" style={ background:"blue", width:50, height:50, position:"absolute", top:mouse.y + offset + 25, left:mouse.x + offset + 25 }/>
'</pre>
var offset = 25
<div id="output1" style={ background:"red", width:100, height:100, position:"absolute", top:mouse.y + offset, left:mouse.x + offset }/>
<div id="output2" style={ background:"blue", width:50, height:50, position:"absolute", top:mouse.y + offset + 25, left:mouse.x + offset + 25 }/>
