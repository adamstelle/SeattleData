var exports = module.exports = {};
// Address validation
var _ = require('underscore');
// var addressValidator = require('address-validator');
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
  var address = req.body.address;
  req.trueResult = address;
  req.error = "<span id='errorMsg'>This doesn't appear to be a valid Seattle address. Please try again!</span>";
  next();
}

  // CUSTOM ADDRESS VALIDATION; DISABLED DUE TO POOR ACCURACY;
  // req.error = "<span id='errorMsg'>This doesn't appear to be a valid Seattle address. Please try again!</span>";
  // addressValidator.validate(address, addressValidator.match.streetAddress, function(err, exact, inexact){
  //   console.log('input: ', address.toString());
  //   console.log('match: ', _.map(exact, function(a) {
  //     return a.toString();
  //   }));
  //   console.log('did you mean: ', _.map(inexact, function(a) {
  //     return a.toString();
  //   }));
  //
  //   var exactMatch = ("match: ", _.map(exact, function(a) {
  //     return a.toString();
  //   }));
  //   var inexactMatch = ("did you mean: ", _.map(inexact, function(a) {
  //     return a.toString();
  //   }));
  //   if (exactMatch.length == 1) {
  //     console.log(exactMatch[0]+ " on line 205");
  //     if (exactMatch[0].indexOf("Seattle") == -1) {
  //       for (var i=0; i<inexactMatch.length; i++ ) {
  //         if (inexactMatch[i].indexOf("Seattle") > -1) {
  //           req.trueResult = inexactMatch[i];
  //           var result = true;
  //           break;
  //         }
  //       }
  //       if (result === true) {
  //         next();
  //       } else {
  //         console.log(req.trueResult + " should be false");
  //         next();
  //       }
  //     } else {
  //       req.trueResult = exactMatch[0];
  //       next();
  //     }
  //   }
  //   if (exactMatch.length > 1) {
  //     console.log("Multiple exact matches include: "+ exactMatch + " type: " + typeof(result));
  //     for (var i=0; i<exactMatch.length; i++) {
  //       if (exactMatch[i].indexOf("Seattle") > -1) {
  //         req.trueResult = exactMatch[i];
  //         console.log(req.trueResult + " Appears to be a match");
  //         break;
  //       }
  //       else {
  //         console.log("There are no valid Seattle addresses corresponding to this entry");
  //         // next();
  //       }
  //     }
  //     next();
  //   }
  //   if (exactMatch.length == 0) {
  //     if (inexactMatch.length > 0) {
  //       console.log("at least 1 inexact match");
  //       for (var i=0; i<inexactMatch.length; i++ ) {
  //         if (inexactMatch[i].indexOf("Seattle") > -1) {
  //           req.trueResult = inexactMatch[i];
  //           var result = true;
  //         }
  //       }
  //     } else {
  //       console.log("No matches at all; exact or inexact.");
  //     }
  //     next();
  //   }
  // });

exports.getGeoCode = function(req, res, next) {
  geocoder.geocode(req.trueResult, function(err, result) {
    if(err) {
      console.log("Caught an error mapping the address!");
      req.trueResult = false;
      next();
    } else {
      if (typeof pip.pointInLayer([result[0]["longitude"],result[0]["latitude"]], gjLayer, [true])[0] === "undefined") {
        console.log(pip.pointInLayer([result[0]["longitude"],result[0]["latitude"]], gjLayer, [true])[0]);
        req.trueResult = false;
        next();
      } else {
        var userHood    = pip.pointInLayer([result[0]["longitude"],result[0]["latitude"]], gjLayer, [true])[0]["feature"]["properties"]["nhood"];
        var userSubHood = pip.pointInLayer([result[0]["longitude"],result[0]["latitude"]], gjLayer, [true])[0]["feature"]["properties"]["nested"];
        var hoodData = retrieveHoodData(userHood, userSubHood);
        req.trueResult = hoodData;
        next();
      }
    }
  });
}

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
