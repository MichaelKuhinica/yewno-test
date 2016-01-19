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
    size: 1440,
    factor: 60
  }
};

var endpoints = ['hello-world'];
var client = redis.createClient('6379', 'redis');

app.get('/v1/hello-world', function(req, response, next) {
  var stamp = moment().unix();
  var ip = req.ip;
  var multi = client.multi();
  multi.rpush(['logs:hello-world', ip+":"+stamp])
    .hincrby('logs:hello-world:'+ip+':'+getRoundedTimestamp(stamp, granularities.seconds), 'hits', 1)
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

app.get('/v1/hello-world/logs', function(req, res, next) {
  getLogs('hello-world').then(function(data) {
    res.json({logs: parseLogs(data)});
  }).catch(function(err) {
    reportError(err, res);
  });
});

var reportError = function(err, res) {
  console.log(err);
  res.status(501).json({"error": err});
};

var getLogs = function(endpoint) {
  return client.lrangeAsync('logs:'+endpoint, 0, -1);
};

var parseLogs = function(data) {
  var logs = [];
  data.forEach(function (v, i) {
    var values = v.split(':');
    logs.push({ip: values[0], timestamp: values[1]});
  });
  return logs;
};

var getRoundedTimestamp = function(timestamp, granularity) {
  var factor = granularity.size * granularity.factor;
  return Math.floor(timestamp / factor) * factor;
};

http.createServer(app).listen(process.env.PORT || 8080, function() {
  console.log('Listening on port ' + (process.env.PORT || 8080));
});
