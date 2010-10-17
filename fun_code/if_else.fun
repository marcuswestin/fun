<div>
	"mouse: (" Local.mouseX "," Local.mouseY ")"
</div>

<div>
	if (Local.mouseX >= 100) { "mouse.x >= 100" }
	else { "mouse.x < 100" }
</div>

<div>
	if (100 >= Local.mouseY) {
		"mouse.y < 100"
	} else {
		if (Local.mouseY <= 200) {
			"100 < mouse.y <= 200"
		} else {
			"100 < 200 < mouse.y"
		}
	}
</div>

<div>
	if (Local.mouseY <= Local.mouseX) { "mouse.y <= mouse.x" }
	else { "mouse.y > mouse.x" }
</div>