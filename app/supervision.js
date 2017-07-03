'use strict';

let eventQueue;
let svConf = {
    frequency: 1000,
};
let io;
/**
 * Server initialization
 * @param  {Object} server
 * @param  {Number} port
 * @param  {Object} conf (optionnal)
 */
function init(server, port, conf) {
    // fetching conf if it is set
    for(let k in conf) {
		if (conf.hasOwnProperty(k)) {
			svConf[k] = conf[k];
		}
	}

    // cleaning event queue
    eventQueue = [];

    // creating server
    io = require('socket.io')(server);

    // on connection received
    io.sockets.on('connection', function(socket) {
		onConnect(socket);
		// SESSION ON

		// socket.on('message', function(data) { });

        // setting main loop
        setInterval(() => {
            if(eventQueue.length > 0) {
                io.emit('events', eventQueue);
                eventQueue = [];
            } else {
            }
        }, svConf.frequency);

		// SESSION OFF
		socket.on('disconnect', function() {
			onDisconnect(socket);
		});
	});

    // starting server
	io.listen(port);
    console.log(`superVision server initialized on port ${port}`);
}

/**
 * Add an object to the event queue
 * @param {Object} object
 */
function addEvent(object) {
    eventQueue.push(object);
}

/**
 * Clean event array
 * @param  {Object} data
 */
function cleanEvents(data) {
	io.emit('finish', data);
}

/**
 * Fired on connection
 * @param  {Socket} socket
 */
function onConnect(socket) {
	// console.log('user connected to chat');
}

/**
 * Fired on disconnection
 * @param  {Socket} socket
 */
function onDisconnect(socket) {
	// console.log('user disconnected to chat');
}

module.exports = {
    init,
    addEvent,
    cleanEvents,
};
