let test = 'test'
test
"ASD"

let anEmptyObject = {}
let anEmptyArray = []
let anArray = [123,234]

let something = 1123
let somethingBig = 999.99e10
let someJSON = { aString:'asd', aNumber:123, anArray:[1,2,3], moreJSON:
	{ "WOOT": 123 }
	, // stray comma, should parse OK anyway
}

someJSON.moreJSON.WOOT

let styles = {
	awesomeStyle: { color:'magenta', fontSize:'1000px' }
}
let clickHandler = 'handlers dont exist yet!'

<div style=styles.awesomeStyle width=100 onClick=handler(){  }>
	"Hi " <em>"Marcus"</em>
	"How are you?"
	test "?"
</div>

<button>"click handler at closing tag"</button onClick=handler(){ asd }>

if (something) {
    <div>
    	"Hi " <em>"Marcus"</em>
    	something "How are you?"
    	test "?"
    </div>
} else {
	"COOL!"
}
if (something <= somethingBig) {
    <div>
    	"Hi " <em>"Marcus"</em>
    	something "How are you?"
    	test "?"
    </div>
}

for (item in items) {
    <div>
    	"Hi " <em>"Marcus"</em>
    	somethingBig "How are you?"
    	test "?"
    </div>
}

let aTemplate = template(asd,qwe) {
	<div>"Hello there!"</div>
	if (asd) { "cool" }
}
let aHandler = handler(asd) {
	<div>"Hello there!"</div>
	if (asd) { "cool" }
}
