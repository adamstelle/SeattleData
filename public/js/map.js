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
