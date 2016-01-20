var api_base = "http://<%= api_addr %>:<%= api_port %>/v1/";

var performQuery = function(endpoint) {
  return $.get(api_base+endpoint);
}

var getAllLogs = function() {
  var promise = performQuery('logs');
  promise.done(function(data) {
    data.forEach(function(endpoint) {
      endpoint.logs.forEach(function(el) {
        $("#all-logs tbody").append('<tr><td>'+endpoint.endpoint+'</td><td>'+formatTimeStamp(el.timestamp)+'</td><td>'+el.ip+'</td></tr>');
      });
    });
  });
}

var getAllMinuteLogs = function() {
  var promise = performQuery('logs/minute');
  promise.done(function(data) {
    data.forEach(function(el) {
      $("#minute-all-logs tbody").append('<tr><td>'+el.endpoint+'</td><td>'+formatTimeStamp(el.timestamp)+'</td><td>'+el.ip+'</td><td>'+el.hits+'</td></tr>');
    });
  });
}

var getAllHelloWorldLogs = function() {
  var promise = performQuery('hello-world/logs');
  promise.done(function(data) {
    data.logs.forEach(function(el) {
      $("#hw-all-logs tbody").append('<tr><td>'+formatTimeStamp(el.timestamp)+'</td><td>'+el.ip+'</td></tr>');
    });
  });
}

var getAllHelloWorldMinuteLogs = function() {
  var promise = performQuery('hello-world/logs/minute');
  promise.done(function(data) {
    data.forEach(function(el) {
      $("#hw-minute-all-logs tbody").append('<tr><td>'+formatTimeStamp(el.timestamp)+'</td><td>'+el.ip+'</td><td>'+el.hits+'</td></tr>');
    });
  });
}

var formatTimeStamp = function(timestamp) {
  var m = moment.unix(timestamp);
  return m.format('MM/DD/YYYY HH:mm:ss');
}
var init = function() {
  getAllLogs();
  getAllMinuteLogs();

  getAllHelloWorldLogs();
  getAllHelloWorldMinuteLogs();
}
$(document).ready(function() {
  init();
});
