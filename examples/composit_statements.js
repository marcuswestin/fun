import Local
import Global

"Global.x:" <input data=Global.x dataType="number" style={ display:'block' }/>
"Global.y:" <input data=Global.y dataType="number" style={ display:'block' }/>

let five = 5,
	two = 2,
	greeting = "hello ",
	name = "world"

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

<br />"Numbers: "
	<input data=Local.x dataType="number" /> "+" <input data=Local.y dataType="number" /> "=" Local.x + Local.y
<br />"Strings: "
	<input data=Local.foo /> "+" <input data=Local.bar /> "=" Local.foo + Local.bar