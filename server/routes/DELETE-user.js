/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Delete a user.

const httpErrors = require('../lib/http-errors');
const inputValidation = require('../lib/input-validation');
const userCollection = require('../lib/db').user;

exports.path = '/user/:email';
exports.verb = 'delete';
exports.authorization = require('../lib/page-authorization').AUTHENTICATED;

exports.validation = {
  _csrf: inputValidation.csrf()
};


exports.handler = function (req, res) {
  var sessionEmail = req.session.email;
  var specifiedEmail = req.params.email;

  if (sessionEmail !== specifiedEmail) throw httpErrors.ForbiddenError();

  return userCollection.deleteUser(sessionEmail)
    .then(function () {
      req.session.destroy();
      res.redirect('/user');
    });
};
