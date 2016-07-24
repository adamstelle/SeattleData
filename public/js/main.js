$("#downloadButton").hide();
$("#seeDataButton").hide();
$(".tableContainer").hide();
// Get today's date
var today = new Date().toJSON().slice(0,10);
var numDays;
var urlHash = window.location.hash;
var baseURL;
var currentService;
var type;
var dateHeader;

// Set base SODA endpoint
if ($("main").is("#police")) {
  baseURL         = "https://data.seattle.gov/resource/pu5n-trf4";
  currentService  = "police";
  type            = "event_clearance_subgroup";
  dateHeader      = "event_clearance_date";
} else if ($("main").is("#fire")) {
  baseURL         = "https://data.seattle.gov/resource/grwu-wqtk";
  currentService  = "fire";
  type            = "type";
  dateHeader      = "datetime";
}

$("#slider").dateRangeSlider({
  bounds:{
    min: new Date(2016, 01, 01),
    max: new Date(today)
  },
  defaultValues:{
    min: new Date(2016, 05, 01),
    max: new Date(today)
  }
});

// Check if URL parameters exist; if so trigger query
if (urlHash) {
  if(location.hash.indexOf("dates") > -1) {
    getHash();
  }
}

function getHash() {
  var datehash = location.hash.substr(1);
  var inputMin = datehash.match(/start=(.*)%/).pop();
  var inputMax = datehash.match(/end=(.*)/).pop();
  $("#slider").dateRangeSlider("values", new Date(inputMin), new Date(inputMax));
  getAPI(inputMin, inputMax);
}

$("#datesubmit").on("click", function getInput() {
  // Retrieve selected dates from slider
  inputMax = $("#slider").dateRangeSlider("max");
  inputMin = $("#slider").dateRangeSlider("min");

  // Format min & max into SODA format
  inputMax = moment(inputMax)
    .add(1, "days")
    .format("YYYY-MM-DD");

  inputMin = moment(inputMin)
  .format("YYYY-MM-DD");
  getAPI(inputMin, inputMax);
});

// Build API call
function getAPI(inputMin, inputMax, numDays) {
  apiCall = baseURL
    + ".json?$limit=100000&$where="+dateHeader+" >= \""
    + inputMin
    + "\" AND "+dateHeader+" < \""
    + inputMax + "\"";
  // Modify URL Hash
  window.location.hash = "/dates?start="+inputMin+"%end="+inputMax+"";
  // Calculate number of days in range
  numDays = (new Date(inputMax)-new Date(inputMin))/(1000*60*60*24);
  getSodaData(apiCall, numDays);
}

function getSodaData(apiCall, numDays) {
  $.getJSON(apiCall, function(data) {
    $("#my-final-table").dynatable({
      table: {
        defaultColumnIdStyle: 'trimDash',
      },
      dataset: {
        records: data
      }
    });
    var myjson = data;
    countResults(myjson, numDays);
    $("#downloadButton").fadeIn();
    $("#seeDataButton").fadeIn();
    addMarkers(myjson);
  });
}

$("#seeDataButton").on("click", function() {
  $(".tableContainer").fadeIn();
  $(".tableContainer").slideDown(1200);
});

$("#downloadButton").on("click", function(e) {
  var csvURL = baseURL
    + ".csv?$where="+dateHeader+" >= \""
    + location.hash.substr(1).match(/start=(.*)%/).pop()
    + "\" AND "+dateHeader+" < \""
    + location.hash.substr(1).match(/end=(.*)/).pop() + "\"";
  e.preventDefault();
  window.location.href = csvURL;
});

function countResults(myjson, numDays) {
  var counts = {};
  var objects = myjson;
  if (currentService == "fire") {
    objects.forEach(function (o) {
      if (!counts.hasOwnProperty(o.type)) {
        counts[o.type] = 0;
      }
      counts[o.type] += 1;
    });
  } else {
    objects.forEach(function (o) {
      if (!counts.hasOwnProperty(o.event_clearance_subgroup)) {
        counts[o.event_clearance_subgroup] = 0;
      }
      counts[o.event_clearance_subgroup] += 1;
    });
  }
  sortResults(counts, numDays);
}

function sortResults(counts, numDays) {
  var sortable = [];
  for (var item in counts)
    sortable.push([item, counts[item]])
    sortable.sort(
      function(a, b) {
        return a[1] - b[1]
      }
    )

  var i = sortable.length;
  var totalIncidents = 0;
  // Total # of Incidents
  for (j = 0; j < i; j++) {
    totalIncidents += sortable[j][1];
  }
  var domArray = [first = {},second = {},third = {},fourth = {} ,fifth = {}];

  // Display results on page
  $("#total").html("<h4>In the last <span class='boldblue percent'>"+numDays+"</span> days, the Seattle "+currentService+" Department responded to <span id='totalpercent' class='boldblue percent'></span> calls. Below is a breakdown of the most common reasons for fire trucks leaving the station.</h4>");
  $("#totalpercent").append(totalIncidents);

  for (k = 0; k <domArray.length; k++) {
    domArray[k].name    = "place"+(k+1)+"",
    domArray[k].key     = sortable[i-(k+1)][0],
    domArray[k].value   = sortable[i-(k+1)][1],
    domArray[k].percent = Math.round((sortable[i-(k+1)][1]/totalIncidents) * 1000)/10;
    $("#"+domArray[k].name+" > .resultTitle").html(domArray[k].key);
    $("#"+domArray[k].name+" > .percent").html(""+domArray[k].percent+"<span class='percentSign'>%</span>");
    $("#"+domArray[k].name+" > .totals").html(""+domArray[k].value+"  total incidents.");
  }
}

var mymap = L.map("map", {
  center: [47.6062, -122.3321],
  zoom: 12,
  scrollWheelZoom: false
});

// Load map
L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYWRhbXN0ZWxsZSIsImEiOiJjaXE1Y2JyYWkwMDU0ZmxtNnpxYmxnaDlwIn0.4Uq9e1A2t0jjoQQ_oyF_fQ', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox://styles/mapbox/light-v9',
}).addTo(mymap);

// Add 300 most recent incidents to map
function addMarkers(myjson) {
  var myArr = $.map(myjson, function(el) {return el});
  for(i=myArr.length-1; i>myArr.length-300; i--) {
      L.marker(L.latLng(myArr[i]["latitude"],myArr[i]["longitude"])).addTo(mymap);
  }
}

// Realtime address auto-completion

// Address validation / verification

// Get daily updated json from server
function getdata(){
  $.ajax({
      url: './data.json',
      dataType: 'json',
      async: false,
      cache: false
  }).done(function(data){
      //"data" will be JSON. Do what you want with it.
      jsondata = data;
      return jsondata;
  });
  return jsondata;
}

var serverjson = getdata();
console.log(serverjson);

// Retrieve and clean submitted address
$("#addressSubmit").on("click", function getAddress() {
  codeAddress();
});

// function getHood(userAddress) {
//   serverjson.forEach(function (o) {
//     if (o["name"] == userAddress) {
//       console.log(o["numIncidents"]);
//     }
//   });
// }

geocoder = new google.maps.Geocoder();

function codeAddress() {
    var address = $("#address").val();
    geocoder.geocode( { 'address' : address }, function( results, status ) {
        if( status == google.maps.GeocoderStatus.OK ) {
            map.setCenter( results[0].geometry.location );
            var marker = new google.maps.Marker( {
                map     : map,
                position: results[0].geometry.location
            } );
            return location.LatLng;
        } else {
            alert( 'Geocode was not successful for the following reason: ' + status );
        }
    } );
}

// // Convert to latlng
// function getResults(userAddress) {
//   var coordinates      = getCoordinates(userAddress);
//   var userNeigh        = getNeighborhoods(coordinates);
//   var neighborhoodData = getNeighJSON(userNeigh);
//   showNeighborhoodResults(userNeigh);
// }
//
// // Get Coordinates from address (nested function)
// function getCoordinates(userAddress) {
//   // coordinates = ...
//   return coordinates;
// }
//
// // Define neighborhood (nested function)
// function getNeighborhoods(coordinates) {
//   // userNeigh = ...
//   return userNeigh;
// }
//
// function getNeighJSON(userNeigh) {
//   // Retrieve JSON data from server specific to neighborhood
//   $.getJSON(...)
// }
//
// function showNeighborhoodResults(userNeigh) {
//   // Display key data from JSON (last 20 crimes; prevalence of overall crime & specific types vs city avg);
//   // Display Leaflet map w/last X# crimes, centered on latlng
// }
