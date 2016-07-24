(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function () {
  var gju = this.gju = {};

  // Export the geojson object for **CommonJS**
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = gju;
  }

  // adapted from http://www.kevlindev.com/gui/math/intersection/Intersection.js
  gju.lineStringsIntersect = function (l1, l2) {
    var intersects = [];
    for (var i = 0; i <= l1.coordinates.length - 2; ++i) {
      for (var j = 0; j <= l2.coordinates.length - 2; ++j) {
        var a1 = {
          x: l1.coordinates[i][1],
          y: l1.coordinates[i][0]
        },
          a2 = {
            x: l1.coordinates[i + 1][1],
            y: l1.coordinates[i + 1][0]
          },
          b1 = {
            x: l2.coordinates[j][1],
            y: l2.coordinates[j][0]
          },
          b2 = {
            x: l2.coordinates[j + 1][1],
            y: l2.coordinates[j + 1][0]
          },
          ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x),
          ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x),
          u_b = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);
        if (u_b != 0) {
          var ua = ua_t / u_b,
            ub = ub_t / u_b;
          if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
            intersects.push({
              'type': 'Point',
              'coordinates': [a1.x + ua * (a2.x - a1.x), a1.y + ua * (a2.y - a1.y)]
            });
          }
        }
      }
    }
    if (intersects.length == 0) intersects = false;
    return intersects;
  }

  // Bounding Box

  function boundingBoxAroundPolyCoords (coords) {
    var xAll = [], yAll = []

    for (var i = 0; i < coords[0].length; i++) {
      xAll.push(coords[0][i][1])
      yAll.push(coords[0][i][0])
    }

    xAll = xAll.sort(function (a,b) { return a - b })
    yAll = yAll.sort(function (a,b) { return a - b })

    return [ [xAll[0], yAll[0]], [xAll[xAll.length - 1], yAll[yAll.length - 1]] ]
  }

  gju.pointInBoundingBox = function (point, bounds) {
    return !(point.coordinates[1] < bounds[0][0] || point.coordinates[1] > bounds[1][0] || point.coordinates[0] < bounds[0][1] || point.coordinates[0] > bounds[1][1]) 
  }

  // Point in Polygon
  // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html#Listing the Vertices

  function pnpoly (x,y,coords) {
    var vert = [ [0,0] ]

    for (var i = 0; i < coords.length; i++) {
      for (var j = 0; j < coords[i].length; j++) {
        vert.push(coords[i][j])
      }
	  vert.push(coords[i][0])
      vert.push([0,0])
    }

    var inside = false
    for (var i = 0, j = vert.length - 1; i < vert.length; j = i++) {
      if (((vert[i][0] > y) != (vert[j][0] > y)) && (x < (vert[j][1] - vert[i][1]) * (y - vert[i][0]) / (vert[j][0] - vert[i][0]) + vert[i][1])) inside = !inside
    }

    return inside
  }

  gju.pointInPolygon = function (p, poly) {
    var coords = (poly.type == "Polygon") ? [ poly.coordinates ] : poly.coordinates

    var insideBox = false
    for (var i = 0; i < coords.length; i++) {
      if (gju.pointInBoundingBox(p, boundingBoxAroundPolyCoords(coords[i]))) insideBox = true
    }
    if (!insideBox) return false

    var insidePoly = false
    for (var i = 0; i < coords.length; i++) {
      if (pnpoly(p.coordinates[1], p.coordinates[0], coords[i])) insidePoly = true
    }

    return insidePoly
  }

  // support multi (but not donut) polygons
  gju.pointInMultiPolygon = function (p, poly) {
    var coords_array = (poly.type == "MultiPolygon") ? [ poly.coordinates ] : poly.coordinates

    var insideBox = false
    var insidePoly = false
    for (var i = 0; i < coords_array.length; i++){
      var coords = coords_array[i];
      for (var j = 0; j < coords.length; j++) {
        if (!insideBox){
          if (gju.pointInBoundingBox(p, boundingBoxAroundPolyCoords(coords[j]))) {
            insideBox = true
          }
        }
      }
      if (!insideBox) return false
      for (var j = 0; j < coords.length; j++) {
        if (!insidePoly){
          if (pnpoly(p.coordinates[1], p.coordinates[0], coords[j])) {
            insidePoly = true
          }
        }
      }
    }

    return insidePoly
  }

  gju.numberToRadius = function (number) {
    return number * Math.PI / 180;
  }

  gju.numberToDegree = function (number) {
    return number * 180 / Math.PI;
  }

  // written with help from @tautologe
  gju.drawCircle = function (radiusInMeters, centerPoint, steps) {
    var center = [centerPoint.coordinates[1], centerPoint.coordinates[0]],
      dist = (radiusInMeters / 1000) / 6371,
      // convert meters to radiant
      radCenter = [gju.numberToRadius(center[0]), gju.numberToRadius(center[1])],
      steps = steps || 15,
      // 15 sided circle
      poly = [[center[0], center[1]]];
    for (var i = 0; i < steps; i++) {
      var brng = 2 * Math.PI * i / steps;
      var lat = Math.asin(Math.sin(radCenter[0]) * Math.cos(dist)
              + Math.cos(radCenter[0]) * Math.sin(dist) * Math.cos(brng));
      var lng = radCenter[1] + Math.atan2(Math.sin(brng) * Math.sin(dist) * Math.cos(radCenter[0]),
                                          Math.cos(dist) - Math.sin(radCenter[0]) * Math.sin(lat));
      poly[i] = [];
      poly[i][1] = gju.numberToDegree(lat);
      poly[i][0] = gju.numberToDegree(lng);
    }
    return {
      "type": "Polygon",
      "coordinates": [poly]
    };
  }

  // assumes rectangle starts at lower left point
  gju.rectangleCentroid = function (rectangle) {
    var bbox = rectangle.coordinates[0];
    var xmin = bbox[0][0],
      ymin = bbox[0][1],
      xmax = bbox[2][0],
      ymax = bbox[2][1];
    var xwidth = xmax - xmin;
    var ywidth = ymax - ymin;
    return {
      'type': 'Point',
      'coordinates': [xmin + xwidth / 2, ymin + ywidth / 2]
    };
  }

  // from http://www.movable-type.co.uk/scripts/latlong.html
  gju.pointDistance = function (pt1, pt2) {
    var lon1 = pt1.coordinates[0],
      lat1 = pt1.coordinates[1],
      lon2 = pt2.coordinates[0],
      lat2 = pt2.coordinates[1],
      dLat = gju.numberToRadius(lat2 - lat1),
      dLon = gju.numberToRadius(lon2 - lon1),
      a = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(gju.numberToRadius(lat1))
        * Math.cos(gju.numberToRadius(lat2)) * Math.pow(Math.sin(dLon / 2), 2),
      c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (6371 * c) * 1000; // returns meters
  },

  // checks if geometry lies entirely within a circle
  // works with Point, LineString, Polygon
  gju.geometryWithinRadius = function (geometry, center, radius) {
    if (geometry.type == 'Point') {
      return gju.pointDistance(geometry, center) <= radius;
    } else if (geometry.type == 'LineString' || geometry.type == 'Polygon') {
      var point = {};
      var coordinates;
      if (geometry.type == 'Polygon') {
        // it's enough to check the exterior ring of the Polygon
        coordinates = geometry.coordinates[0];
      } else {
        coordinates = geometry.coordinates;
      }
      for (var i in coordinates) {
        point.coordinates = coordinates[i];
        if (gju.pointDistance(point, center) > radius) {
          return false;
        }
      }
    }
    return true;
  }

  // adapted from http://paulbourke.net/geometry/polyarea/javascript.txt
  gju.area = function (polygon) {
    var area = 0;
    // TODO: polygon holes at coordinates[1]
    var points = polygon.coordinates[0];
    var j = points.length - 1;
    var p1, p2;

    for (var i = 0; i < points.length; j = i++) {
      var p1 = {
        x: points[i][1],
        y: points[i][0]
      };
      var p2 = {
        x: points[j][1],
        y: points[j][0]
      };
      area += p1.x * p2.y;
      area -= p1.y * p2.x;
    }

    area /= 2;
    return area;
  },

  // adapted from http://paulbourke.net/geometry/polyarea/javascript.txt
  gju.centroid = function (polygon) {
    var f, x = 0,
      y = 0;
    // TODO: polygon holes at coordinates[1]
    var points = polygon.coordinates[0];
    var j = points.length - 1;
    var p1, p2;

    for (var i = 0; i < points.length; j = i++) {
      var p1 = {
        x: points[i][1],
        y: points[i][0]
      };
      var p2 = {
        x: points[j][1],
        y: points[j][0]
      };
      f = p1.x * p2.y - p2.x * p1.y;
      x += (p1.x + p2.x) * f;
      y += (p1.y + p2.y) * f;
    }

    f = gju.area(polygon) * 6;
    return {
      'type': 'Point',
      'coordinates': [y / f, x / f]
    };
  },

  gju.simplify = function (source, kink) { /* source[] array of geojson points */
    /* kink	in metres, kinks above this depth kept  */
    /* kink depth is the height of the triangle abc where a-b and b-c are two consecutive line segments */
    kink = kink || 20;
    source = source.map(function (o) {
      return {
        lng: o.coordinates[0],
        lat: o.coordinates[1]
      }
    });

    var n_source, n_stack, n_dest, start, end, i, sig;
    var dev_sqr, max_dev_sqr, band_sqr;
    var x12, y12, d12, x13, y13, d13, x23, y23, d23;
    var F = (Math.PI / 180.0) * 0.5;
    var index = new Array(); /* aray of indexes of source points to include in the reduced line */
    var sig_start = new Array(); /* indices of start & end of working section */
    var sig_end = new Array();

    /* check for simple cases */

    if (source.length < 3) return (source); /* one or two points */

    /* more complex case. initialize stack */

    n_source = source.length;
    band_sqr = kink * 360.0 / (2.0 * Math.PI * 6378137.0); /* Now in degrees */
    band_sqr *= band_sqr;
    n_dest = 0;
    sig_start[0] = 0;
    sig_end[0] = n_source - 1;
    n_stack = 1;

    /* while the stack is not empty  ... */
    while (n_stack > 0) {

      /* ... pop the top-most entries off the stacks */

      start = sig_start[n_stack - 1];
      end = sig_end[n_stack - 1];
      n_stack--;

      if ((end - start) > 1) { /* any intermediate points ? */

        /* ... yes, so find most deviant intermediate point to
        either side of line joining start & end points */

        x12 = (source[end].lng() - source[start].lng());
        y12 = (source[end].lat() - source[start].lat());
        if (Math.abs(x12) > 180.0) x12 = 360.0 - Math.abs(x12);
        x12 *= Math.cos(F * (source[end].lat() + source[start].lat())); /* use avg lat to reduce lng */
        d12 = (x12 * x12) + (y12 * y12);

        for (i = start + 1, sig = start, max_dev_sqr = -1.0; i < end; i++) {

          x13 = source[i].lng() - source[start].lng();
          y13 = source[i].lat() - source[start].lat();
          if (Math.abs(x13) > 180.0) x13 = 360.0 - Math.abs(x13);
          x13 *= Math.cos(F * (source[i].lat() + source[start].lat()));
          d13 = (x13 * x13) + (y13 * y13);

          x23 = source[i].lng() - source[end].lng();
          y23 = source[i].lat() - source[end].lat();
          if (Math.abs(x23) > 180.0) x23 = 360.0 - Math.abs(x23);
          x23 *= Math.cos(F * (source[i].lat() + source[end].lat()));
          d23 = (x23 * x23) + (y23 * y23);

          if (d13 >= (d12 + d23)) dev_sqr = d23;
          else if (d23 >= (d12 + d13)) dev_sqr = d13;
          else dev_sqr = (x13 * y12 - y13 * x12) * (x13 * y12 - y13 * x12) / d12; // solve triangle
          if (dev_sqr > max_dev_sqr) {
            sig = i;
            max_dev_sqr = dev_sqr;
          }
        }

        if (max_dev_sqr < band_sqr) { /* is there a sig. intermediate point ? */
          /* ... no, so transfer current start point */
          index[n_dest] = start;
          n_dest++;
        } else { /* ... yes, so push two sub-sections on stack for further processing */
          n_stack++;
          sig_start[n_stack - 1] = sig;
          sig_end[n_stack - 1] = end;
          n_stack++;
          sig_start[n_stack - 1] = start;
          sig_end[n_stack - 1] = sig;
        }
      } else { /* ... no intermediate points, so transfer current start point */
        index[n_dest] = start;
        n_dest++;
      }
    }

    /* transfer last point */
    index[n_dest] = n_source - 1;
    n_dest++;

    /* make return array */
    var r = new Array();
    for (var i = 0; i < n_dest; i++)
      r.push(source[index[i]]);

    return r.map(function (o) {
      return {
        type: "Point",
        coordinates: [o.lng, o.lat]
      }
    });
  }

  // http://www.movable-type.co.uk/scripts/latlong.html#destPoint
  gju.destinationPoint = function (pt, brng, dist) {
    dist = dist/6371;  // convert dist to angular distance in radians
    brng = gju.numberToRadius(brng);

    var lon1 = gju.numberToRadius(pt.coordinates[0]);
    var lat1 = gju.numberToRadius(pt.coordinates[1]);

    var lat2 = Math.asin( Math.sin(lat1)*Math.cos(dist) +
                          Math.cos(lat1)*Math.sin(dist)*Math.cos(brng) );
    var lon2 = lon1 + Math.atan2(Math.sin(brng)*Math.sin(dist)*Math.cos(lat1),
                                 Math.cos(dist)-Math.sin(lat1)*Math.sin(lat2));
    lon2 = (lon2+3*Math.PI) % (2*Math.PI) - Math.PI;  // normalise to -180..+180º

    return {
      'type': 'Point',
      'coordinates': [gju.numberToDegree(lon2), gju.numberToDegree(lat2)]
    };
  };

})();

},{}],2:[function(require,module,exports){
(function (global){
!function(f){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=f();else if("function"==typeof define&&define.amd)define([],f);else{var g;g="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,g.leafletPip=f()}}(function(){return function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a="function"==typeof require&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}for(var i="function"==typeof require&&require,o=0;o<r.length;o++)s(r[o]);return s}({1:[function(require,module){"use strict";function isPoly(l){return L.MultiPolygon?l instanceof L.MultiPolygon||l instanceof L.Polygon:l.feature&&l.feature.geometry&&l.feature.geometry.type&&-1!==["Polygon","MultiPolygon"].indexOf(l.feature.geometry.type)}var gju=require("geojson-utils"),leafletPip={bassackwards:!1,pointInLayer:function(p,layer,first){p instanceof L.LatLng?p=[p.lng,p.lat]:leafletPip.bassackwards&&(p=p.concat().reverse());var results=[];return layer.eachLayer(function(l){first&&results.length||isPoly(l)&&gju.pointInPolygon({type:"Point",coordinates:p},l.toGeoJSON().geometry)&&results.push(l)}),results}};module.exports=leafletPip},{"geojson-utils":2}],2:[function(require,module){!function(){function boundingBoxAroundPolyCoords(coords){for(var xAll=[],yAll=[],i=0;i<coords[0].length;i++)xAll.push(coords[0][i][1]),yAll.push(coords[0][i][0]);return xAll=xAll.sort(function(a,b){return a-b}),yAll=yAll.sort(function(a,b){return a-b}),[[xAll[0],yAll[0]],[xAll[xAll.length-1],yAll[yAll.length-1]]]}function pnpoly(x,y,coords){for(var vert=[[0,0]],i=0;i<coords.length;i++){for(var j=0;j<coords[i].length;j++)vert.push(coords[i][j]);vert.push(coords[i][0]),vert.push([0,0])}for(var inside=!1,i=0,j=vert.length-1;i<vert.length;j=i++)vert[i][0]>y!=vert[j][0]>y&&x<(vert[j][1]-vert[i][1])*(y-vert[i][0])/(vert[j][0]-vert[i][0])+vert[i][1]&&(inside=!inside);return inside}var gju=this.gju={};"undefined"!=typeof module&&module.exports&&(module.exports=gju),gju.lineStringsIntersect=function(l1,l2){for(var intersects=[],i=0;i<=l1.coordinates.length-2;++i)for(var j=0;j<=l2.coordinates.length-2;++j){var a1={x:l1.coordinates[i][1],y:l1.coordinates[i][0]},a2={x:l1.coordinates[i+1][1],y:l1.coordinates[i+1][0]},b1={x:l2.coordinates[j][1],y:l2.coordinates[j][0]},b2={x:l2.coordinates[j+1][1],y:l2.coordinates[j+1][0]},ua_t=(b2.x-b1.x)*(a1.y-b1.y)-(b2.y-b1.y)*(a1.x-b1.x),ub_t=(a2.x-a1.x)*(a1.y-b1.y)-(a2.y-a1.y)*(a1.x-b1.x),u_b=(b2.y-b1.y)*(a2.x-a1.x)-(b2.x-b1.x)*(a2.y-a1.y);if(0!=u_b){var ua=ua_t/u_b,ub=ub_t/u_b;ua>=0&&1>=ua&&ub>=0&&1>=ub&&intersects.push({type:"Point",coordinates:[a1.x+ua*(a2.x-a1.x),a1.y+ua*(a2.y-a1.y)]})}}return 0==intersects.length&&(intersects=!1),intersects},gju.pointInBoundingBox=function(point,bounds){return!(point.coordinates[1]<bounds[0][0]||point.coordinates[1]>bounds[1][0]||point.coordinates[0]<bounds[0][1]||point.coordinates[0]>bounds[1][1])},gju.pointInPolygon=function(p,poly){for(var coords="Polygon"==poly.type?[poly.coordinates]:poly.coordinates,insideBox=!1,i=0;i<coords.length;i++)gju.pointInBoundingBox(p,boundingBoxAroundPolyCoords(coords[i]))&&(insideBox=!0);if(!insideBox)return!1;for(var insidePoly=!1,i=0;i<coords.length;i++)pnpoly(p.coordinates[1],p.coordinates[0],coords[i])&&(insidePoly=!0);return insidePoly},gju.pointInMultiPolygon=function(p,poly){for(var coords_array="MultiPolygon"==poly.type?[poly.coordinates]:poly.coordinates,insideBox=!1,insidePoly=!1,i=0;i<coords_array.length;i++){for(var coords=coords_array[i],j=0;j<coords.length;j++)insideBox||gju.pointInBoundingBox(p,boundingBoxAroundPolyCoords(coords[j]))&&(insideBox=!0);if(!insideBox)return!1;for(var j=0;j<coords.length;j++)insidePoly||pnpoly(p.coordinates[1],p.coordinates[0],coords[j])&&(insidePoly=!0)}return insidePoly},gju.numberToRadius=function(number){return number*Math.PI/180},gju.numberToDegree=function(number){return 180*number/Math.PI},gju.drawCircle=function(radiusInMeters,centerPoint,steps){for(var center=[centerPoint.coordinates[1],centerPoint.coordinates[0]],dist=radiusInMeters/1e3/6371,radCenter=[gju.numberToRadius(center[0]),gju.numberToRadius(center[1])],steps=steps||15,poly=[[center[0],center[1]]],i=0;steps>i;i++){var brng=2*Math.PI*i/steps,lat=Math.asin(Math.sin(radCenter[0])*Math.cos(dist)+Math.cos(radCenter[0])*Math.sin(dist)*Math.cos(brng)),lng=radCenter[1]+Math.atan2(Math.sin(brng)*Math.sin(dist)*Math.cos(radCenter[0]),Math.cos(dist)-Math.sin(radCenter[0])*Math.sin(lat));poly[i]=[],poly[i][1]=gju.numberToDegree(lat),poly[i][0]=gju.numberToDegree(lng)}return{type:"Polygon",coordinates:[poly]}},gju.rectangleCentroid=function(rectangle){var bbox=rectangle.coordinates[0],xmin=bbox[0][0],ymin=bbox[0][1],xmax=bbox[2][0],ymax=bbox[2][1],xwidth=xmax-xmin,ywidth=ymax-ymin;return{type:"Point",coordinates:[xmin+xwidth/2,ymin+ywidth/2]}},gju.pointDistance=function(pt1,pt2){var lon1=pt1.coordinates[0],lat1=pt1.coordinates[1],lon2=pt2.coordinates[0],lat2=pt2.coordinates[1],dLat=gju.numberToRadius(lat2-lat1),dLon=gju.numberToRadius(lon2-lon1),a=Math.pow(Math.sin(dLat/2),2)+Math.cos(gju.numberToRadius(lat1))*Math.cos(gju.numberToRadius(lat2))*Math.pow(Math.sin(dLon/2),2),c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));return 6371*c*1e3},gju.geometryWithinRadius=function(geometry,center,radius){if("Point"==geometry.type)return gju.pointDistance(geometry,center)<=radius;if("LineString"==geometry.type||"Polygon"==geometry.type){var coordinates,point={};coordinates="Polygon"==geometry.type?geometry.coordinates[0]:geometry.coordinates;for(var i in coordinates)if(point.coordinates=coordinates[i],gju.pointDistance(point,center)>radius)return!1}return!0},gju.area=function(polygon){for(var p1,p2,area=0,points=polygon.coordinates[0],j=points.length-1,i=0;i<points.length;j=i++){var p1={x:points[i][1],y:points[i][0]},p2={x:points[j][1],y:points[j][0]};area+=p1.x*p2.y,area-=p1.y*p2.x}return area/=2},gju.centroid=function(polygon){for(var f,p1,p2,x=0,y=0,points=polygon.coordinates[0],j=points.length-1,i=0;i<points.length;j=i++){var p1={x:points[i][1],y:points[i][0]},p2={x:points[j][1],y:points[j][0]};f=p1.x*p2.y-p2.x*p1.y,x+=(p1.x+p2.x)*f,y+=(p1.y+p2.y)*f}return f=6*gju.area(polygon),{type:"Point",coordinates:[y/f,x/f]}},gju.simplify=function(source,kink){kink=kink||20,source=source.map(function(o){return{lng:o.coordinates[0],lat:o.coordinates[1]}});var n_source,n_stack,n_dest,start,end,i,sig,dev_sqr,max_dev_sqr,band_sqr,x12,y12,d12,x13,y13,d13,x23,y23,d23,F=Math.PI/180*.5,index=new Array,sig_start=new Array,sig_end=new Array;if(source.length<3)return source;for(n_source=source.length,band_sqr=360*kink/(2*Math.PI*6378137),band_sqr*=band_sqr,n_dest=0,sig_start[0]=0,sig_end[0]=n_source-1,n_stack=1;n_stack>0;)if(start=sig_start[n_stack-1],end=sig_end[n_stack-1],n_stack--,end-start>1){for(x12=source[end].lng()-source[start].lng(),y12=source[end].lat()-source[start].lat(),Math.abs(x12)>180&&(x12=360-Math.abs(x12)),x12*=Math.cos(F*(source[end].lat()+source[start].lat())),d12=x12*x12+y12*y12,i=start+1,sig=start,max_dev_sqr=-1;end>i;i++)x13=source[i].lng()-source[start].lng(),y13=source[i].lat()-source[start].lat(),Math.abs(x13)>180&&(x13=360-Math.abs(x13)),x13*=Math.cos(F*(source[i].lat()+source[start].lat())),d13=x13*x13+y13*y13,x23=source[i].lng()-source[end].lng(),y23=source[i].lat()-source[end].lat(),Math.abs(x23)>180&&(x23=360-Math.abs(x23)),x23*=Math.cos(F*(source[i].lat()+source[end].lat())),d23=x23*x23+y23*y23,dev_sqr=d13>=d12+d23?d23:d23>=d12+d13?d13:(x13*y12-y13*x12)*(x13*y12-y13*x12)/d12,dev_sqr>max_dev_sqr&&(sig=i,max_dev_sqr=dev_sqr);band_sqr>max_dev_sqr?(index[n_dest]=start,n_dest++):(n_stack++,sig_start[n_stack-1]=sig,sig_end[n_stack-1]=end,n_stack++,sig_start[n_stack-1]=start,sig_end[n_stack-1]=sig)}else index[n_dest]=start,n_dest++;index[n_dest]=n_source-1,n_dest++;for(var r=new Array,i=0;n_dest>i;i++)r.push(source[index[i]]);return r.map(function(o){return{type:"Point",coordinates:[o.lng,o.lat]}})},gju.destinationPoint=function(pt,brng,dist){dist/=6371,brng=gju.numberToRadius(brng);var lon1=gju.numberToRadius(pt.coordinates[0]),lat1=gju.numberToRadius(pt.coordinates[1]),lat2=Math.asin(Math.sin(lat1)*Math.cos(dist)+Math.cos(lat1)*Math.sin(dist)*Math.cos(brng)),lon2=lon1+Math.atan2(Math.sin(brng)*Math.sin(dist)*Math.cos(lat1),Math.cos(dist)-Math.sin(lat1)*Math.sin(lat2));return lon2=(lon2+3*Math.PI)%(2*Math.PI)-Math.PI,{type:"Point",coordinates:[gju.numberToDegree(lon2),gju.numberToDegree(lat2)]}}}()},{}]},{},[1])(1)});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"geojson-utils":1}],3:[function(require,module,exports){
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
var pip = require("./leaflet.js");
var geojson = require("geojson-utils");

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
function getdata(callback){
  $.ajax({
      url: './data.json',
      dataType: 'json',
      cache: false
  }).done(function(data){
      //"data" will be JSON. Do what you want with it.
      var jsondata = data;
      callback(jsondata);
  });
}

var serverjson = getdata(print);

function print(i) {
  alert(i);
}

// Retrieve and clean submitted address
$("#addressSubmit").on("click", function getAddress() {
  console.log(codeAddress());
});

// function getHood(userAddress) {
//   serverjson.forEach(function (o) {
//     if (o["name"] == userAddress) {
//       console.log(o["numIncidents"]);
//     }
//   });
// }


// // Convert to latlng
geocoder = new google.maps.Geocoder();
function codeAddress() {
  var address = $("#address").val();
  geocoder.geocode( { 'address' : address }, function( results, status ) {
    if( status == google.maps.GeocoderStatus.OK ) {
      var userCoordinates =  ""+results[0].geometry.location.lng()+", "+results[0].geometry.location.lat()+"";
      console.log(userCoordinates);
    } else {
      alert( 'Geocode was not successful for the following reason: ' + status );
    }
    console.log(userCoordinates);
    pip.pointInLayer([userCoordinates], gjLayer, [true])[0]["feature"]["properties"]["nhood"];
    return userCoordinates;
  });
}



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

},{"./leaflet.js":2,"geojson-utils":1}]},{},[3]);
