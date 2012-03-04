import mouse

"Some if/else statements depending on the mouse position"

<pre>'
<div>
	"mouse: { x:" mouse.x ", y:" mouse.y " }"
</div>

<div>
	if (mouse.x >= 100) { "mouse.x >= 100" }
	else { "mouse.x < 100" }
</div>

<div>
	if (100 >= mouse.y) {
		"mouse.y < 100"
	} else {
		if (mouse.y <= 200) {
			"100 < mouse.y <= 200"
		} else {
			"100 < 200 < mouse.y"
		}
	}
</div>

<div>
	if (mouse.y <= mouse.x) { "mouse.y <= mouse.x" }
	else { "mouse.y > mouse.x" }
</div>
'</pre>

<div>
	"mouse: { x:" mouse.x ", y:" mouse.y " }"
</div>

<div>
	if (mouse.x >= 100) { "mouse.x >= 100" }
	else { "mouse.x < 100" }
</div>

<div>
	if (100 >= mouse.y) {
		"mouse.y < 100"
	} else {
		if (mouse.y <= 200) {
			"100 < mouse.y <= 200"
		} else {
			"100 < 200 < mouse.y"
		}
	}
</div>

<div>
	if (mouse.y <= mouse.x) { "mouse.y <= mouse.x" }
	else { "mouse.y > mouse.x" }
</div>
