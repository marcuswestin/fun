
let contents = {
	learnMore: template() {
		<h1>"What is realtime, and how does Fun make it easy?"</h1>

		<p>"This document talks briefly about realtime; about what it is, why it is important to us,
			and why it is hard to create. It goes on to introduce Fun, a programming language built for
			the realtime web, and concludes with showing how Fun makes it easy to build realtime web apps."</p>

		<h3>"What is realtime?"</h3>
		<p>"When you say realtime, you really mean instantaneous transfer of state changes. For collaborative
			editing, this means the ability to see your collaborators’ changes as they make them. For chat,
			it means that your messages show up for the receiver as soon as you hit enter. Put another way,
			realtime means the ability to see the result of other peoples’ actions, instantaneously, and without
			action on your behalf."</p>

		<h3>"Why is realtime important?"</h3>
		<p>"If you’re philosophically bent, you may agree that the future of humanity is collaborative.
			If there is value in collaboration, then we want collaboration to be easily and effortless."</p>

		<h3>"Why is realtime hard?"</h3>
		<p>"Conceptually, realtime is straight forward. “When something happens, notify those who need to know 
			about the change”. However, while conceptually straight forward, realtime is technically complex.
			Realtime is both non-trivial to scale and difficult to code. Let’s take a look at both of
			these statements."</p>

		<h3>"Realtime is non-trivial to scale."</h3>
		<p>"On the surface, there are multiple reasons why realtime web is hard to scale:"</p>
			
		<ul>
			<li>"The protocol of the web (http) does not support realtime delivery of data to the browser.
				The work-around (read: hack) depends on a large number of concurrent http connections,
				a requirement which traditional web servers are ill suited for."</li>
			<li>"Web-scale means lots and lots of people, each with their own persistent connection to
				your web servers. In a web world we do not have access to peer-to-peer, streaming
				and other alleviating large-scale networking measures."</li>
			<li>"Web-scale also means wildly varying connectivity patterns. One sort of website will
				foster clustered islands of connectivity (ning), while another will see a graph of
				super-nodes (twitter). A solution that works for one will more often than not fail
				for the other."</li>
		</ul>
		
		<p>"Keeping track of “who needs to know about what changes” (pubsub) is a science of its own,
			as evidenced by the number of open source projects that attempt to address that problem space
			(0mq, redis, rabbitmq, restms, etc)"</p>

		<p>"Others have written extensively and in fine-grained detail on each of these problems and many
			more - the point to take home is that there is no one right way to architect a realtime system,
			and that as the system grows, the challenge of scaling it will be unique to the nature of its
			particular growth."</p>
		
		<h3>"Realtime is hard to code"</h3>
		<p>"While conceptually simple, the devil is in the details when it comes to coding a realtime system.
			Consider the case of a realtime client application, like the web interface for gmail. Assume that the
			server already knows to notify your browser when an email addressed to you arrives. Also assume that
			the server has a means to deliver the notification to your browser in realtime, despite the incapacity
			of vanilla http to do so. Even with these assumptions significant challenges remain."</p>
	},
	
	tryHere: template(){
		<div>"Try Fun here in your browser"</div>
	},
	
	download: template(){
		<h3>"Download Fun"</h3>
	},
	hackFun: template(){
		<h3>"Hack on Fun"</h3>
		"Clone the source tree and get started with an example:"
		<pre><code>"
git clone https://marcuswestin@github.com/marcuswestin/fun.git
cd fun
./fun examples/chat.fun
		"</code></pre>
	},
}