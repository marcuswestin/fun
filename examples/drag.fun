import Mouse

<div style={
	position:'absolute',
	top:Mouse.y,
	left:Mouse.x,
	width: 100,
	height: 100,
	background:'red' }></div>

let draggableStyle = {
	position: 'absolute',
	top: Mouse.y,
	left: Mouse.x,
	width: 50,
	height: 50,
	background: 'blue'
}

<div style=draggableStyle></div>
