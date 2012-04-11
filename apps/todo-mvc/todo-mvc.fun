import localstorage
import filter

tasks = []

localstorage.persist(tasks, 'todo-fun')

<link rel="stylesheet" type="text/css" href="./todo-mvc.css" />

<div id="todoapp">
	<div class="title">
		<h1>"Todos"</h1>
	</div>
	<div class="content">
		<div id="create-todo">
			newTaskName = null
			<input id="new-todo" data=newTaskName placeholder="What needs to be done?" onkeypress=handler(event) {
				if event.keyCode is == 13 {
					tasks push: { name:newTaskName.copy(), done:false }
					newTaskName set: ''
				}
			}/>
		</div>
		<div id="todos">
			<ul id="todo-list">
				for task in tasks {
					<li class="todo"+(task.done ? " done" : "")>
						<input class="check" type="checkbox" data=task.done />
						<div class="todo-content">task.name</div>
					</li>
				}
			</ul>
		</div>
		<div id="todo-stats">
			if tasks.length is > 0 {
				doneTasks = filter(tasks, function(task) { return task.done })
				pluralize = function(num) { return num is > 1 ? "items" : "item" }
				<span class="todo-count">
					numTasksLeft = tasks.length - doneTasks.length
					<span class="number">numTasksLeft</span>" "pluralize(numTasksLeft) " left."
				</span>
				if doneTasks.length is > 0 {
					<span class="todo-clear">
						<a href="#">"Clear "doneTasks.length" completed "pluralize(doneTasks.length)</a onclick=handler() {
							remainingTasks = []
							for task in tasks {
								if !task.done {
									remainingTasks push: task
								}
							}
							tasks set: remainingTasks
						}>
					</span>
				}
			}
		</div>
	</div>
</div>
