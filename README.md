# Presentation Server

This service currently supports [Reveal.js](https://github.com/hakimel/reveal.js) presentations, go check it out for futher details on how to build your own.

If you're anything like me you'd prefer to not read paragraphs of documentation. So, for all the learn by example people i suggest taking a look in `static/demo.html`. This was polietly stolen from reveal.js and modifed to work with my custom container.

## Getting Started

This service allows you to host, theme and preview your slides. All you need to do is point to your html sections and it'll do the rest.

#### presentation.html
```html
<section>
    <h1>My Super Amazing Presentation</h1>
<section>
<section>
    <h1>Fin</h1>
<section>
```
#### app.js

```js
let app = PresentationServer([{
    id: 'my-presentation',
    path: '~/some_dir/presentation.html' 
}]);

app.start(8080);
```

## Configuration

This service was designed to be as simple as possible to interact with, however assuming you want to add some more flavour to you slides (other than vanilla) you might find this section helpful.

### Themes

Just like reveal.js, this service supports a multitude of themes and styles for code highlighting. Simply navigate to `/api/themes` or `/api/styles` to find out which ones.

Theme and style defaults can be set in your presentation configuration

 ```js
let app = PresentationServer([{
    id: 'my-presentation',
    path: '~/some_dir/presentation.html',
    theme: 'black',
    style: 'white'
}]);
```

### Other

I've also exposed a few config options available in reveal.js, these are `controls` and `loop`, which can be invoked using the same example above.

### Hosting Resources

As well as the presentations, you can also provide a resources object

```js
let app = PresentationServer([{
    id: 'my-presentation',
    path: '~/some_dir/presentation.html' 
}], {
    images: '~/some_dir/presentation_images'
});
```

Your images will be now be accessible from `/images`.

> **Note:** Some paths have already been defined such as `/resources`, `/themes` and `/styles` you're welcome to override these endpoints inject your own themes :wink:. Although I would recommend leaving `/resources` alone as it points to the reaveal.js dependencies and plugins.


## Frontend (HTML)

Once you've started the app you should be able to access the following endpoints

**GET** `/presentations`

This acts as the homepage and features all the available presentations.

**GET** `/presentations/{id}`

This endpoint would be used to view an individual presentation by providing the id.

**GET** `/presentations/{id}/configure`

Here you're able to dynamically alter the presetations default theme and code highlight style, once your happy you can then navigate directly to it.

## Backend (API)

**GET** `/api/presentations`
```js
[{
    id: "string",
    title: "string",
    theme: "string",
    style: "string",
    controls: "boolean",
    loop: "boolean"
}]
```

**GET** `/api/themes`
```js
["string", "string", ...]
```

**GET** `/api/styles`
```js
["string", "string", ...]
```

## Folder Structure
- **lib/** The Server source code
- **static/** Demonstration slides and error pages
- **templates/** Containers for the presentation and configuration pages.

## Contributions

[Contributions](http://github.com/JBowns/presentation-server/blob/master/CONTRIBUTING.md) are welcome.

## License

MIT licensed

Copyright (C) Jacob Bowns