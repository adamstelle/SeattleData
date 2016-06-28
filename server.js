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




app.listen(port);
console.log('Server started! At http://localhost:' + port);
