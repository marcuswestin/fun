import mouse
import localstorage

"A draggable square that's sticky between page reloads"

<pre>"
let drag = {
	pos:{ x:100, y:100 },
	offset:{ x:0, y:0 }
}

localstorage.persist(drag, 'drag')

let dragStyle = {
	cursor:'move',
	width:100,
	height:100,
	background:'red',
	position:'absolute',
	left:drag.pos.x + drag.offset.x,
	top:drag.pos.y + drag.offset.y
} 

<div style=dragStyle></div
	onmousedown=handler(e) {
		drag.offset.x set: drag.pos.x.copy() - mouse.x.copy() - drag.offset.x.copy()
		drag.offset.y set: drag.pos.y.copy() - mouse.y.copy() - drag.offset.y.copy()
		drag.pos.x set: mouse.x
		drag.pos.y set: mouse.y
		e.cancel()
	},
	onmouseup=handler() {
		drag.pos.x set: drag.pos.x.copy()
		drag.pos.y set: drag.pos.y.copy()
	}
>
"</pre>

let drag = {
	pos:{ x:100, y:100 },
	offset:{ x:0, y:0 }
}

localstorage.persist(drag, 'drag')

let dragStyle = {
	cursor:'move',
	width:100,
	height:100,
	background:'red',
	position:'absolute',
	left:drag.pos.x + drag.offset.x,
	top:drag.pos.y + drag.offset.y
} 

<div style=dragStyle></div
	onmousedown=handler(e) {
		drag.offset.x set: drag.pos.x.copy() - mouse.x.copy() - drag.offset.x.copy()
		drag.offset.y set: drag.pos.y.copy() - mouse.y.copy() - drag.offset.y.copy()
		drag.pos.x set: mouse.x
		drag.pos.y set: mouse.y
		e.cancel()
	},
	onmouseup=handler() {
		drag.pos.x set: drag.pos.x.copy()
		drag.pos.y set: drag.pos.y.copy()
	}
>
