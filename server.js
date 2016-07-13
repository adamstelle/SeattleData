var jquery  = require("./public/js/jquery-3.0.0.min.js");
var express = require("express");
var app     = express();
var path    = require('path');
var fs      = require('fs');
var pip     = require('leaflet-pip');
var headless= require('leaflet-headless');
var port    = process.env.PORT || 3000;
var date    = new Date();
var getJSON = require('get-json')
var baseURL = "https://data.seattle.gov/resource/pu5n-trf4";

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

// Build API Call
function getIncidentData() {
  var today = date.toJSON().slice(0,10);
  var lastMonth = new Date(date.setDate(date.getDate()-1)).toJSON().slice(0,10);
  var apiCall = baseURL
    + ".json?$limit=100000&$where=event_clearance_date >= \""
    + lastMonth
    + "\" AND event_clearance_date < \""
    + today + "\"";
  // Calculate number of days in range
  getJSON(apiCall, function(error, response) {
    var myjson = response;
    mapIncidents(myjson);
  });
}

function mapIncidents(myjson) {
  var resultsByHood = [];
  var counts        = {};
  var sortedByType  = [];
  for (i=0; i<myjson.length; i++) {
    try {
      var result = {};
      result["neighborhood"] = pip.pointInLayer([myjson[i]["longitude"],myjson[i]["latitude"]], gjLayer, [true])[0]["feature"]["properties"]["nhood"];
      result["localhood"] = pip.pointInLayer([myjson[i]["longitude"],myjson[i]["latitude"]], gjLayer, [true])[0]["feature"]["properties"]["nested"];
      result["type"]    = myjson[i]["event_clearance_subgroup"];
      result["lat"]     = myjson[i]["latitude"];
      result["lng"]     = myjson[i]["longitude"];
      result["address"] = myjson[i]["hundred_block_location"];
      result["id"]      = myjson[i]["cad_cdw_id"]
      resultsByHood.push(result);
    }
    catch (e) {
      console.log(" "+i+" incident has undefined latlng!, "+(e)+" ");
    }
  }
  var myNeighborhood = resultsByHood.filter(function(el) {
    return el.neighborhood = "Capitol Hill"
  });
  myNeighborhood.forEach(function (o) {
    if (!counts.hasOwnProperty(o.type)) {
      counts[o.type] = 0;
    }
    counts[o.type] += 1;
  });
  for (var item in counts) {
    sortedByType.push([item, counts[item]])
    sortedByType.sort(
      function(a, b) {
        return a[1] - b[1]
      }
    )
  }
  console.log(myNeighborhood);
  console.log(sortedByType);
}

getIncidentData();


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
