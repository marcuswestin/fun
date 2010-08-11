let user = Session.User
let myTasks = Query({ type: 'task', owner: user.id })

<h1>"Hello " user.name ", these are your tasks matey:"</h1>
for (task in myTasks) {
	<div class="task" + (task.isUrgent ? " urgent")>
		<input data=task.title />
		if (task.completed) {
			<span class="status">"Completed!"</span>
		} else {
			<button clickHandler=markComplete(task) />"Mark as completed"</button>
		}
	</div>
}

let markComplete = handler(task) {
	task.completed = true
}

<h3>"Create a new task"</h3>
<input data=Local.newTaskTitle />
<button clickHandler=createNewTask />

let createNewTask = handler() {
	let taskTitle = Local.newTaskTitle
	set Local.newTaskTitle = ''
	Global.create({ owner: user.id, type: 'task', title:  })
}

