import Local
import Global

let test = 'test'

let handleClick1 = handler() {
	Global.x.set(1)
	Local.handlerTest.set(test)
}

let handleClick2 = handler() {
	Global.x.set(100)
	Global.x.set('foo')
}

<div> "Global.x = " Global.x </div>
<div> "Local.handlerTest = " Local.handlerTest </div>
<br />
<button onClick=handleClick1> 1 </button>
<button onClick=handleClick2> 2 </button>