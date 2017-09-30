let server = require('../');

server([{
	id: 'simple',
	title: 'Simple Presentation',
	path: __dirname + '/presentations/simple.html'
}]).start();