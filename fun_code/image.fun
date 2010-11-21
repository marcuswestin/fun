import Local

let setYahooLogo = handler() {
	Local.pictureURL.set("http://l.yimg.com/a/i/ww/met/yahoo_logo_us_061509.png")
}
let setBingTile = handler() {
	Local.pictureURL.set("http://www.bing.com/fd/s/a/h1.png")
}
let setGoogleLogo = handler() {
	Local.pictureURL.set("http://www.google.com/images/logos/ps_logo2.png")
}
let containerStyle = { margin: 10, padding: 5, border: '2px solid #999', width: 500 }

<div style=containerStyle>
	<p>"examples"</p>
	<button onClick=setYahooLogo>"Yahoo logo"</button>
	<button onClick=setBingTile>"Bing Sprite tiles"</button>
	<button onClick=setGoogleLogo>"Google logo"</button>
</div>

<div style=containerStyle>
	<p>"src"</p>
	<input data=Local.pictureURL style={magin:10, width: 500} />
</div>

<div style=containerStyle>
	<p>"image"</p>
	<img src=Local.pictureURL style={margin:10} />
</div>
