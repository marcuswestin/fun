import Mouse

<div>
	"Mouse: { x:" Mouse.x ", y:" Mouse.y " }"
</div>

<div>
	if (Mouse.x >= 100) { "mouse.x >= 100" }
	else { "mouse.x < 100" }
</div>

<div>
	if (100 >= Mouse.y) {
		"mouse.y < 100"
	} else {
		if (Mouse.y <= 200) {
			"100 < mouse.y <= 200"
		} else {
			"100 < 200 < mouse.y"
		}
	}
</div>

<div>
	if (Mouse.y <= Mouse.x) { "mouse.y <= mouse.x" }
	else { "mouse.y > mouse.x" }
</div>
