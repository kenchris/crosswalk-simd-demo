## A showcase of Crosswalk features

This show case is based on Polymer and web components and many things works in Chrome, though a few things will only work in Crosswalk.

### Get started

First of all you must install Node.js and the NPM (Node Package Manager).

With that done, you can install bower (http://bower.io)

$ npm install -g bower

Then run the following to install the JS libraries and Web Components dependencies (Polymer)

$ bower install

In order to test you need to run a web server. Using python that is quite easy

$ python -m SimpleHTTPServer 8080

Then open http://localhost:8080 in your web browser.

Look up the machine's IP address and replace localhost with that if you want to run it on a mobile device connected to the same network, which could be something like 192.168.0.22

Offline currently works with Chrome Beta on Android (Should soon work with regular Chrome on Android).

Enter the IP of the machine running the HTTPSimpleServer and port 8080 (192.168.0.22:8080 using the example above) in your Chrome Beta on Android. Choose "Add to launcher" from the menu.

You should now be able to disable WIFI and Mobile Data and still be able to run the app. If that doesn't work, try launching the app once before going offline.
