import Location
import "../thefunlanguage.com/contents"

<link rel="stylesheet" href="thefunlanguage.com/thefunlanguage.css" />

let navigationItem = template(text, state) {
	<div class="navigation-item" onclick=handler() { Location.navigate(state) }>
		text
		if (Location.state == state) { " -->" }
	</div>
}

<div id="app">
	<div class="header">
		<h1 class="logo">"Fun"</h1 onclick=handler(){ Location.navigate('') }>
		<h2 class="slogan">"A programming language for the realtime web"</h2>
		<h2 class="made-by">"by " <a href="http://marcuswest.in">"marcuswestin"</a></h2>
	</div>
	
	<div class="spacing" />
	
	<div class="navigation">
		navigationItem('Learn about Fun', 'learn-more')
		navigationItem('Play with Fun', 'try-here')
		navigationItem('Hack on Fun', 'hack-fun')
	</div>
	
	<div class="content">
		switch(Location.state) {
			case 'learn-more': contents.learnMore()
			case 'try-here':   contents.tryHere()
			case 'hack-fun':   contents.hackFun()
			default:           contents.welcome()
		}
	</div>
</div>
