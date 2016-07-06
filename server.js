var jquery  = require("./public/js/jquery-3.0.0.min.js");
var express = require("express");
var app     = express();
var path    = require('path');
var table   = require("./lib/table.js");
var port    = process.env.PORT || 3000;

// set up handlerbars view engine
var handlebars = require("express-handlebars").create({
  defaultLayout: "main",
  helpers: {
    static: function(name) {
      return require('./lib/static.js').map(name);
    }
  }
});

app.engine("handlebars", handlebars.engine);
app.set("view engine", "handlebars");

app.use(express.static('public'));

app.get(['/','/police'], function(req, res) {
    res.render("police", {
        currentYear : new Date().getFullYear(),
        service     : "Police",
        logo        : '<input type="image" id="badge" src="./images/SPD.jpg"/>',
        switchLink  : '<a class="btn btn-primary red" id="service" type="submit" href="./fire">View Fire Data</a>'
    });
});

app.get('/fire', function(req, res) {
    res.render("fire", {
        currentYear : new Date().getFullYear(),
        service     : "Fire",
        logo        : '<input type="image" id="badge" src="./images/SFD.jpg"/>',
        switchLink  : '<a class="btn btn-primary" id="service" type="submit" href="./police">View Police Data</a>'
    });
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
