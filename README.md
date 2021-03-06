# rum-diary.org

Real user metrics with ethics.

## Guiding principles
* Site operators need visitor information to make good business decisions.
* Site visitors have a right to privacy. Visitors give the sites they visit a level of trust that is not automatically extended to third parties.
* Data should be collected about a user only when necessary.
* Visitors should know what data is collected, how that data is used, with whom it is shared, how long it is retained, and whether it can be deleted.
* Every effort should be made to minimize fingerprintability by collecting as little data as necessary and anonymizing and aggregating the data that is collected.

## Prerequisites:

* [nodejs](http://nodejs.org/) &gt;= 0.10.0
* [mongodb](http://www.mongodb.org/) - on OSX with homebrew - `brew install mongo`

## Installation

1. Fork and clone [the repo](https://github.com/shane-tomlinson/rum-diary.org) from GitHub - https://github.com/shane-tomlinson/rum-diary.org/
2. `npm install`
3. Copy `server/etc/local.json-sample` to `server/etc/local.json`
4. In `server/etc/local.json`, modify the value of `session_cookie_secret`

## Run the server

1. `grunt server`

## Back end tests

1. `npm test`

## Front end tests

1. `grunt server:test`
2. Open `http://localhost:8443/tests/index.html` in the browser

## Author:
* Shane Tomlinson
* shane@shanetomlinson.com
* stomlinson@mozilla.com
* set117@yahoo.com
* https://shanetomlinson.com
* https://github.com/shane-tomlinson
* @shane_tomlinson

## Get involved:

Lots of work needs to be done! I obviously am not a designer, marketer, database administrator, or data engineer. Work needs done everywhere, from the landing page, through to capturing data in a privacy sensitive way and presenting awesome insights to site operators.

More concretely:

* Ensure a site visitor's privacy is respected through anonymisation and aggregation.
* Present site administrators with visitor valuable insights.
* Simplify site administration.
* Make the site aesthetically beautiful.
* Simplify local deployment.
* Crunch numbers in a performant way.

## License:
This software is available under version 2.0 of the MPL:

  https://www.mozilla.org/MPL/



