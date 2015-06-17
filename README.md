## SIMD.js Demos

> A Polymer 1.0 application demonstrating SIMD.js

### Install dependencies

With [Node.js](http://nodejs.org) and npm installed, run the following one liner from the root of your download:

```sh
$ npm install -g gulp && npm install -g bower && npm install && bower install
```

This will install the element sets and tools to serve and build the app.

### Serve / watch

```sh
$ gulp serve
```

This outputs an IP address you can use to locally test and another that can be used on devices connected to your network.

### Run tests

```sh
$ gulp test:local
```

This runs the unit tests defined in the `app/test` directory through [web-component-tester](https://github.com/Polymer/web-component-tester).

### Build & Vulcanize

```sh
$ gulp
```

Build and optimize the current project, ready for deployment. This includes linting as well as vulcanization, image, script, stylesheet and HTML optimization and minification.