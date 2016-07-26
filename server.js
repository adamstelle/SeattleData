var jquery  = require("./public/js/jquery-3.0.0.min.js");
var express = require("express");
var bodyParser =require("body-parser");
var app     = express();
var path    = require("path");
var fs      = require("fs");
// Store pip locally (broken module) in public to make available to client JS
var pip     = require("./public/js/leaflet.js");
var headless= require("leaflet-headless");
var port    = process.env.PORT || 3000;
var date    = new Date();
var getJSON = require("get-json");
var baseURL = "https://data.seattle.gov/resource/pu5n-trf4";
var schedule= require("node-schedule");
var NodeGeocoder = require('node-geocoder');

// Set # of days of data to collect from server
var numDays = 30;


app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());


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
function getIncidentData(callback) {
  var today = date.toJSON().slice(0,10);
  var lastMonth = new Date(date.setDate(date.getDate()-numDays)).toJSON().slice(0,10);
  var apiCall = baseURL
    + ".json?$limit=100000&$where=event_clearance_date >= \""
    + lastMonth
    + "\" AND event_clearance_date < \""
    + today + "\"";
  getJSON(apiCall, function(error, response) {
    var myjson = response;
    callback(mapIncidents(myjson));
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
  var myNeighborhood = [];

  // Get city-wide incidents by type & avg # incidents per neighborhood & add to array
  var totalIncidentsByType = (getIncidentsByType(resultsByHood));
  myNeighborhood.push(totalIncidentsByType);

  neighborhoods["features"].forEach(function(n) {
    var thisHood = {};
    thisHood["subhood"]       = n["properties"]["name"];
    thisHood["hood"]          = n["properties"]["nhood"];
    thisHood["incidents"]     = resultsByHood.filter(function(o) {
      return (o.localhood || o.neighborhood) == n["properties"]["name"]
    });
    thisHood["sortedIncidents"]= getIncidentsByType(thisHood["incidents"]);
    thisHood["numIncidents"] = thisHood["incidents"].length;

    // Calculate variance in incident types btw neighborhood & city-wide
    thisHood["highestVariance"] = [];
    thisHood["sortedIncidents"].forEach(function(p) {
      for(q=0;q < myNeighborhood[0].length; q++) {
        if(p["name"] == myNeighborhood[0][q]["name"]) {
          p["variance"] = Math.round((p["number"]/ (myNeighborhood[0][q]["number"]))*100)/10;
          p["diffFromAvg"] = Math.round((p["number"] /
          (myNeighborhood[0][q]["number"] / numHoods))*10)/10;
          p["numPerHood"] = Math.round((myNeighborhood[0][q]["number"] / numHoods)*10)/10;
        }
      }
      thisHood["highestVariance"].push(p);
    });
    thisHood["highestVariance"].sort(function(a,b) {
      return b["variance"] - a["variance"];
    });
    thisHood["percentage"]   = Math.round((thisHood["numIncidents"] / resultsByHood.length)*1000)/10;
    thisHood["diffFromAvg"]  = Math.round((thisHood["numIncidents"] / (resultsByHood.length / numHoods))*10)/10;
    myNeighborhood.push(thisHood);
  });
  
  // Convert to JSON
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
    IncidentsByType.push({"name" : item, "number" : counts[item], "avgPerHood" : (counts[item]/numHoods)})
    IncidentsByType.sort(
      function(a, b) {
        return a["number"] - b["number"]
      }
    )
  }
  IncidentsByType.reverse();
  return IncidentsByType;
}

// Save the results to JSON file on server
function saveData(json) {
  fs.writeFile("./jsonData/currentData.json", json, function(err) {
    if(err) {
      return console.log(err);
    }
    console.log("The file was saved!");
  });
}

// Initiate data gathering & storage - THIS SHOULD BE RECURRING DAILY
// getIncidentData(saveData);

// Retrieve neighborhood data from JSON file based on user address
function retrieveHoodData(userHood, userSubHood) {
  var currentHoodData = JSON.parse(fs.readFileSync('./jsonData/currentData.json', 'utf8'));
  var result = {};
  result.hood = [];
  currentHoodData.forEach(function (o) {
    if (o.subhood == userSubHood) {
      result["subhood"] = o;
    }
    if (o.hood == userHood) {
      result.hood.push(o);
    }
  });
  return result;
}

var options = {
  provider: 'google'
};

var geocoder = NodeGeocoder(options);

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

app.post("/address", function(req, res) {
    geocoder.geocode(req.body.address, function(err, result) {
      var userHood    = pip.pointInLayer([result[0]["longitude"],result[0]["latitude"]], gjLayer, [true])[0]["feature"]["properties"]["nhood"];
      var userSubHood = pip.pointInLayer([result[0]["longitude"],result[0]["latitude"]], gjLayer, [true])[0]["feature"]["properties"]["nested"];
      var hoodData    = retrieveHoodData(userHood, userSubHood);
      console.log(hoodData);
      res.render("hood", {
        data : hoodData
      })
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
