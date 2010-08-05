"mouse: (" Local.mouseX "," Local.mouseY ")"

if (Local.mouseX >= 100) { "mouse.x >= 100" }
else { "mouse.x < 100" }

if (100 < Local.mouseY) {
	if (Local.mouseY <= 200) {
		"100 < mouse.y <= 200"
	} else {
		"100 < 200 < mouse.y"
	}
} else {
	"mouse.y < 100"
}

if (Local.mouseY <= Local.mouseX) { "mouse.y <= mouse.x" }
else { "mouse.y > mouse.x" }
