import localstorage
import filter

// TODO implement value.copy()
var currentValue = function(variable) {
	<script variable=variable>
		if (!__hackFirstExecution) { return }
		yieldValue(variable.evaluate())
	</script>
}

// TODO Move to an appropriately named module
var filter = function(list, func) {
	<script list=list func=func>
		var result = [],
			items = list.getContent()
		// TODO use list.iterate(function(item) { ... }
		for (var i=0, item; item=items[i]; i++) {
			if (func.invoke(null, [item]).isTruthy()) {
				result.push(item)
			}
		}
		yieldValue(result)
	</script>
}

var tasks = []

localstorage.persist(tasks, 'todo-fun')

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
				<li class="todo"+(task.done ? " done" : "")>
					<input class="check" type="checkbox" data=task.done />
					<div class="todo-content">task.name</div>
				</li>
			}
		</ul>
	</div>
	<div id="todo-stats">
		if (tasks.length > 0) {
			var doneTasks = filter(tasks, function(task) { return task.done })
			<span class="todo-count">tasks.length - doneTasks.length " tasks left."</span>
		}
	</div>
</div>
