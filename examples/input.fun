import Global
import Mouse

"Global.foo : "<input data=Global.foo style={ width:100 } />
<br />
"Mouse.x : " Mouse.x
<br />
"Who's biggest?"

let coolStyle = { color:"red", marginTop:1 }

<h1 style=coolStyle>
	if (Global.foo > Mouse.x) {
		<span> "Global!" </span>
	} else {
		<span> "Local! " </span>
	}
</h1>
