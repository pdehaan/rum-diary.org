/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// generic model. basic CRUD operations.

const moment = require('moment');
const Promise = require('bluebird');
const mongoose = require('mongoose');
const mongooseTimestamps = require('mongoose-timestamp');
const Schema = mongoose.Schema;

const logger = require('../../lib/logger');


exports.init = function (name, definition) {
  const schema = new Schema(definition);
  schema.plugin(mongooseTimestamps);
  const Model = mongoose.model(name, schema);

  this.name = name;
  this.Model = Model;
};

exports.create = withDatabase(function (item, done) {
  /*console.log('saving item: %s', JSON.stringify(item));*/
  var model = this.createModel(item);
  return model.save(done);
});

exports.get = withDatabase(function (searchBy, done) {
  if ( ! done && typeof searchBy === 'function') {
    done = searchBy;
    searchBy = {};
  }

  var startTime = new Date();
  var name = this.name;

  searchBy = this.getSearchBy(searchBy);

  logger.info('%s->get: %s', name, JSON.stringify(searchBy));
  return this.Model.find(searchBy).exec().then(function(models) {
    computeDuration();
    if (done) done(null, models);
    return models;
  })
  .then(null, function(err) {
    computeDuration();
    logger.error('%s->get error: %s', name, String(err));
    if (done) done(err);
    throw err;
  });

  function computeDuration() {
    var endTime = new Date();
    var duration = endTime.getDate() - startTime.getDate();
    logger.info('%s->get query time for %s: %s ms',
                    name, JSON.stringify(searchBy), duration);
  }
});

exports.getOne = withDatabase(function (searchBy, done) {
  if ( ! done && typeof searchBy === 'function') {
    done = searchBy;
    searchBy = {};
  }

  var startTime = new Date();
  var name = this.name;

  searchBy = this.getSearchBy(searchBy);

  logger.info('%s->getOne: %s', name, JSON.stringify(searchBy));
  return this.Model.findOne(searchBy).exec().then(function(model) {
    computeDuration();
    if (done) done(null, model);
    return model;
  })
  .then(null, function(err) {
    computeDuration();
    logger.error('%s->getOne error: %s', name, String(err));
    if (done) done(err);
    throw err;
  });

  function computeDuration() {
    var endTime = new Date();
    var duration = endTime.getDate() - startTime.getDate();
    logger.info('%s->getOne query time for %s: %s ms',
                    name, JSON.stringify(searchBy), duration);
  }
});

exports.clear = withDatabase(function (done) {
  var resolver = Promise.defer();

  return this.Model.find(function (err, models) {
    if (err) {
      if (done) done(err);
      resolver.reject(err);
      return;
    }

    models.forEach(function (model) {
      model.remove();
    });

    if (done) done(null);
    resolver.fulfill();
  });

  return resolver.promise;
});

exports.getSearchBy = function (searchBy) {
  return searchBy;
};


exports.createModel = function(data) {
  var model = new this.Model(data);
  return model;
};

function withDatabase(op) {
  return function () {
    var args = [].slice.call(arguments, 0);
    var self = this;
    return connect().then(function() {
      return op.apply(self, args);
    });
  };
}

var connectionResolver = Promise.defer();
var connectionResolved = false;
function connect() {
  if (connectionResolved) {
    return connectionResolver.promise;
  }

  mongoose.connect('mongodb://localhost/test');
  var db = mongoose.connection;

  db.on('error', function (err) {
    logger.error('Error connecting to database: %s', String(err));

    connectionResolved = true;
    connectionResolver.reject(err);
  });

  db.once('open', function callback() {
    logger.info('Connected to database');

    connectionResolved = true;
    connectionResolver.fulfill();
  });

  return connectionResolver.promise;
}

