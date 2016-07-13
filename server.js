var jquery  = require("./public/js/jquery-3.0.0.min.js");
var express = require("express");
var app     = express();
var path    = require('path');
var table   = require("./lib/table.js");
var fs      = require('fs');
var pip     = require('leaflet-pip');
var headless = require('leaflet-headless');
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

// RECURRING SERVER SIDE SCRIPTS

// Load neighborhoods
var neighborhoods = JSON.parse(fs.readFileSync('./jsonData/neighborhoods.geojson', 'utf8'));
var gjLayer = L.geoJson(neighborhoods);

// Get incident JSON data
var results = pip.pointInLayer([-122.32245,	47.599186], gjLayer, [true]);

// function getIncidentData(inputMin, inputMax) {
//   console.log("calling API for " + currentService);
//   apiCall = baseURL
//     + ".json?$limit=100000&$where="+dateHeader+" >= \""
//     + inputMin
//     + "\" AND "+dateHeader+" < \""
//     + inputMax + "\"";
//   console.log(apiCall);
//   // Modify URL Hash
//   window.location.hash = "/dates?start="+inputMin+"%end="+inputMax+"";
//   // Calculate number of days in range
//   numDays = (new Date(inputMax)-new Date(inputMin))/(1000*60*60*24);
//   getSodaData(apiCall, numDays);
// }


console.log(results[0]["feature"]["properties"]["nested"]);

// BASIC ROUTES
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

app.get('/hood', function(req, res) {
    res.render("hood", {
        currentYear : new Date().getFullYear(),
        results     : results
    });
});


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





// Get last X months of city-wide incident data


app.listen(port);
