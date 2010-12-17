import Global

let incr = handler(){ Global.counter.increment() }

<div style={ color:'#444', fontFamily:'Helvetica', margin: 50 }>
	'Counter: ' Global.counter
	<br />
	<button>"++"</button onclick=incr>
	<button>"--"</button onclick=handler(){ Global.counter.decrement() }>
	<button>"+5"</button onclick=handler(){ Global.counter.add(5) }>
	<button>"-3"</button onclick=handler(){ Global.counter.subtract(3) }>
</div>
