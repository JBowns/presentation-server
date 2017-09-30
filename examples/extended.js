let server = require('../');

let app = server([
    {
        id: 'simple',
        title: 'Simple Presentation',
        path: __dirname + '/presentations/simple.html'
    }, {
        id: 'extended',
        title: 'Extended Presentation',
        path: __dirname + '/presentations/extended.html',
        theme: 'savasian',
        style: 'monokai-sublime'
    }
], {
    themes: __dirname + '/presentations/themes',
    images: __dirname + '/presentations/images'
})

app.start(8080);