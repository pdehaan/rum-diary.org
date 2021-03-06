/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function() {
 var Micrajax = (function() {
  'use strict';

  function curry(fToBind) {
    var aArgs = [].slice.call(arguments, 1),
        fBound = function () {
          return fToBind.apply(null, aArgs.concat([].slice.call(arguments)));
        };

    return fBound;
  }

  function getXHRObject() {
    var xhrObject;

    // From http://blogs.msdn.com/b/ie/archive/2011/08/31/browsing-without-plug-ins.aspx
    // Best Practice: Use Native XHR, if available
    if (window.XMLHttpRequest) {
      // If IE7+, Gecko, WebKit: Use native object
      xhrObject = new window.XMLHttpRequest();
    }
    else if (window.ActiveXObject) {
      // ...if not, try the ActiveX control
      xhrObject = new window.ActiveXObject('Microsoft.XMLHTTP');
    }

    return xhrObject;
  }

  function noOp() {}

  function onReadyStateChange(xhrObject, callback) {
    try {
      if (xhrObject.readyState === 4) {
        xhrObject.onreadystatechange = noOp;

        callback && callback(xhrObject.responseText, xhrObject.status, xhrObject.statusText);
      }
    } catch(e) {}
  }

  function toRequestString(data) {
    var components = [],
        requestString = '';

    for(var key in data) {
      if (typeof data[key] !== 'undefined') {
        components.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
      }
    }

    if (components && components.length) {
      requestString = components.join('&');
    }

    return requestString;
  }


  function setRequestHeaders(definedHeaders, xhrObject) {
    var headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json;text/plain'
    };

    for(var definedHeader in definedHeaders) {
      headers[definedHeader] = definedHeaders[definedHeader];
    }

    for(var key in headers) {
      xhrObject.setRequestHeader(key, headers[key]);
    }
  }

  function getURL(url, type, data) {
    var requestString = toRequestString(data);

    if (type === 'GET' && requestString) {
      url += '?' + requestString;
    }

    return url;
  }

  function getData(contentType, type, data) {
    var sendData;

    if (type !== 'GET' && data) {
      switch(contentType) {
        case 'application/json':
          if(typeof data === 'string') {
            sendData = data;
          }
          else {
            sendData = JSON.stringify(data);
          }
          break;
        case 'application/x-www-form-urlencoded':
          sendData = toRequestString(data);
          break;
        default:
          // do nothing
          break;
      }
    }

    return sendData || null;
  }

  function sendRequest(options, callback, data) {
    var xhrObject = getXHRObject();

    if (xhrObject) {
      xhrObject.onreadystatechange = curry(onReadyStateChange, xhrObject, callback);

      var type = (options.type || 'GET').toUpperCase(),
          contentType = options.contentType || 'application/x-www-form-urlencoded',
          url = getURL(options.url, type, options.data);

      data = getData(contentType, type, options.data);

      xhrObject.open(type, url, options.async);
      var headers = {
        'Content-type' : contentType
      };
      for(var k in options.headers) {
        headers[k] = options.headers[k];
      }
      setRequestHeaders(headers, xhrObject);
      xhrObject.send(data);
    }
    else {
      throw 'could not get XHR object';
    }

    return xhrObject;
  }

  var Micrajax = {
    ajax: function(options) {
      var noOp = function () {},
          error = options.error || noOp,
          success = options.success || noOp,
          mockXHR = { readyState: 0 };

      if (! options.hasOwnProperty('async')) {
        options.async = true;
      }

      var xhrObject = sendRequest(options, function(responseText, status, statusText) {
        mockXHR.status = status;
        mockXHR.responseText = responseText;
        if (!mockXHR.statusText)
          mockXHR.statusText = status !== 0 ? statusText : 'error';
        mockXHR.readyState = 4;

        if (status >= 200 && status < 300 || status === 304) {
          var respData = responseText;

          try {
            // The text response could be text/plain, just ignore the JSON
            // parse error in this case.
            respData = JSON.parse(responseText);
          } catch(e) {}

          success && success(respData, responseText, mockXHR);
        }
        else {
          error && error(mockXHR, status, responseText);
        }
      });

      mockXHR.abort = function() {
        mockXHR.statusText = 'aborted';
        xhrObject.abort();
      };

      return mockXHR;
    }
  };

  return Micrajax;

}());
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function (exports, undefined) {
  'use strict';

  var SpeedTrap = {
    init: function (options) {
      options = options || {};
      this.navigationTiming = create(NavigationTiming);
      this.navigationTiming.init(options);

      this.baseTime = this.navigationTiming.get().navigationStart;

      this.timers = create(Timers);
      this.timers.init({
        baseTime: this.baseTime
      });

      this.events = create(Events);
      this.events.init({
        baseTime: this.baseTime
      });

      this.uuid = guid();

      this.tags = options.tags || [];

      // store a bit with the site being tracked to avoid sending cookies to
      // rum-diary.org. This bit keeps track whether the user has visited
      // this site before. Since localStorage is scoped to a particular
      // domain, it is not shared with other sites.
      this.returning = !!localStorage.getItem('_st');
      localStorage.setItem('_st', '1');
    },

    /**
     * Data to send on page load.
     */
    getLoad: function () {
      // puuid is saved for users who visit another page on the same
      // site. The current page will be updated to set its is_exit flag
      // to false as well as update which page the user goes to next.
      var previousPageUUID = sessionStorage.getItem('_puuid');
      sessionStorage.removeItem('_puuid');

      return {
        uuid: this.uuid,
        puuid: previousPageUUID,
        navigationTiming: this.navigationTiming.diff(),
        referrer: document.referrer || '',
        tags: this.tags,
        returning: this.returning
      };
    },

    /**
     * Data to send on page unload
     */
    getUnload: function () {
      // puuid is saved for users who visit another page on the same
      // site. The current page will be updated to set its is_exit flag
      // to false as well as update which page the user goes to next.
      sessionStorage.setItem('_puuid', this.uuid);

      return {
        uuid: this.uuid,
        duration: now() - this.baseTime,
        timers: this.timers.get(),
        events: this.events.get()
      };
    }
  };

  var NAVIGATION_TIMING_FIELDS = {
    'navigationStart': undefined,
    'unloadEventStart': undefined,
    'unloadEventEnd': undefined,
    'redirectStart': undefined,
    'redirectEnd': undefined,
    'fetchStart': undefined,
    'domainLookupStart': undefined,
    'domainLookupEnd': undefined,
    'connectStart': undefined,
    'connectEnd': undefined,
    'secureConnectionStart': undefined,
    'requestStart': undefined,
    'responseStart': undefined,
    'responseEnd': undefined,
    'domLoading': undefined,
    'domInteractive': undefined,
    'domContentLoadedEventStart': undefined,
    'domContentLoadedEventEnd': undefined,
    'domComplete': undefined,
    'loadEventStart': undefined,
    'loadEventEnd': undefined
  };

  var navigationTiming;
  try {
    navigationTiming = window.performance.timing;
  } catch (e) {
    navigationTiming = create(NAVIGATION_TIMING_FIELDS);
  }

  var NavigationTiming = {
    init: function (options) {
      options = options || {};
      this.navigationTiming = options.navigationTiming || navigationTiming;
      this.baseTime = this.navigationTiming.navigationStart;
    },

    get: function () {
      return this.navigationTiming;
    },

    diff: function() {
      var diff = {};
      var baseTime = this.baseTime;
      for (var key in NAVIGATION_TIMING_FIELDS) {
        if ( ! this.navigationTiming[key])
          diff[key] = null;
        else
          diff[key] = this.navigationTiming[key] - baseTime;
      }
      return diff;
    }
  };

  var Timers = {
    init: function (options) {
      this.completed = {};
      this.running = {};
      this.baseTime = options.baseTime;
    },

    start: function (name) {
      var start = now();
      if (this.running[name]) throw new Error(name + ' timer already started');

      this.running[name] = start;
    },

    stop: function (name) {
      var stop = now();

      if (! this.running[name]) throw new Error(name + ' timer not started');

      if (! this.completed[name]) this.completed[name] = [];
      var start = this.running[name];

      this.completed[name].push({
        start: start - this.baseTime,
        stop: stop - this.baseTime,
        elapsed: stop - start
      });

      this.running[name] = null;
      delete this.running[name];
    },

    get: function (name) {
      if (! name) return this.completed;
      return this.completed[name];
    }
  };

  var Events = {
    init: function (options) {
      this.events = [];
      this.baseTime = options.baseTime;
    },

    capture: function (name) {
      this.events.push({
        type: name,
        timestamp: now() - this.baseTime
      });
    },

    get: function () {
      return this.events;
    }
  };

  function create(proto) {
    if (Object.create) return Object.create(proto);

    var F = function () {};
    F.prototype = proto;
    return new F();
  }

  function now() {
    return new Date().getTime();
  }

  function guid() {
    // from http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      /*jshint bitwise: false*/
      var r = Math.random() * 16|0, v = c === 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  }

  exports.SpeedTrap = create(SpeedTrap);

}(this));

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function () {
  'use strict';

  var server = '/* @echo dataCollectionServer */';
  var speedTrap = window.SpeedTrap;
  speedTrap.init({
    tags: getTagsFromScriptTag()
  });

  function bindDOMEvent(element, handler, callback) {
    if (element.addEventListener) {
      element.addEventListener(handler, callback, false);
    } else if (element.attachEvent) {
      element.attachEvent('on' + handler, callback);
    }
  }

  bindDOMEvent(window, 'load', onLoadHandler);
  bindDOMEvent(window, 'unload', onUnloadHandler);

  function onLoadHandler() {
    setTimeout(function () {
      var data = speedTrap.getLoad();
      Micrajax.ajax({
        type: 'POST',
        url: server + '/navigation',
        contentType: 'application/json',
        data: data
      });
    }, 100);
  }

  function onUnloadHandler() {
    var data = speedTrap.getUnload();

    var url = server + '/unload';
    /*
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, JSON.stringify(data));
    } else {
      */
      Micrajax.ajax({
        // sync otherwise the browser closes the connection.
        async: false,
        // put to update the data.
        type: 'POST',
        url: url,
        contentType: 'application/json',
        data: data
      });
    /*}*/
  }

  function getTagsFromScriptTag() {
    var scripts = document.scripts;

    for (var i = 0; i < scripts.length; ++i) {
      var script = scripts[i];
      if (script.src === server + '/include.js') {
        var tags = script.getAttribute('data-tags') || '';
        return tags.split(',');
      }
    }

    return [];
  }

}());
}());

