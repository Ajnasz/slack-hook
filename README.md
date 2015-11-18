How to subscribe to a hook and respond to it

```javascript
var createSlackHook = require('slack-hook');

var slackHook = createSlackHook(secretSlackToken);

slackHook.use(function (promise) {
	'use strict';

	return promise.then(function (serv) {
		return new Promise(function (resolve, reject) {
			// do some great stuff
			var result = doSomeGreatStuff(serv.body);

			if (result) {
				serv.respond('Thank you, I did some great stuff');
				resolve(serv);
			} else {
				// sending back error
				serv.error = {
					statusCode: 400,
					message: 'Could not do any great stuff'
				}

				reject(serv);
			}
		});
	});
});

var port = 8899;

slackHook.server.listen(port, function () {
	'use strict';

	console.log('listening on %d', port);
});
```
