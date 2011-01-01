import Local
import Global

"Global.x:" <input data=Global.x dataType="number" style={ display:'block' }/>
"Global.y:" <input data=Global.y dataType="number" style={ display:'block' }/>

let five = 5
let two = 2
let greeting = "hello "
let name = "world"

<table>
	<tr>
		<th>"Global.x + Global.y"</th>
		Global.x + Global.y
	</tr><tr>
		<th>"Global.x * Global.y + Global.x * five"</th>
		Global.x * Global.y + Global.x * five
	</tr><tr>
		<th>"five + 2 * Global.x"</th>
		five + 2 * Global.x
	</tr><tr>
		<th>"two - 3 / Global.y"</th>
		two - 3 / Global.y
	</tr><tr>
		<th>"greeting + name"</th>
		greeting + name
	</tr>
</table>
