let PresentationServer = require('./app/server.js');

let server = PresentationServer([{
    id: 'session',
    title: 'Session Service',
    path: __dirname + '/presentations/session-service.html',
    theme: 'black'
}]);

server.start(8080);