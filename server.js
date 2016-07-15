var jquery  = require("./public/js/jquery-3.0.0.min.js");
var express = require("express");
var app     = express();
var path    = require("path");
var fs      = require("fs");
var pip     = require("./lib/leaflet.js");
var headless= require("leaflet-headless");
var port    = process.env.PORT || 3000;
var date    = new Date();
var getJSON = require("get-json");
var baseURL = "https://data.seattle.gov/resource/pu5n-trf4";
var schedule= require("node-schedule");

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

// Load neighborhoods & Calc total
var neighborhoods = JSON.parse(fs.readFileSync('./jsonData/neighborhoods.geojson', 'utf8'));
var gjLayer = L.geoJson(neighborhoods);
var numHoods= neighborhoods["features"].length;

// Build API Call
function getIncidentData() {
  var today = date.toJSON().slice(0,10);
  var lastMonth = new Date(date.setDate(date.getDate()-1)).toJSON().slice(0,10);
  var apiCall = baseURL
    + ".json?$limit=100000&$where=event_clearance_date >= \""
    + lastMonth
    + "\" AND event_clearance_date < \""
    + today + "\"";
  getJSON(apiCall, function(error, response) {
    var myjson = response;
    mapIncidents(myjson);
  });
}

function mapIncidents(myjson) {
  var resultsByHood = [];
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

  // Get city-wide incidents by type & avg # incidents per neighborhood
  var totalIncidentsByType = (getIncidentsByType(resultsByHood));
  var myNeighborhood = [];
  neighborhoods["features"].forEach(function(n) {
    var thisHood = {};
    thisHood["name"]         = n["properties"]["name"];
    thisHood["incidents"]    = resultsByHood.filter(function(o) {
      return (o.localhood || o.neighborhood) == n["properties"]["name"]
    });
    thisHood["numIncidents"] = thisHood["incidents"].length;
    thisHood["percentage"]   = (thisHood["numIncidents"] / resultsByHood.length)*100;
    thisHood["numVariance"]  = (thisHood["numIncidents"] - resultsByHood.length / numHoods);
    thisHood["percentVariance"] = (thisHood["percentage"] - resultsByHood.length *100 / numHoods / resultsByHood.length );
    myNeighborhood.push(thisHood);
  });
  // console.log(myNeighborhood);
  // Check that all incidents have been mapped to neighborhood
  j = 0;
  for (i=0;i<myNeighborhood.length;i++) {
    j += myNeighborhood[i]["incidents"].length
  }
  console.log(" "+resultsByHood.length - j+" incidents were unsuccessfully mapped to a neighborhood.");
  var jsonResults = JSON.stringify(myNeighborhood);
  return jsonResults;
}

// Calc total incidents by type
function getIncidentsByType(object) {
  var counts = {};
  var IncidentsByType  = [];
  object.forEach(function (o) {
    if (!counts.hasOwnProperty(o.type)) {
      counts[o.type] = 0;
    }
    counts[o.type] += 1;
  });
  for (var item in counts) {
    IncidentsByType.push([item, counts[item], (counts[item]/numHoods)])
    IncidentsByType.sort(
      function(a, b) {
        return a[1] - b[1]
      }
    )
  }
  return IncidentsByType;
}

var results = getIncidentData();
console.log(results);

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

app.listen(port);
