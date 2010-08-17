let handleClick1 = handler() {
	set Local.handlerTest = 1
}

let handleClick2 = handler() {
	set Local.handlerTest = 2
}

"Local.handlerTest=" Local.handlerTest
<br />
<button clickHandler=handleClick1> 1 </button>
<button clickHandler=handleClick2> 2 </button>