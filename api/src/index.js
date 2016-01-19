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
        console.log(err);
        response.status(501).json({"error": err});
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
      var hwset = parseLogs(epResponse);
      logset.push({endpoint: endpoints[i], logs: hwset});
    });
    res.json(logset);
  }).catch(function(err) {
    console.log(err);
    res.status(501).json({"error": err});
  });
});

var getLogs = function(endpoint) {
  return client.lrangeAsync('logs:'+endpoint, 0, -1);
};

var parseLogs = function(data) {
  var hwset = [];
  data.forEach(function (v, i) {
    var values = v.split(':');
    hwset.push({ip: values[0], timestamp: values[1]});
  });
  return hwset;
};

app.get('/', function(req, res, next) {
  client.incr('counter', function(err, counter) {
    if(err) return next(err);
    res.send('This page has been viewed ' + counter + ' times!');
  });
});

var getRoundedTimestamp = function(timestamp, granularity) {
  var factor = granularity.size * granularity.factor;
  return Math.floor(timestamp / factor) * factor;
};

http.createServer(app).listen(process.env.PORT || 80, function() {
  console.log('Listening on port ' + (process.env.PORT || 80));
});
