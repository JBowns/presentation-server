'use strict';

let express = require('express');
let Mustache = require('mustache');
let path = require('path');
let fs = require('fs');

class PresentationServer {

    constructor(presentations, userDefinedConfig) {
        
        const root = path.dirname(require.resolve('../'));
        const moduleDirectory = this.findModuleDirectory(root);

        userDefinedConfig = userDefinedConfig ? userDefinedConfig : {};
        presentations = presentations ? presentations : [];

        this.staticConfig = {
            resources: path.join(moduleDirectory, 'reveal.js'),
            lib: path.join(moduleDirectory, 'reveal.js/lib'),
            themes: path.join(moduleDirectory, 'reveal.js/css/theme'),
            styles: path.join(moduleDirectory, 'highlight.js/src/styles')
        };

        this.presentationContainer = this.loadFile(path.join(root, '/templates/presentationContainer.mustache'));
        this.configurationContainer = this.loadFile(path.join(root, '/templates/configurationContainer.mustache'));

        presentations.unshift({
            id: '404',
            title: 'Presentation not found',
            path:  path.join(root, '/static/not-found.html')
        });

        presentations.unshift({
            id: 'demo',
            title: 'Demonstration',
            path: path.join(root, '/static/demo.html')
        });

        presentations.forEach(function (presentation) {
            if (presentations.filter(p => p.id == presentation.id).length > 1) {
                throw "Duplicate presentation id detected, please rename '" + presentation.id + "'";
            }
        });

        this.presentations = presentations
        .map(presentation => {
            presentation.slides = this.loadFile(presentation.path);
            return presentation;
        })
        .map(this.buildConfig);

        this.themes = []
        .concat('themes' in this.staticConfig ? this.findCssResources(this.staticConfig.themes) : [])
        .concat('themes' in userDefinedConfig ? this.findCssResources(userDefinedConfig.themes) : [])
        .filter((value, index, self) => { 
            return self.indexOf(value) === index;
        });

        this.styles = []
        .concat('styles' in this.staticConfig ? this.findCssResources(this.staticConfig.styles) : [])
        .concat('styles' in userDefinedConfig ? this.findCssResources(userDefinedConfig.styles) : [])
        .filter((value, index, self) => { 
            return self.indexOf(value) === index;
        });

        this.app = express();
        this.configureEndpoints(userDefinedConfig);
    }

    findModuleDirectory(root) {

        const NODE_MODULES = 'node_modules';
        let moduleDirectory = "";

        moduleDirectory = path.join(root, NODE_MODULES);
        if (fs.existsSync(moduleDirectory)) {
            return moduleDirectory;
        }
        
        moduleDirectory = path.join(root, '..', NODE_MODULES);
        if (fs.existsSync(moduleDirectory)) {
            return moduleDirectory;
        }

        throw "Unable to find '" + NODE_MODULES + "' folder";
    }

    loadFile(path) {
        try {
            return fs.readFileSync(path).toString();
        } catch (err) {
            throw "Unable to load document -> " + err;
        }
    }

    findCssResources(path) {
        try {
            return fs.readdirSync(path)
                .toString()
                .split(',')
                .filter(file => file.endsWith('.css'))
                .map(file => file.replace('.css', ''));
        } catch (err) {
            throw "Unable to load resource directory -> " + err;
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

    configureEndpoints(userDefinedConfig) {

        Object.keys(userDefinedConfig).map(resource => {
            this.app.use('/' + resource, express.static(userDefinedConfig[resource]));
        });

        Object.keys(this.staticConfig).map(resource => {
            this.app.use('/' + resource, express.static(this.staticConfig[resource]));
        });

        this.app.get('/api/themes', (req, res) => {
            res.json(this.themes);
        });

        this.app.get('/api/styles', (req, res) => {
            res.json(this.styles);
        });

        this.app.get('/api/presentations', (req, res) => {
            res.json(this.clone(this.presentations)
                .filter(presentation => presentation.id != '404')
                .map(presentation => {
                    delete presentation.slides;
                    delete presentation.path;
                    return presentation
                }));
        });

        this.app.get('/', (req, res) => {
            res.redirect('/presentations');
        });

        this.app.get('/presentations', (req, res) => {
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

        this.app.get('/presentations/:id', (req, res) => {
            let presentation = this.getPresentation(req);
            var output = Mustache.render(this.presentationContainer, presentation);
            res.contentType('text/html');
            res.send(output);
        });

        this.app.get('/presentations/:id/configure', (req, res) => {
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
    }

    start(port) {
        port = port ? port : 8080;
        this.app.listen(port, (err) => {
            console.info("Presentation Server is running on port " + port);
        });
    }

}

module.exports = (presentations, config) => new PresentationServer(presentations, config);