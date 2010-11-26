TODOs
-----
- thefunlangage.com
- run server in browser
- separate engines into pubsub/persistence
- use less instead of css by default

proofs of concept apps
----------------------
- chat w/ editable messages (type inference, item creation)
- chat w/ multiple chatrooms

unit testing
------------
- parser
- resolver
- fin client api
- persistence api (engines)
- pubsub api (engines)

engine drivers
--------------
- myslq persistence
- rabbitmq pubsub
- couchdb persistence
- couchdb pubsub (changes api)

language completeness
---------------------
- template arguments
- handler currying (arguments)
- creating new items
- file imports are relative to the process directory but should be relative to the file's directory
- helpful error reporting
	- unmatched xml tags

tags and types
--------------
- language/Tags and language/Types are not really being used yet
- for Items, infer what ItemProperties are expected and ensure that all Item creations have all expected ItemProperties defined
