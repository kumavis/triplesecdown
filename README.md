leveldb middleware for encrypted storage via triplesec

```js
const levelup = require('levelup')
const indexedDbDown = require('level-js')
const triplesecdown = require('triplesecdown')

var db = levelup('/not/used/', {
  db: triplesecdown({
    secret: 'sup3r_s3cr3t!',
    db: indexedDbDown,
  })
})
```

[![Greenkeeper badge](https://badges.greenkeeper.io/kumavis/triplesecdown.svg)](https://greenkeeper.io/)