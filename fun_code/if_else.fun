if (Local.mouseX > 100) {
	"mouse.x is greater than 100: "
	Local.mouseX
} else {
	"mouse.x less than 100: "
	Local.mouseX
}

if (100 < Local.mouseY) {
	if (Local.mouseY < 200) {
		"100 < mouse.y < 200: "
		Local.mouseY
	} else {
		"100 < 200 < mouse.y: "
		Local.mouseY
	}
} else {
	"mouse.y is less than 100: "
	Local.mouseY
}

if (Local.mouseY > Local.mouseX) {
	"mouse.y > mouse.x"
} else {
	"mouse.y <= mouse.x"
}
