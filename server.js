var jquery  = require("./public/js/jquery-3.0.0.min.js");
// var Socrata = require("node-socrata");
var express = require("express");
var app     = express();
var path    = require('path');
var port    = process.env.PORT || 3000;

// Routes for CSS & JS files
app.use("/stylesheets", express.static(__dirname + "/public/stylesheets"));
app.use("/js", express.static(__dirname + "/public/js"));


app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/public/index.html'));
});

app.get(/^\/fire\//, function(req, res) {
    res.sendFile(path.join(__dirname + './public/index.html'));
});

// Custom 404 page
app.use(function(req, res){
  res.type("text/plain");
  res.status(404);
  res.send("404 - Not Found");
});

app.use(function(err, req, res, next){
  console.error(err.stack);
  res.type("text/plain");
  res.status(500);
  res.send("500 - Server Error");
});

function getURL() {
  app.get("/fire/dates", function(req, res) {
    var startDate = req.param("start");
    var endDate   = req.param("end");
    var fullParam = "/fire/dates?start="+startDate+"%end="+endDate+"";
    console.log(fullParam);
    res.send(fullParam);
  });
}

app.listen(port);
getURL();
