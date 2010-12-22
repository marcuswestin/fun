import Local
import Global

"Global.x:" <input data=Global.x/>
<br />
"Global.y:" <input data=Global.y/>

<div>
	"Global.x + 5 = " Global.x + 5
</div>
<div>
	"Global.x + Global.y = " Global.x + Global.y
</div>

<div>
	let five = 5
	let two = 2
	
	"five + two = " five + two
	<br />
	"five - two = " five - two
</div>

<div>
	let greeting = "hello "
	let name = "world"
	
	greeting + name
</div>
