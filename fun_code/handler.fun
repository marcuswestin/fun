let test = 'test'

let handleClick1 = handler() {
	set Global.x = 1
	set Local.handlerTest = test
}

let handleClick2 = handler() {
	set Global.x = 100
	set Local.handlerTest = 'foo'
}

<div> "Global.x = " Global.x </div>
<div> "Local.handlerTest = " Local.handlerTest </div>
<br />
<button onClick=handleClick1> 1 </button>
<button onClick=handleClick2> 2 </button>