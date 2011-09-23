Dust
====

> Asynchronous templates for the browser and node.js

#### <http://akdubya.github.com/dustjs> #

Local Modifications
--------------------

dust.js has been modified to fit a little better with how I (benno) use it with node. Specifically, with the existing approach the `cache` was a module global mutable data structure. This isn't ideal as it forces a single global namespace for template names, which I did not want to do.

To avoid massive restructuring the dust module now provides a single (quite expensive) `create` function call. This can be used to effectively create multiple dust instances, and therefore isolated template namespaces.

The object returned by `create` provides all the methods and functionality normally available from the dust module.


Why?
----

I like [Mustache](http://mustache.github.com) and variants but none of them offers quite what I need.

Use Dust if you want these things:

* async/streaming operation
* browser/node compatibility
* extended Mustache/ctemplate syntax
* clean, low-level API
* [high performance](http://akdubya.github.com/dustjs/benchmark/index.html)
* composable templates

Composable templates?
---------------------

    {^xhr}
      {>base_template/}
    {:else}
      {+main/}
    {/xhr}
    {<title}
      Child Title
    {/title}
    {<main}
      Child Content
    {/main}

Installation
------------

In Node:

    $ npm install dust

To render compiled templates in the browser:

    <script src="dust-core-0.3.0.min.js"></script>

Demo & Guide
------------

Extensive docs and a full demo are available at <http://akdubya.github.com/dustjs>