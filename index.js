const triplesec = require('triplesec')
const WordArray = triplesec.WordArray
const Encryptor = triplesec.Encryptor
const Decryptor = triplesec.Decryptor
const SHA256 = triplesec.SHA256
const async = require('async')
const bind = require('ap').partial
const SALT_KEY = '__triplesec-key-salt__'
const ENCODING = 'base64'

module.exports = triplesecdown


/*

  triplesec down

  leveldb "middleware" that takes a leveldown factory
  and intercepts k,v's, allowing you to obfuscate keys
  and encrypt values.

  would be nice to breakout into a generic middleware api

  also note that this is slow as hell

*/

function triplesecdown(opts) {
  var dbFactory = opts.db
  var secret = new Buffer(opts.secret)
  return function(location){
    var db = dbFactory(location)
    overwrite(db, '_open', open, secret)
    overwrite(db, '_get', get, secret)
    overwrite(db, '_put', put, secret)
    overwrite(db, '_del', del)
    overwrite(db, '_batch', batch)
    return db
  }
}

function open(_super, secret, options, cb) {
  async.series([
    bind(_super, options),
    bind(loadKeyObfSalt, this, secret),
  ], cb)
}

function get(_super, secret, key, options, cb) {
  obfuscateKey(this._salt, key, function(err, obfuscatedKey){
    if (err) return cb(err)
    _super(obfuscatedKey, options, function(err, encryptedValue){
      if (err) return cb(err)
      decryptValue(secret, encryptedValue, cb)
    })
  })
}

function put(_super, secret, key, value, options, cb) {
  obfuscateKey(this._salt, key, function(err, obfuscatedKey){
    if (err) return cb(err)
    encryptValue(secret, value, function(err, encryptedValue){
      if (err) return cb(err)
      _super(obfuscatedKey, encryptedValue, options, cb)
    })
  })
}

function del(_super, key, options, cb) {
  obfuscateKey(this._salt, key, function(err, obfuscatedKey){
    if (err) return cb(err)
    _super(obfuscatedKey, options, cb)
  })
}

function batch(_super, array, options, cb) {
  throw new Error('triplesecdown does not support batched operations')
}

// crypto

function loadKeyObfSalt(db, secret, cb) {
  db.__get(SALT_KEY, {}, function(err, salt){
    if (salt) {
      db._salt = WordArray.from_buffer(new Buffer(salt, ENCODING))
      cb()
    } else {
      createObfuscationSalt(db, secret, function(err, salt){
        if (err) return cb(err)
        db._salt = salt
        db.__put(SALT_KEY, salt.to_buffer().toString(ENCODING), {}, cb)
      })
    }
  })
}

function createObfuscationSalt(db, secret, cb){
  var enc = new Encryptor({ key: secret })
  enc.resalt({}, function(err){
    if (err) return cb(err)
    cb(null, enc.salt)
  })
}

function obfuscateKey(salt, input, cb) {
  var hash = new triplesec.hash.SHA256()
  var formattedInput = WordArray.from_buffer(new Buffer(salt.to_hex()+input))
  hash.update(formattedInput)
  var output = hash.finalize().to_buffer().toString(ENCODING)
  cb(null, output)
}

function encryptValue(secret, input, cb) {
  var enc = new Encryptor({ key: secret })
  async.series([
    enc.resalt.bind(enc, {}),
    enc.run.bind(enc, { data: new Buffer(input) }),
  ], function(err, results){
    if (err) return cb(err)
    var output = results[1].toString(ENCODING)
    cb(null, output)
  })
}

function decryptValue(secret, input, cb) {
  var dec = new Decryptor({ key: secret })
  dec.run({ data: new Buffer(input, ENCODING) }, cb)
}

// util

function overwrite(obj, key, fn) {
  var _super = obj[key].bind(obj)
  obj['_'+key] = _super
  var boundArgs = [].slice.call(arguments, 3)
  boundArgs.unshift(_super)
  // fn is called args appended:
  // `_super` and any extra arguments provided to overwrite
  obj[key] = function superWrapper(){
    var newArgs = [].slice.call(arguments)
    return fn.apply(obj, boundArgs.concat(newArgs))
  }
}