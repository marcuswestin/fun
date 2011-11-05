#import XHR
#import Location

let Account = {
	state: @required { 'initial', 'created', 'verified' },
	id: @static Number,
	phoneNumber: @static Text
}

let RegistrationResponse = {
	error: Text,
	account: Account
}

let Account account = { state:'initial' }
let oops = "Oops! Something went wrong. We're looking into it"
let inviteToken = ""

switch(account.state) {
	case 'initial': renderCreate()
	case 'created': renderVerifyNumber()
	case 'verified': renderApp
}

let renderCreate = template() {
	let phoneNumber = ""
	let errorMessage = ""
	if (errorMessage) { <div class="error">errorMessage</div> }
	<input data=phoneNumber placeholder="phone number" />
	<button>"Create account"</button onclick=handler() {
		let RegistrationResponse response = XHR.post('/create_account', { phoneNumber:phoneNumber })
		if (response.account) { account.set(response.account) }
		else { errorMessage.set(response.error || oops) }
	}>
}

let renderVerifyNumber = template() {
	#import Location
	Location.on('change', handler() {
		if (!Location.hash.get('t')) { return }
		let params = { phoneNumber:account.phoneNumber, token:Location.hash.get('t') }
		let RegistrationResponse response = XHR.post('/verify_number', params)
		if (response.account) { account.set(response.account) }
		else { errorMessage.set(response.error || oops)
	})
	XHR.post('/send_verification_sms', { phoneNumber:account.phoneNumber })
}

let renderApp = template() {
	"..."
}