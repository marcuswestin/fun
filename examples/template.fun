import Local
import Global
let renderItem = template(item) {
	<em> "From renderItem, item.text: " item.text </em>
}
let renderItemAgain = template(item) {
	<b> "From renderItemAgain: " item.foo </b>
}

<input data=Local.itemText />
<button>"click"</button onclick=handler() {
	let newItem = new { text: Local.itemText, foo:'foo' }
	Global.items.unshift(newItem)
}>

for (item in Global.items) {
	<div style={ border:'1px solid black', padding:4 }>
		"item: " item.text
		<br />"renderItem(item): " renderItem(item)
		<br />"renderItemAgain(item): "renderItemAgain(item)
	</div>
}

let aTemplate = template(name) {
	<br />"Hello " name
}
let firstName = "Marcus"
aTemplate()
aTemplate("Marcus")
aTemplate(firstName + " Westin")
