import Global
import Local

let addItem = handler() { Global.items.push(Local.text) }
let containerStyle = { padding: 5, margin: 5, border: '1px solid' }

<div style=containerStyle>
	<input data=Global.foo />
	<br /> "Global.foo: " Global.foo
</div>

<div style=containerStyle>
	"Add item with text: " <input data=Local.text />
	<br /> <button onClick=addItem>"Add item: " Local.text</button>
</div>

<div style=containerStyle>
	"Global.items: asdasd"
	<ol>
		for (item in Global.items) {
			<li> "item: " item </li>
		}
	</ol>
</div>

