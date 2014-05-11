/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Site model

const Model = require('./model');
const accessLevels = require('../../lib/access-levels');

const siteDefinition = {
  hostname: String,
  total_hits: {
    type: Number,
    default: 0
  },
  owner: String,
  users: [{
    email: String,
    access_level: {
      type: Number,
      default: accessLevels.READONLY
    }
  }],
  // Is a site public
  is_public: {
    type: Boolean,
    default: true
  }
};

const SiteModel = Object.create(Model);
SiteModel.init('Site', siteDefinition);

SiteModel.ensureExists = function (hostname) {
  var self = this;
  return this.getOne({ hostname: hostname })
              .then(function (model) {
                if (model) return model;

                return self.create({
                  hostname: hostname
                });
              });
};

SiteModel.registerNewSite = function (hostname, owner) {
  var self = this;
  return this.getOne({ hostname: hostname })
              .then(function (model) {
                if (model) throw new Error('already exists');

                return self.create({
                  hostname: hostname,
                  owner: owner
                });
              });
};

SiteModel.hit = function (hostname) {
  return this.findOneAndUpdate(
    { hostname: hostname },
    {
      $inc: { total_hits: 1 }
    },
    // do NOT automatically create a new site.
    { upsert: false });
};

/**
 * Set a user's access level on the site.
 */
SiteModel.setUserAccessLevel = function(email, hostname, accessLevel) {
  var self = this;
  return this.getOne({ hostname: hostname })
    .then(function (site) {
      if (! site) {
        throw new Error('cannot find site: ' + hostname);
      }

      if (site.owner === email) {
        throw new Error('cannot set owner\'s access level');
      }

      // TODO - do we have to care whether the email actually
      // exists?

      // TODO - we should really be doing this as an atomic
      // op when reading the site.

      var users = site.users;
      var index = indexOfUser(users, email);

      if (index === -1) {
        // user is not yet added to DB.
        users.push({
          email: email,
          access_level: accessLevel
        });

        return self.update(site);
      } else if (users[index].access_level !== accessLevel) {
        // user is already in DB and access level must be updated.
        if (accessLevel === accessLevels.NONE) {
          users.splice(index, 1);
        } else {
          users[index].access_level = accessLevel;
        }
        return self.update(site);
      }

      return site;
    });
};

function indexOfUser(users, email) {
  for (var i = 0, user; user = users[i]; ++i) {
    if (user.email === email) return i;
  }

  return -1;
}

/**
 * Check if a user is authorized to view a site.
 */
SiteModel.isAuthorizedToView = function (email, hostname) {
  return isUserAuthorized.call(this, email, hostname, accessLevels.READONLY);
};

/**
 * Check if a user is authorized to administrate a site.
 */
SiteModel.isAuthorizedToAdministrate = function (email, hostname) {
  return isUserAuthorized.call(this, email, hostname, accessLevels.ADMIN);
};

function isUserAuthorized(email, hostname, minAccessLevel) {
  return this.getOne({ hostname: hostname, $or: [ { owner: email }, { 'users.email': email } ] })
              .then(function (model) {
                if (! model) return false;

                if (model.owner === email) return true;

                var index = indexOfUser(model.users, email);
                return model.users[index].access_level >= minAccessLevel;
              });
}

/**
 * Check if a user is an owner of a site.
 */
SiteModel.isOwner = function (email, hostname) {
  return this.getOne({ hostname: hostname, owner: email })
              .then(function (model) {
                if (! model) return false;

                return true;
              });
};

/**
 * Get all sites for a user.
 */
SiteModel.getSitesForUser = function (email) {
  return this.get({ $or: [ { owner: email }, { 'users.email': email } ] });
};

/**
 * Get all sites owned by a user
 */
SiteModel.getSitesOwnedByUser = function (email) {
  return this.get({ owner: email });
};

module.exports = SiteModel;
