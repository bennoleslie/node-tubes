Grabbag
=======

Grabbag is a set of small utility functions, that really don't deserve a package all of their own. I use this in pretty much every node.js project I do, and generally dump any non-project specific functions I write into here.

Feel free to extract functions where useful and put them into your own project.

Documentation for each function is included in the source. If you are extracting functions, please take the documentation with you (which includes a simple attribution line).

Functions
---------

 * `getPlatformArch`: return an object with 'platform' and 'arch' fields.
 * `binaryModule`: return the name  of a binary module
 * `parseCookie`: parse a 'cookie' formatted string and return an object.
