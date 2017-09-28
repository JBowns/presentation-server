let express = require('express');
let Mustache = require('mustache');
let fs = require('fs');
let app = express();

class PresentationServer {

    constructor(presentations, config) {

        config = config ? config : {};
        presentations = presentations ? presentations : [];

        this.config = Object.assign({
            resources: __dirname + '/../node_modules',
            lib: __dirname + '/../node_modules/reveal.js/lib',
            themes: __dirname + '/../node_modules/reveal.js/css/theme',
            styles: __dirname + '/../node_modules/highlight.js/src/styles'
        }, config);

        this.presentationContainer = this.loadContainer(__dirname + '/../templates/presentationContainer.mustache');
        this.configurationContainer = this.loadContainer(__dirname + '/../templates/configurationContainer.mustache');

        presentations.unshift({
            id: '404',
            title: 'Presentation not found',
            path: __dirname + '/static/not-found.html'
        });

        presentations.unshift({
            id: 'demo',
            title: 'Demonstration',
            path: __dirname + '/static/demo.html'
        });

        presentations.forEach(function(presentation) {
            if (presentations.filter(p => p.id == presentation.id).length > 1) {
                throw "Duplicate presentation id detected, please rename '" + presentation.id + "'";
            }
        });

        this.presentations = presentations.map(presentation => {
            try {
                presentation.slides = fs.readFileSync(presentation.path).toString();
            } catch (err) {
                throw "Unable to load presentation path -> '" + presentation.path + "'";
            }
            return presentation;
        }).map(presentations => this.buildConfig(presentations));

        this.themes = this.loadCSSResources(this.config.themes);
        this.styles = this.loadCSSResources(this.config.styles);
    }

    loadContainer(path) {
        try {
            return fs.readFileSync(path).toString();
        } catch (err) {
            throw "Unable to load container '" + path + "' -> " + err;
        }
    }

    loadCSSResources(path) {
        try {
            return fs.readdirSync(path)
                .toString()
                .split(',')
                .filter(file => file.endsWith('.css'))
                .map(file => file.replace('.css', ''));
        } catch (err) {
            throw "Unable to load resource directory '" + path + "' -> " + err;
        }
    }

    clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    buildConfig(config) {
        return Object.assign({
            title: 'Presentation',
            theme: 'black',
            style: 'vs2015',
            controls: false,
            loop: false
        }, config);
    }

    generateSection(presentation, config) {
        return '<section data-transition="' + (config ? 'fade' : 'concave') + '">' +
            '<iframe src="/presentations/' + presentation.id + '" style="width:90%;height:500px"></iframe>' +
            (config ?
                '<p class="note">Use your left/right arrows to switch between different themes, while the up/down arrows to control the code highlight style</p>' +
                '<p class="note selection">Theme: <strong>default</strong> Style: <strong>default</strong></p>' +
                '<a class="note"href="/presentations/' + presentation.id + '">Start</a>'
                :
                '<p class="note">Use your left/right arrows to switch between different presentations</p>' +
                '<a class="note"href="/presentations/' + presentation.id + '">Start</a> | ' +
                '<a class="note"href="/presentations/' + presentation.id + '/configure">Configure</a>'
            ) +
            '</section>';
    }

    constructHomePage() {
        return this.presentations
            .filter(presentation => presentation.id != '404')
            .reduce((arr, presentation) => {
                arr.push(this.generateSection(presentation, false));
                return arr;
            }, []).join('\n');
    }

    constructConfigPage(presentation) {
        return [this.generateSection(presentation, true), this.generateSection(presentation, true)].join('\n');
    }

    getPresentation(req) {

        let findPresentation = function (id) {
            return this.presentations.find(presentation => {
                return presentation.id == id;
            });
        }.bind(this);

        let presentation = findPresentation(req.params.id);

        if (!presentation) {
            presentation = findPresentation('404');
        }

        presentation = this.clone(presentation);

        presentation.theme = req.query.theme && this.themes.indexOf(req.query.theme) > -1 ? req.query.theme : presentation.theme;
        presentation.style = req.query.style && this.styles.indexOf(req.query.style) > -1 ? req.query.style : presentation.style;
        return presentation;
    }

    start(port) {

        port = port ? port : 8080;

        Object.keys(this.config).map(resource => {
            app.use('/' + resource, express.static(this.config[resource]));
        });

        app.get('/api/themes', (req, res) => {
            res.json(this.themes);
        });

        app.get('/api/styles', (req, res) => {
            res.json(this.styles);
        });

        app.get('/api/presentations', (req, res) => {
            res.json(this.clone(this.presentations)
                .filter(presentation => presentation.id != '404')
                .map(presentation => {
                    delete presentation.slides;
                    delete presentation.path;
                    return presentation
                }));
        });

        app.get('/', (req, res) => {
            res.redirect('/presentations');
        });

        app.get('/presentations', (req, res) => {
            var presentation = this.buildConfig({
                title: 'Home',
                theme: 'night',
                slides: this.constructHomePage(),
                loop: true
            });
            var output = Mustache.render(this.presentationContainer, presentation);
            res.contentType('text/html');
            res.send(output);
        });

        app.get('/presentations/:id', (req, res) => {
            let presentation = this.getPresentation(req);
            var output = Mustache.render(this.presentationContainer, presentation);
            res.contentType('text/html');
            res.send(output);
        });

        app.get('/presentations/:id/configure', (req, res) => {
            let presentation = this.getPresentation(req);
            var content = this.buildConfig({
                id: presentation.id,
                title: 'Presentation Configuration',
                theme: 'night',
                defaultTheme: presentation.theme,
                defaultStyle: presentation.style,
                slides: this.constructConfigPage(presentation)
            });
            var output = Mustache.render(this.configurationContainer, content);
            res.contentType('text/html');
            res.send(output);
        });

        app.listen(port, (err) => {
            console.info("Presentation Server is running on port " + port);
        });

    }

}

module.exports = (presentations, config) => new PresentationServer(presentations, config);