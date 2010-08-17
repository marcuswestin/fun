let test = 'test'

let handleClick1 = handler() {
	set Global.x = 1
	set Local.handlerTest = test
}

let handleClick2 = handler() {
	set Global.x = 100
	set Local.handlerTest = 'foo'
}

"Local.handlerTest=" Local.handlerTest
<br />
<button clickHandler=handleClick1> 1 </button>
<button clickHandler=handleClick2> 2 </button>