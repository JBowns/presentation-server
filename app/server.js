let express = require('express');
let Mustache = require('mustache');
let fs = require('fs');
let app = express();

class PresentationServer {

    constructor(presentations) {

        const conatinerTemplate = __dirname + '/templates/container.mustache';

        fs.readFile(conatinerTemplate, (err, data) => {
            if (err) {
                throw "Unable to load container template '" + conatinerTemplate + "'";
            } else {
                this.container = data.toString();
            }
        });

        presentations.push({
            id: '404',
            title: 'Presentation not found',
            path: __dirname + '/static/not-found.html'
        });

        presentations.push({
            id: 'demo',
            title: 'Demonstration',
            path: __dirname + '/static/demo.html'
        });

        this.presentations = presentations.map(presentation => {
            try {
                presentation.slides = fs.readFileSync(presentation.path).toString();
            } catch (err) {
                throw "Unable to load presentation path -> '" + presentation.path + "'";
            }
            return presentation;
        }).map(presentations => Object.assign({
            title: 'Presentation',
            theme: 'black',
            highlight: 'vs2015',
        }, presentations));
    }

    start(port) {

        port = port ? port : 3000;

        app.use(express.static(__dirname + '/../node_modules'));

        app.get('/presentations', (req, res) => {
            res.json(this.presentations.map(presentation => {
                delete presentation.slides;
                return presentation
            }).filter(presentation => presentation.id != '404'));
        });

        app.get('/presentations/:id', (req, res) => {

            let findPresentation = (id) => {

                return this.presentations.find(presentation => {
                    return presentation.id == id;
                });
            };

            let presentation = findPresentation(req.params.id);

            if (!presentation) {
                presentation = findPresentation('404');
            }

            var output = Mustache.render(this.container, presentation);

            res.contentType('text/html');
            res.send(output);

        });

        app.listen(port, (err) => {
            console.info("Presentation Server is running on port " + port);
        });

    }

}

module.exports = (presentations) => new PresentationServer(presentations);