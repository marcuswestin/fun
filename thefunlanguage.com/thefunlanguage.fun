import Local
import Location
import "../thefunlanguage.com/contents"

<link rel="stylesheet" href="thefunlanguage.com/thefunlanguage.css" />

// TODO It would be nice to have an enum type that's syntactic sugar for this:
let contentStates = { learnMore: 'learnMore', tryHere: 'tryHere', download: 'download', hackFun: 'hackFun' }

let navigationItem = template(text, state) {
	<div class="navigation-item"> text </div onclick=handler() {
		Location.navigate(state)
	}>
}

<div id="app">
	<div class="header">
		<h1 class="logo">"Fun"</h1>
		<h2 class="slogan">"A programming language for the realtime web"</h2>
		<h2 class="made-by">"by " <a href="http://marcuswest.in">"marcuswestin"</a></h2>
	</div>
	
	<div class="spacing" />
	
	<div class="navigation">
		<h2>"I want to"</h2>
		navigationItem('Learn more about Fun', contentStates.learnMore)
		navigationItem('Try Fun here in my browser', contentStates.tryHere)
		navigationItem('Download & user Fun', contentStates.download)
		navigationItem('Hack Fun', contentStates.hackFun)
	</div>
	
	<div class="content">
		switch(Location.state) {
			case contentStates.learnMore: contents.learnMore()
			case contentStates.tryHere:   contents.tryHere()
			case contentStates.download:  contents.download()
			case contentStates.hackFun:   contents.hackFun()
			default:                      <h3>"Welcome"</h3>
		}
	</div>
</div>
