$("#downloadButton").hide();
$("#seeDataButton").hide();
$(".tableContainer").hide();

// Get today's date
var today = new Date().toJSON().slice(0,10);
var numDays;

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

$("#datesubmit").on("click", function() {
  // Base SODA endpoint
  baseURL = "https://data.seattle.gov/resource/grwu-wqtk";

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

  // Build API call
  var apiCall = baseURL
    + ".json?$limit=100000&$where=datetime >= \""
    + inputMin
    + "\" AND datetime < \""
    + inputMax + "\"";
  getSodaData(apiCall);

  // Modify URL parameters

});

function getSodaData(apiCall) {
  $.getJSON(apiCall, function(data) {
    var items = [];
    $("#my-final-table").dynatable({
      dataset: {
        records: data
      }
    });
    var myjson = data;
    countResults(myjson);
    $("#downloadButton").fadeIn();
    $("#seeDataButton").fadeIn();
  });
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
  var firstplace = {},
  secondplace = {},
  thirdplace = {},
  fourthplace = {},
  fifthplace = {};
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
  console.log(totalIncidents);
  firstplace.key = sortable[i-1][0];
  firstplace.value=sortable[i-1][1];
  firstplace.percent=Math.round((sortable[i-1][1]/totalIncidents) * 1000)/10;
  secondplace.key = sortable[i-2][0];
  secondplace.value=sortable[i-2][1];
  secondplace.percent=Math.round((sortable[i-2][1]/totalIncidents) * 1000)/10;
  thirdplace.key = sortable[i-3][0];
  thirdplace.value=sortable[i-3][1];
  thirdplace.percent=Math.round((sortable[i-3][1]/totalIncidents) * 1000)/10;
  fourthplace.key = sortable[i-4][0];
  fourthplace.value=sortable[i-4][1];
  fourthplace.percent=Math.round((sortable[i-4][1]/totalIncidents) * 1000)/10;
  fifthplace.key = sortable[i-5][0];
  fifthplace.value=sortable[i-5][1];
  fifthplace.percent=Math.round((sortable[i-5][1]/totalIncidents) * 1000)/10;

  // Display results on page

  $("#total").append("<h4>In this period, the Seattle Fire Department responded to <span id='totalpercent' class='percent'></span> calls. Below is a breakdown of the most common reasons for fire trucks leaving the station.</h4>");
  $("#totalpercent").append(totalIncidents);

  $("#first").children(".resultTitle").append(firstplace.key);
  $("#first").children(".percent").append(""+firstplace.percent+"<span class='percentSign'>%</span>");
  $("#first").append(""+firstplace.value+"  total incidents.");

  $("#second").children(".resultTitle").append(secondplace.key);
  $("#second").children(".percent").append(""+secondplace.percent+"<span class='percentSign'>%</span>");
  $("#second").append(""+secondplace.value+"  total incidents.");

  $("#third").children(".resultTitle").append(thirdplace.key);
  $("#third").children(".percent").append(""+thirdplace.percent+"<span class='percentSign'>%</span>");
  $("#third").append(""+thirdplace.value+"  total incidents.");

  $("#fourth").children(".resultTitle").append(fourthplace.key);
  $("#fourth").children(".percent").append(""+fourthplace.percent+"<span class='percentSign'>%</span>");
  $("#fourth").append(""+fourthplace.value+"  total incidents.");

  $("#fifth").children(".resultTitle").append(fifthplace.key);
  $("#fifth").children(".percent").append(""+fifthplace.percent+"<span class='percentSign'>%</span>");
  $("#fifth").append(""+fifthplace.value+"  total incidents.");

  // $("#first").append(firstplace.key + firstplace.percent + firstplace.value+" total votes.");
  // $("#second").append(secondplace.key + secondplace.percent + secondplace.value+" total votes.");
  // $("#third").append(thirdplace.key + thirdplace.percent + thirdplace.value+" total votes.");
  // $("#fourth").append(fourthplace.key + fourthplace.percent + fourthplace.value+" total votes.");
  // $("#fifth").append(fifthplace.key + fifthplace.percent + fifthplace.value+" total votes.");
}
