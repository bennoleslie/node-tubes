var tubes = require('../lib/tubes')

var am = new tubes.AssetManager([ [ /^\/a\/style\/([^\/]*)$/ , new tubes.LessDir('test/less/', 'test/less-out/')]
			    ])

var service = new tubes.Service(
    {
	'main' : { launcherFd: 'default', canonicalHost: 'localhost:3456' },
	'other' : { launcherFd: 'other', canonicalHost: 'localhost:7890' },
    },
    {
	'main' : [tubes.tap, 
		  new tubes.Router([
		      [/^\/a\/(.*)/, [am]],
		      ['/',  [new tubes.CannedResponse('Hello, World - main')]]
		  ]),
		  {
		      'client-error': [new tubes.CannedResponse('More specific 404 handling', null)]
		  },
		  tubes.drain],
	'other' : [tubes.tap, new tubes.CannedResponse('Hello, World - other'), tubes.drain],
	'client-error' : [new tubes.CannedResponse('A client error occurred', null), tubes.drain]
    }
)

service.start()
