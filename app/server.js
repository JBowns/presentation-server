let express = require('express');
let Mustache = require('mustache');
let fs = require('fs');
let app = express();

class PresentationServer {

    constructor(presentations, config) {

        config = config ? config : {};

        this.config = Object.assign({
            resources: __dirname + '/../node_modules',
            lib: __dirname + '/../node_modules/reveal.js/lib',
            themes: __dirname + '/../node_modules/reveal.js/css/theme',
            styles: __dirname + '/../node_modules/highlight.js/src/styles'
        }, config);

        this.presentationContainer = this.loadContainer(__dirname + '/templates/presentationContainer.mustache');
        this.configurationContainer = this.loadContainer(__dirname + '/templates/configurationContainer.mustache');

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
        }).map(presentations => Object.assign(this.defaultSildeConfig(), presentations));

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

    defaultSildeConfig() {
        return {
            title: 'Presentation',
            theme: 'black',
            style: 'vs2015',
            controls: false,
        };
    }

    generateSection(presentation, idx, theme, style) {
        let query = [];
        theme ? query.push("theme=" + theme) : null;
        style ? query.push("style=" + style) : null;
        let queryStr = query.join('&')

        return '<section data-transition="fade">' +
            '<iframe id="frame_' + idx + '" src="/presentations/' + presentation.id + (queryStr ? '?' + queryStr : '') + '" style="width:90%;height:500px"></iframe>' +
            '<p><a class="open" href="/presentations/' + presentation.id + (queryStr ? '?' + queryStr : '') + '">open</a></p>' +
            '</section>';
    }

    constructHomePage() {
        return this.clone(this.presentations)
            .filter(presentation => presentation.id != '404')
            .reduce((arr, presentation) => {
                arr.push(this.generateSection(presentation));
                return arr;
            }, []).join('\n');
    }

    constructConfigPage(presentation) {
        return [this.generateSection(presentation, 0), this.generateSection(presentation, 1)].join('\n');
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

    getPresentation(req) {

        let findPresentation = function(id) {
            return this.clone(this.presentations.find(presentation => {
                return presentation.id == id;
            }));
        }.bind(this);

        let presentation = findPresentation(req.params.id);
        
        if (!presentation) {
            presentation = findPresentation('404');
        }

        presentation.theme = req.query.theme && this.themes.indexOf(req.query.theme) > -1 ? req.query.theme : presentation.theme;
        presentation.style = req.query.style && this.styles.indexOf(req.query.style) > -1 ? req.query.style : presentation.style;
        return presentation;
    }

    clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    start(port) {

        port = port ? port : 3000;

        Object.keys(this.config).map(resource => {
            app.use('/' + resource, express.static(this.config[resource]));
        });

        app.get('/', (req, res) => {

            var presentation = Object.assign(this.clone(this.defaultSildeConfig()), {
                title: 'Home',
                theme: 'night',
                slides: this.constructHomePage()
            });

            var output = Mustache.render(this.presentationContainer, presentation);

            res.contentType('text/html');
            res.send(output);
        });

        app.get('/config/themes', (req, res) => {
            res.json(this.themes);
        });

        app.get('/config/styles', (req, res) => {
            res.json(this.styles);
        });

        app.get('/config/:id', (req, res) => {

            let presentation = this.getPresentation(req);

            var content = Object.assign(this.clone(this.defaultSildeConfig()), {
                id: presentation.id,
                title: 'Presentation Configuration',
                theme: 'night',
                slides: this.constructConfigPage(presentation)
            });

            var output = Mustache.render(this.configurationContainer, content);

            res.contentType('text/html');
            res.send(output);
        });

        app.get('/presentations', (req, res) => {
            res.json(this.clone(this.presentations)
                .filter(presentation => presentation.id != '404')
                .map(presentation => {
                    delete presentation.slides;
                    return presentation
                }));
        });

        app.get('/presentations/:id', (req, res) => {
            
            let presentation = this.getPresentation(req);

            var output = Mustache.render(this.presentationContainer, presentation);

            res.contentType('text/html');
            res.send(output);

        });

        app.listen(port, (err) => {
            console.info("Presentation Server is running on port " + port);
        });

    }

}

module.exports = (presentations) => new PresentationServer(presentations);