import localstorage

var currentValue = function(variable) {
	<script variable=variable>
		yieldValue(variable.evaluate())
	</script>
}

var tasks = []
localstorage.persist(tasks, 'tasks3')

<link rel="stylesheet" type="text/css" href="http://addyosmani.github.com/todomvc/reference-examples/vanillajs/css/todos.css" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />

<div id="todoapp">
	<div class="title">
		<h1>"Todos"</h1>
	</div>
	<div class="content">
		<div id="create-todo">
			var newTaskName
			<input id="new-todo" data=newTaskName placeholder="What needs to be done?"/>
			<button>"Create"</button onclick=handler() {
				tasks.push({ name:currentValue(newTaskName), done:false })
				newTaskName.set('')
			}>
		</div>
	</div>
	<div id="todos">
		<ul id="todo-list">
			for (task in tasks) {
				<li><div class="todo"+(task.done ? " done" : "")>
					<input class="check" type="checkbox" data=task.done />
					<div class="todo-content">task.name</div>
				</div></li>
			}
		</ul>
	</div>
</div>
