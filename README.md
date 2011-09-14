node tubes
==========

> Your web application is a series of tubes

node tubes lets you create complex web applications from a set of small components called *tubes*.

    tubes = require('node-tubes')

    var service = new tubes.Service(
                    {'main' : { iface: '127.0.0.1', port: 2080, canonicalHost: 'localhost' } },
                    {'main' : [ tubes.tap, new tubes.CannedResponse('hello, world'), tubes.drain ] }
                  )

    service.start()



Concepts
--------

The top-level entity in a *tubes* application is the *Service*. A *Service* consists of one or more named *Servers* and a *Tube Map*. In you application you would generally create a single *Service*, although there is nothing stopping you creating more than one *Service* within your application.

A *Service* is created using the normal Javascript constructor syntax. The constructor has two required parameters: a servers object, and a *Tube Map* object.

The *servers* object specifies which servers make up the *Service*. The key is the server's name (each server must have a unique name), the value is an object which describes the server. The server object recognizes the following keys:

 * `iface`: The interface on which the server should bind. Use '0.0.0.0' to specify binding to any interface.
 * `port`: The port on which to bind. If this is a privileged port then you will need to run you application with appropriate privileges.
 * `socket`: Instead of creating a new socket, the server can instead listen on an existing specified socket. This might be used when you application is launched by some external daemon such as node-launcher.
 * `canonicalHost`: This is the preferred host name for the web server. The interface to which the server is bound should be reachable using this canonical host name. This can be used by individual tubes when constructing absolute URLs.

The *Tube Map* describes the path that each HTTP transaction takes as it is processed. Each segment in the tube map performs a small amount of processing on the HTTP transaction, before handing it to the next tube in the map.

A *Tube Map* consists of a number of named *Tube Lines*. When a transaction comes in the appropriate line is chosen, and processing beings. The initial line is chosen based on the server on which transaction comes in on. There must be a *Tube Line* for each *Server* in the *Service*. The *Tube Line* itself is either an array of tubes, or a string referring to another named *Tube Line*.

In the example, the tube map is strictly linear, however it is possible to create much more complex maps. Some tubes act as a splitter and have multiple named exits. In this case an object must be used to specify the next tube in each case. E.g:

    { 'main' : [ tubes.tap, splitter, { 'case1' : [ case1tube ], 'case2' : [ case2tube_a, case2tube_b ] }, tubes.drain ]

Each *Tube* is either an object that has a process method, an object with keys used to select between multiple options, or a string referencing a named line.

Examples:

 * A simple map with on line called *main*. Processing goes from `tubes.tap` -> `normal_object` -> `tubes.drain`.

    { 'main' : [ tubes.tap, normal_object, tubes.drain } }

 * A more complex map using a named lines. Here there are two top-level lines *main* and *test*. Both share the *generator* line for most of their processing, however *main* additionally forces transactions through the *compress* tube.

    {
      'main' : [ tubes.tap, 'generator', compress, tubes.drain ],
      'test' : [ tubes.tap, 'generator', tubes.drain ],
      'generator' : [ normal_object, templatify ]
    }

Each main line should start processing with the *tubes.tap* and end with the *tubes.drain*. node tubes will throw an error if you construct a map where this doesn't hold. *Note:* node tubes tries to make these errors that happen at start up time only, however it may occur while the server it up and running, so it is important that you test your application thoroughly.


Pre-defined Tubes
------------------

*node tubes* includes a number of pre-defined tubes that can get you started.

> Canned Response

    tubes.CannedResponse(body, status, headers)

This is the simplest tube out there. It will always respond with the same response. The `body` argument is required. This is the data that will be sent as part of the HTTP response. The `status` argument is optional, it defaults to `200`. This is the HTTP status code that is returned as part of the response. The `headers` argument is optional, it defaults to `{"Content-Type": "text/plain"}`. These are the HTTP headers that will be returned as part of the response.

> Gzip

    tubes.Gzip()

This tube will compress the output using Gzip compress (if supported by the client).
