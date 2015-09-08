var db = require('../../storage/db');
var Promise = require('bluebird');

/**
 * Assumes connection is done outside of the module
 */

var items = [
  db.items.create({
    _id: db.ObjectId('000000000000000000000001'),
    url: 'http://127.0.0.1/data/item-1',
    selector: '#price',
    snapshots: [
      {
        date: 'Thu Sep 03 2015 19:17:55 GMT+0100 (GMT Daylight Time)',
        price: 19
      },
      {
        date: 'Thu Sep 02 2015 12:17:55 GMT+0100 (GMT Daylight Time)',
        price: 80
      }
    ],
    users: [
      {
        _id: '000000000000000000000001',
        maxPrice: 50,
        lastSent: 'Thu Sep 04 2015 19:17:55 GMT+0100 (GMT Daylight Time)'
      },
      {
        _id: '000000000000000000000002',
        maxPrice: 40,
        lastSent: 'Thu Sep 04 2015 19:17:55 GMT+0100 (GMT Daylight Time)'
      }
    ]
  }),
  db.items.create({
    _id: db.ObjectId('000000000000000000000002'),
    url: 'http://127.0.0.1/data/item-2',
    selector: '#price',
    snapshots: [
      {
        date: 'Thu Sep 03 2015 19:17:55 GMT+0100 (GMT Daylight Time)',
        price: 55
      }
    ],
    users: [
      {
        _id: '000000000000000000000001',
        maxPrice: 50,
        lastSent: 'Thu Sep 03 2015 19:17:55 GMT+0100 (GMT Daylight Time)'
      }
    ]
  })
];

function load() {
  var list = items.map(function(item) {
    return item.saveAsync();
  });
  return Promise.all(list);
}

function remove() {
  var list = items.map(function(item) {
    return item.removeAsync();
  });
  return Promise.all(list);
}

module.exports = {
  load: load,
  remove: remove
};
