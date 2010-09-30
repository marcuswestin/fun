let addItem = handler() {
	Local.items.push('new item')
}

<button onClick=addItem>"Add item"</button>

<br /> "Items:"
<li>
for (item in Local.items) {
	<ol> "item: " item </ol>
}
</li>
