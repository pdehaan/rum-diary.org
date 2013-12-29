/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const db = require('../db');
const logger = require('../logger');
const reduce = require('../reduce');

exports.path = '/site/:hostname/navigation/medians';
exports.verb = 'get';

exports.handler = function(req, res) {
  var hostname = req.params.hostname;
  logger.info('get information for %s', hostname);
  db.getByHostname(hostname, function(err, data) {
    if (err) return res.send(500);

    reduce.findMedianNavigationTimes(data, function(err, medians) {
      if (err) return res.send(500);
      res.send(medians);
    });
  });
};