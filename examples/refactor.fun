class Global {
	1 stamps: List of Stamp
}

class Stamp {
	1 text: Text
}

let displayStamp = template(stamp) {
	<span class="stamp">stamp.text</span>
}

let displayNumber = template(number) {
	<div>"A number!" number</div>
}

<div class="stamps">
	displayNumber(2)
	for (number in [1,2,3]) {
		displayNumber(number)
		displayNumber(number)
	}
	displayNumber(101)
</div>

