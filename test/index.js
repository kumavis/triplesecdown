const test = require('tape')
const memdown = require('memdown')
const TriplesecDown = require('../index.js')

test('basic tests', function(t){
  t.plan(3)

  setupDb(function(leveldown, internalDb){

    var testKey1 = 'test1'
    var testValue1 = 'fruitface'
    var testKey2 = 'test2'
    var testValue2 = 'snakeoil'

    leveldown.put(testKey1, testValue1, function(err){
      t.notOk(err, 'no error')
      leveldown.get(testKey1, function(err, value){
        t.notOk(err, 'no error')
        t.equal(testValue1, value.toString(), 'reread set value')
      })
    })

  })

})


function setupDb(cb){

  var internalDb = null
  var leveldown = TriplesecDown({
    secret: 'super_secret',
    db: function(){ internalDb = memdown(); return internalDb; },
  })()

  leveldown.open( cb.bind(null, leveldown, internalDb) )

}