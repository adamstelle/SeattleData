$("#downloadButton").hide();
$("#seeDataButton").hide();
$(".tableContainer").hide();
// Get today's date
var today = new Date().toJSON().slice(0,10);
var numDays;
var urlHash = window.location.hash;
// Base SODA endpoint
var baseURL = "https://data.seattle.gov/resource/grwu-wqtk";
// Check if URL parameters exist; if so trigger query

$("#slider").dateRangeSlider({
  bounds:{
    min: new Date(2011, 01, 01),
    max: new Date(today)
  },
  defaultValues:{
    min: new Date(2015, 00, 01),
    max: new Date(2016, 00, 01)
  }
});

if (urlHash) {
  console.log("hash present");
  getHash();
}

function getHash() {
  var datehash = location.hash.substr(1);
  var inputMin = datehash.match(/start=(.*)%/).pop();
  var inputMax = datehash.match(/end=(.*)/).pop();
  // setSliderDates(inputMin, inputMax);
  $("#slider").dateRangeSlider("values", new Date(inputMin), new Date(inputMax));
  getAPI(inputMin, inputMax);
}


$("#datesubmit").on("click", function getInput() {
// Retrieve selected dates from slider
inputMax = $("#slider").dateRangeSlider("max");
inputMin = $("#slider").dateRangeSlider("min");

// Calculate number of days in range
numDays = Math.round((inputMax - inputMin)/(1000*60*60*24))

// Format min & max into SODA format
inputMax = moment(inputMax)
  .add(1, "days")
  .format("YYYY-MM-DD");

inputMin = moment(inputMin)
.format("YYYY-MM-DD");
getAPI(inputMin, inputMax);
});


function getAPI(inputMin, inputMax) {
  // Build API call
  apiCall = baseURL
    + ".json?$limit=100000&$where=datetime >= \""
    + inputMin
    + "\" AND datetime < \""
    + inputMax + "\"";
  getSodaData(apiCall);
  addMarkers(apiCall);
  changeURL(inputMin, inputMax, baseURL);
}

function getSodaData(apiCall) {
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
    addMarkers(myjson);
    countResults(myjson);
    $("#downloadButton").fadeIn();
    $("#seeDataButton").fadeIn();
  });
}

function changeURL(startDate, endDate, baseURL) {
  window.location.hash = "/fire/dates?start="+startDate+"%end="+endDate+"";
}

$("#seeDataButton").on("click", function() {
  $(".tableContainer").fadeIn();
  $(".tableContainer").slideDown(1200);
});

$("#downloadButton").on("click", function(e) {
  var csvURL = baseURL
    + ".csv?$where=datetime >= \""
    + inputMin
    + "\" AND datetime < \""
    + inputMax + "\"";
  e.preventDefault();
  window.location.href = csvURL;
});

function countResults(myjson) {
  var counts = {};
  var objects = myjson;
  objects.forEach(function (o) {
    if (!counts.hasOwnProperty(o.type)) {
      counts[o.type] = 0;
    }
    counts[o.type] += 1;
  });
  console.log(counts);
  sortResults(counts);
}

function sortResults(counts) {
  var sortable = [];
  var totalResponses = 0;
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

  var testArray = [first = {},second = {},third = {},fourth = {} ,fifth = {}];

  // Display results on page
  $("#total").html("<h4>In this period, the Seattle Fire Department responded to <span id='totalpercent' class='percent'></span> calls. Below is a breakdown of the most common reasons for fire trucks leaving the station.</h4>");
  $("#totalpercent").append(totalIncidents);

  for (k = 0; k <testArray.length; k++) {
    testArray[k].name    = "place"+(k+1)+"",
    testArray[k].key     = sortable[i-(k+1)][0],
    testArray[k].value   = sortable[i-(k+1)][1],
    testArray[k].percent = Math.round((sortable[i-(k+1)][1]/totalIncidents) * 1000)/10;

    $("#"+testArray[k].name+" > .resultTitle").html(testArray[k].key);
    $("#"+testArray[k].name+" > .percent").html(""+testArray[k].percent+"<span class='percentSign'>%</span>");
    $("#"+testArray[k].name+" > .totals").html(""+testArray[k].value+"  total incidents.");
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

function addMarkers(myjson) {
  var myArr = $.map(myjson, function(el) {return el});
  for(i in myArr){
    L.marker(L.latLng(myArr[i]["latitude"],myArr[i]["longitude"])).addTo(mymap);
  }
}

// function geoJSON(inputMin, inputMax) {
//   var geoCall = baseURL
//     + ".geojson?$limit=100000&$where=datetime >= \""
//     + inputMin
//     + "\" AND datetime < \""
//     + inputMax + "\"";
//
//   console.log(geoCall);
//
//   var myGeoJSON
// }
