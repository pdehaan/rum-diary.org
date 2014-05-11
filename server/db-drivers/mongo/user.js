/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// User model

const Promise = require('bluebird');
const Model = require('./model');
const Site = require('./site');
const accessLevels = require('../../lib/access-levels');

const userDefinition = {
  name: String,
  email: String
};

const UserModel = Object.create(Model);
UserModel.init('User', userDefinition);

/**
 * A helper that makes sense here even though most of the logic
 * is contained within the Site model
 */
UserModel.getSites = function (email) {
  return Site.getSitesForUser(email);
};

/**
 * Delete a user, remove any sites they own, and remove access to any sites
 * they have access to.
 */
UserModel.deleteUser = function (email) {
  var self = this;
  return Site.getSitesOwnedByUser(email)
    .then(function (sites) {
      // Remove all sites that the user owns.
      var promisesToFullfill = [];
      sites.forEach(function (site) {
        promisesToFullfill.push(Site.findOneAndDelete({ hostname: site.hostname }));
      });

      return Promise.all(promisesToFullfill);
    })
    .then(function () {
      return Site.getSitesForUser(email);
    })
    .then(function (sites) {
      // Remove user from all sites they have access to.
      var promisesToFullfill = [];
      sites.forEach(function (site) {
        promisesToFullfill.push(Site.setUserAccessLevel(email, site.hostname, accessLevels.NONE));
      });

      return Promise.all(promisesToFullfill);
    })
    .then(function () {
      // finally, remove the user.
      return UserModel.findOneAndDelete({ email: email });
    });
};

module.exports = UserModel;
