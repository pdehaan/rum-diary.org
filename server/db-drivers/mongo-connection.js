/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


/**
 * Handle connections to the database
 */

const Promise = require('bluebird');
const mongoose = require('mongoose');

const logger = require('../lib/logger');
const config = require('../lib/config');

exports.connect = connect;

var connectionResolver;
function connect() {
  if (connectionResolver) {
    return connectionResolver.promise;
  }
  connectionResolver = Promise.defer();

  var databaseURI = config.get('mongo.databaseURI');
  var user = config.get('mongo.user');
  var password = config.get('mongo.password');

  logger.info('connecting to database: `%s` as user `%s`', databaseURI, user);

  mongoose.connect(databaseURI, {
    user: config.get('mongo.user'),
    pass: config.get('mongo.password')
  });

  var db = mongoose.connection;

  db.on('error', function (err) {
    logger.error('Error connecting to database: %s', String(err));
    connectionResolver.reject(err);
  });

  db.once('open', function callback() {
    logger.info('Connected to database');
    connectionResolver.fulfill(db);
  });

  return connectionResolver.promise;
}


