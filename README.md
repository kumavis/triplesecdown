leveldb middleware for encrypted storage via triplesec

```js
const levelup = require('levelup')
const indexedDbDown = require('level-js')
const triplesecdown = require('triplesecdown')

var db = levelup('/not/used/', {
  db: triplesecdown({
    password: 'sup3r_s3cr3t!',
    db: indexedDbDown,
  })
})
```