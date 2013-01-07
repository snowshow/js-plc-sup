PLC Subscription Protocol - Javascript Client
=============================================

This is a simple, self written protocol to enable bidirectional communication with a programmable logic controller. In this case the server module
is written and tested agains a wago 750-841, the client module is tested in a recent version of Google Chrome. The protocol sets up on my websocket implementation that you can find [here](https://github.com/StevePo/plcWebSocketServer).

There are five main task that this protocol should handle:

- Set internal register values
- Read internal register values
- Subscribe for internal register value updates
- Unsubscribe
- Notify about updates on subscribed registers

Setup
-----

1. Open up a new project with CoDeSys and import the .exp file.
2. Either use it just like this or safe the project as a library.
3. Create a simple plc program (or use the one from the .exp file) and make it a free running task.
4. Open example/simpleClient/index.html in a Google Chrome Browser.

API
---

The plc-sup-client serves a very simple api.

Import the following javascript files into your html file.

	<script src="plc-notation.js"></script>
	<script src="plc-sup-client.js"></script>

### Initiate

Set up a websocket object.

	var ws = new WebSocket('ws://someipe:andport');

Pass the websocket object to a new PLCSuPClient.

	var plc = PLCSuPClient(ws);

### Event handler

The PLCSuPClient object will serve the following events:

- open
- close
- error
- update

Simply pass the event name and a callback function.

	plc.on("open", callback);
	plc.on("update", function (msg) { console.log(msg); });

### Set and Get Value

The usage for the setting is very straigh forward.

	plc.setValue("%MX0.0", true, successCallback);
	plc.getValue("%MB1", function (value, err) { ... });

### Subscribe and unsubscribe

Simply pass a set of plc addresses to the functions.

	plc.subscribe("%MW2", "%MD4", "%MX0.1", ..., successCallback);


