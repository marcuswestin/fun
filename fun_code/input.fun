"Global.x : "<input data=Global.x style={ width:100 } />
<br />
"Local.mouseX : " Local.mouseX
<br />
"Who's biggest?"

let coolStyle = { color:"red", marginTop:1 }

<h1 style=coolStyle>
	if (Global.x > Local.mouseX) {
		<span> "Global!" </span>
	} else {
		<span> "Local! " </span>
	}
</h1>
