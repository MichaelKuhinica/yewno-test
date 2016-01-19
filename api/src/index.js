var express = require('express'),
    http = require('http'),
    redis = require('redis'),
    util = require('util'),
    promise = require('bluebird'),
    moment = require('moment');

var app = express();
promise.promisifyAll(redis.RedisClient.prototype);
promise.promisifyAll(redis.Multi.prototype);

var granularities = {
  seconds: {
    size: 60,
    factor: 1
  }
};

var endpoints = ['hello-world'];
var client = redis.createClient('6379', 'redis');

app.get('/v1/hello-world', function(req, response, next) {
  var stamp = moment().unix();
  var ip = req.ip;
  var multi = client.multi();
  multi.rpush(['logs:hello-world', ip+":"+stamp])
    .hincrby('hits:hello-world', ip+':'+getRoundedTimestamp(stamp, granularities.seconds), 1)
    .exec(function(err, res) {
      if(err) {
        reportError(err, res);
      } else {
        response.json({"message": "hello world"});
      }
    });
});

app.get('/v1/logs', function(req, res, next) {
  var promises = [];
  endpoints.forEach(function(ep) {
    promises.push(getLogs(ep));
  });
  promise.all(promises).then(function(data) {
    var logset = [];
    data.forEach(function(epResponse, i) {
      var logs = parseLogs(epResponse);
      logset.push({endpoint: endpoints[i], logs: logs});
    });
    res.json(logset);
  }).catch(function(err) {
    reportError(err, res);
  });
});

app.get('/v1/hello-world/logs/minute', function(req, res, next) {
  client.hgetall('hits:hello-world', function(err, data) {
    if(err) {
      reportError(err, res);
    } else {
      var logs = parseMinuteLog(data);
      res.json(logs);
    }
  });
});

app.get('/v1/logs/minute', function(req, res, next) {
  var minute_log = [];
  client.keysAsync('hits:*').then(function(hits) {
    var promises = [];
    hits.forEach(function(key, idx) {
      promises.push(client.hgetallAsync(key));
    });
    promise.all(promises).then(function(data) {
      data.forEach(function(el) {
        var logs = parseMinuteLog(el);
        minute_log = minute_log.concat(logs);
      });
      res.json(minute_log);
    }).catch(function(err) {
      reportError(err, res);
    });
  }).catch(function(err) {
    reportError(err, res);
  });
});

app.get('/v1/hello-world/logs', function(req, res, next) {
  getLogs('hello-world').then(function(data) {
    res.json({logs: parseLogs(data)});
  }).catch(function(err) {
    reportError(err, res);
  });
});

var parseMinuteLog = function(data) {
  var logs = [];
  Object.keys(data).forEach(function(k, i) {
    var obj = prepareObject(k);
    obj['hits'] = data[k];
    logs.push(obj);
  });
  return logs;
};

var reportError = function(err, res) {
  console.log(err);
  res.status(501).json({"error": err});
};

var getLogs = function(endpoint) {
  return client.lrangeAsync('logs:'+endpoint, 0, -1);
};

var parseLogs = function(data) {
  var logs = [];
  data.forEach(function (v) {
    logs.push(prepareObject(v));
  });
  return logs;
};

var prepareObject = function(str) {
  var values = str.split(':');
  return {ip: values[0], timestamp: values[1]};
};

var getRoundedTimestamp = function(timestamp, granularity) {
  var factor = granularity.size * granularity.factor;
  return Math.floor(timestamp / factor) * factor;
};

http.createServer(app).listen(process.env.PORT || 8080, function() {
  console.log('Listening on port ' + (process.env.PORT || 8080));
});
