## A showcase of Crosswalk features

This show case is based on Polymer and web components and many things works in Chrome, though a few things will only work in Crosswalk.

### Get started

First of all you must install Node.js and the NPM (Node Package Manager).

With that done, you can install bower (http://bower.io)

$ npm install -g bower

Then run the following to install the JS libraries and Web Components dependencies (Polymer)

$ bower install

To generate the Service Worker (for offline to work) you much first install the dependencies using NPM

$ nmp install

Now you can run the Grunt task which generates the Service Worker

$ grunt

In order to test you need to run a web server. Using python that is quite easy

$ python -m SimpleHTTPServer 8080

Then open http://localhost:8080 in your web browser. Look up the machine's IP address and replace localhost with that if you want to run it on a mobile device connected to the same network.
