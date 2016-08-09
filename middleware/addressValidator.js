var exports = module.exports = {};
// Address validation
var _ = require('underscore');
var addressValidator = require('address-validator');
var validated = {};
var async   = require("async");
var pip     = require("./../public/js/leaflet.js");
var fs      = require("fs");

// Geocoding
var NodeGeocoder = require('node-geocoder');
var options = {
  provider: 'google'
};

// Load neighborhoods & Calc total
var neighborhoods = JSON.parse(fs.readFileSync('./jsonData/neighborhoods.geojson', 'utf8'));
var gjLayer = L.geoJson(neighborhoods);
var numHoods= neighborhoods["features"].length;

var geocoder = NodeGeocoder(options);

exports.parseInput = function(req, res, next) {
  async.waterfall([
    function validateAddress(callback) {
      var address = req.body.address;
      addressValidator.validate(address, addressValidator.match.streetAddress, function(err, exact, inexact){
        var exactMatch = ("match: ", _.map(exact, function(a) {
          return a.toString();
        }));
        var inexactMatch = ("did you mean: ", _.map(inexact, function(a) {
          return a.toString();
        }));
        validated["exact"] = exactMatch;
        validated["inexact"] = inexactMatch;
        if (validated["exact"].length == 1) {
          console.log(validated+ "on line 205");
          callback(null, validated["exact"][0]);
        }
        if (validated["exact"].length > 1) {
          console.log(validated+ "on line 209");
          callback(null, validated["exact"][0]);
        }
        if (validated["exact"].length == 0) {
          console.log(validated+ "on line 213");
          callback(null, validated["exact"][0]);
        }
      });
    },
    function getGeoCode(validated, callback) {
      console.log(validated+" on line 216");
      geocoder.geocode(validated, function(err, result) {
        var userHood    = pip.pointInLayer([result[0]["longitude"],result[0]["latitude"]], gjLayer, [true])[0]["feature"]["properties"]["nhood"];
        var userSubHood = pip.pointInLayer([result[0]["longitude"],result[0]["latitude"]], gjLayer, [true])[0]["feature"]["properties"]["nested"];
        var hoodData = retrieveHoodData(userHood, userSubHood);
        callback(null, hoodData);
      });
    }
  ],
  function(err, result) {
    console.log("result at 226 is "+result)
    req.trueResult = result;
    next();
  })
};

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
