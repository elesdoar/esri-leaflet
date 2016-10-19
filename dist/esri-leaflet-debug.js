/* esri-leaflet - v2.0.4 - Wed Oct 19 2016 17:57:24 GMT-0500 (COT)
 * Copyright (c) 2016 Environmental Systems Research Institute, Inc.
 * Apache-2.0 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('leaflet')) :
	typeof define === 'function' && define.amd ? define(['exports', 'leaflet'], factory) :
	(factory((global.L = global.L || {}, global.L.esri = global.L.esri || {}),global.L));
}(this, function (exports,L) { 'use strict';

	L = 'default' in L ? L['default'] : L;

	var version = "2.0.4";

	var cors = ((window.XMLHttpRequest && 'withCredentials' in new window.XMLHttpRequest()));
	var pointerEvents = document.documentElement.style.pointerEvents === '';

	var Support = {
	  cors: cors,
	  pointerEvents: pointerEvents
	};

	var options = {
	  attributionWidthOffset: 55
	};

	var callbacks = 0;

	function serialize (params) {
	  var data = '';

	  params.f = params.f || 'json';

	  for (var key in params) {
	    if (params.hasOwnProperty(key)) {
	      var param = params[key];
	      var type = Object.prototype.toString.call(param);
	      var value;

	      if (data.length) {
	        data += '&';
	      }

	      if (type === '[object Array]') {
	        value = (Object.prototype.toString.call(param[0]) === '[object Object]') ? JSON.stringify(param) : param.join(',');
	      } else if (type === '[object Object]') {
	        value = JSON.stringify(param);
	      } else if (type === '[object Date]') {
	        value = param.valueOf();
	      } else {
	        value = param;
	      }

	      data += encodeURIComponent(key) + '=' + encodeURIComponent(value);
	    }
	  }

	  return data;
	}

	function createRequest (callback, context) {
	  var httpRequest = new window.XMLHttpRequest();

	  httpRequest.onerror = function (e) {
	    httpRequest.onreadystatechange = L.Util.falseFn;

	    callback.call(context, {
	      error: {
	        code: 500,
	        message: 'XMLHttpRequest error'
	      }
	    }, null);
	  };

	  httpRequest.onreadystatechange = function () {
	    var response;
	    var error;

	    if (httpRequest.readyState === 4) {
	      try {
	        response = JSON.parse(httpRequest.responseText);
	      } catch (e) {
	        response = null;
	        error = {
	          code: 500,
	          message: 'Could not parse response as JSON. This could also be caused by a CORS or XMLHttpRequest error.'
	        };
	      }

	      if (!error && response.error) {
	        error = response.error;
	        response = null;
	      }

	      httpRequest.onerror = L.Util.falseFn;

	      callback.call(context, error, response);
	    }
	  };

	  httpRequest.ontimeout = function () {
	    this.onerror();
	  };

	  return httpRequest;
	}

	function xmlHttpPost (url, params, callback, context) {
	  var httpRequest = createRequest(callback, context);
	  httpRequest.open('POST', url);

	  if (typeof context !== 'undefined' && context !== null) {
	    if (typeof context.options !== 'undefined') {
	      httpRequest.timeout = context.options.timeout;
	    }
	  }
	  httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	  httpRequest.send(serialize(params));

	  return httpRequest;
	}

	function xmlHttpGet (url, params, callback, context) {
	  var httpRequest = createRequest(callback, context);
	  httpRequest.open('GET', url + '?' + serialize(params), true);

	  if (typeof context !== 'undefined' && context !== null) {
	    if (typeof context.options !== 'undefined') {
	      httpRequest.timeout = context.options.timeout;
	    }
	  }
	  httpRequest.send(null);

	  return httpRequest;
	}

	// AJAX handlers for CORS (modern browsers) or JSONP (older browsers)
	function request (url, params, callback, context) {
	  var paramString = serialize(params);
	  var httpRequest = createRequest(callback, context);
	  var requestLength = (url + '?' + paramString).length;

	  // get around ie10/11 bug which requires that the request be opened before a timeout is applied
	  if (requestLength <= 2000 && Support.cors) {
	    httpRequest.open('GET', url + '?' + paramString);
	  } else if (requestLength > 2000 && Support.cors) {
	    httpRequest.open('POST', url);
	    httpRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	  }

	  if (typeof context !== 'undefined' && context !== null) {
	    if (typeof context.options !== 'undefined') {
	      httpRequest.timeout = context.options.timeout;
	    }
	  }

	  // request is less then 2000 characters and the browser supports CORS, make GET request with XMLHttpRequest
	  if (requestLength <= 2000 && Support.cors) {
	    httpRequest.send(null);

	  // request is less more then 2000 characters and the browser supports CORS, make POST request with XMLHttpRequest
	  } else if (requestLength > 2000 && Support.cors) {
	    httpRequest.send(paramString);

	  // request is less more then 2000 characters and the browser does not support CORS, make a JSONP request
	  } else if (requestLength <= 2000 && !Support.cors) {
	    return jsonp(url, params, callback, context);

	  // request is longer then 2000 characters and the browser does not support CORS, log a warning
	  } else {
	    warn('a request to ' + url + ' was longer then 2000 characters and this browser cannot make a cross-domain post request. Please use a proxy http://esri.github.io/esri-leaflet/api-reference/request.html');
	    return;
	  }

	  return httpRequest;
	}

	function jsonp (url, params, callback, context) {
	  window._EsriLeafletCallbacks = window._EsriLeafletCallbacks || {};
	  var callbackId = 'c' + callbacks;
	  params.callback = 'window._EsriLeafletCallbacks.' + callbackId;

	  window._EsriLeafletCallbacks[callbackId] = function (response) {
	    if (window._EsriLeafletCallbacks[callbackId] !== true) {
	      var error;
	      var responseType = Object.prototype.toString.call(response);

	      if (!(responseType === '[object Object]' || responseType === '[object Array]')) {
	        error = {
	          error: {
	            code: 500,
	            message: 'Expected array or object as JSONP response'
	          }
	        };
	        response = null;
	      }

	      if (!error && response.error) {
	        error = response;
	        response = null;
	      }

	      callback.call(context, error, response);
	      window._EsriLeafletCallbacks[callbackId] = true;
	    }
	  };

	  var script = L.DomUtil.create('script', null, document.body);
	  script.type = 'text/javascript';
	  script.src = url + '?' + serialize(params);
	  script.id = callbackId;

	  callbacks++;

	  return {
	    id: callbackId,
	    url: script.src,
	    abort: function () {
	      window._EsriLeafletCallbacks._callback[callbackId]({
	        code: 0,
	        message: 'Request aborted.'
	      });
	    }
	  };
	}

	var get = ((Support.cors) ? xmlHttpGet : jsonp);
	get.CORS = xmlHttpGet;
	get.JSONP = jsonp;

	// export the Request object to call the different handlers for debugging
	var Request = {
	  request: request,
	  get: get,
	  post: xmlHttpPost
	};

	/*
	 * Copyright 2015 Esri
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the Liscense.
	 */

	// checks if 2 x,y points are equal
	function pointsEqual (a, b) {
	  for (var i = 0; i < a.length; i++) {
	    if (a[i] !== b[i]) {
	      return false;
	    }
	  }
	  return true;
	}

	// checks if the first and last points of a ring are equal and closes the ring
	function closeRing (coordinates) {
	  if (!pointsEqual(coordinates[0], coordinates[coordinates.length - 1])) {
	    coordinates.push(coordinates[0]);
	  }
	  return coordinates;
	}

	// determine if polygon ring coordinates are clockwise. clockwise signifies outer ring, counter-clockwise an inner ring
	// or hole. this logic was found at http://stackoverflow.com/questions/1165647/how-to-determine-if-a-list-of-polygon-
	// points-are-in-clockwise-order
	function ringIsClockwise (ringToTest) {
	  var total = 0;
	  var i = 0;
	  var rLength = ringToTest.length;
	  var pt1 = ringToTest[i];
	  var pt2;
	  for (i; i < rLength - 1; i++) {
	    pt2 = ringToTest[i + 1];
	    total += (pt2[0] - pt1[0]) * (pt2[1] + pt1[1]);
	    pt1 = pt2;
	  }
	  return (total >= 0);
	}

	// ported from terraformer.js https://github.com/Esri/Terraformer/blob/master/terraformer.js#L504-L519
	function vertexIntersectsVertex (a1, a2, b1, b2) {
	  var uaT = (b2[0] - b1[0]) * (a1[1] - b1[1]) - (b2[1] - b1[1]) * (a1[0] - b1[0]);
	  var ubT = (a2[0] - a1[0]) * (a1[1] - b1[1]) - (a2[1] - a1[1]) * (a1[0] - b1[0]);
	  var uB = (b2[1] - b1[1]) * (a2[0] - a1[0]) - (b2[0] - b1[0]) * (a2[1] - a1[1]);

	  if (uB !== 0) {
	    var ua = uaT / uB;
	    var ub = ubT / uB;

	    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
	      return true;
	    }
	  }

	  return false;
	}

	// ported from terraformer.js https://github.com/Esri/Terraformer/blob/master/terraformer.js#L521-L531
	function arrayIntersectsArray (a, b) {
	  for (var i = 0; i < a.length - 1; i++) {
	    for (var j = 0; j < b.length - 1; j++) {
	      if (vertexIntersectsVertex(a[i], a[i + 1], b[j], b[j + 1])) {
	        return true;
	      }
	    }
	  }

	  return false;
	}

	// ported from terraformer.js https://github.com/Esri/Terraformer/blob/master/terraformer.js#L470-L480
	function coordinatesContainPoint (coordinates, point) {
	  var contains = false;
	  for (var i = -1, l = coordinates.length, j = l - 1; ++i < l; j = i) {
	    if (((coordinates[i][1] <= point[1] && point[1] < coordinates[j][1]) ||
	         (coordinates[j][1] <= point[1] && point[1] < coordinates[i][1])) &&
	        (point[0] < (coordinates[j][0] - coordinates[i][0]) * (point[1] - coordinates[i][1]) / (coordinates[j][1] - coordinates[i][1]) + coordinates[i][0])) {
	      contains = !contains;
	    }
	  }
	  return contains;
	}

	// ported from terraformer-arcgis-parser.js https://github.com/Esri/terraformer-arcgis-parser/blob/master/terraformer-arcgis-parser.js#L106-L113
	function coordinatesContainCoordinates (outer, inner) {
	  var intersects = arrayIntersectsArray(outer, inner);
	  var contains = coordinatesContainPoint(outer, inner[0]);
	  if (!intersects && contains) {
	    return true;
	  }
	  return false;
	}

	// do any polygons in this array contain any other polygons in this array?
	// used for checking for holes in arcgis rings
	// ported from terraformer-arcgis-parser.js https://github.com/Esri/terraformer-arcgis-parser/blob/master/terraformer-arcgis-parser.js#L117-L172
	function convertRingsToGeoJSON (rings) {
	  var outerRings = [];
	  var holes = [];
	  var x; // iterator
	  var outerRing; // current outer ring being evaluated
	  var hole; // current hole being evaluated

	  // for each ring
	  for (var r = 0; r < rings.length; r++) {
	    var ring = closeRing(rings[r].slice(0));
	    if (ring.length < 4) {
	      continue;
	    }
	    // is this ring an outer ring? is it clockwise?
	    if (ringIsClockwise(ring)) {
	      var polygon = [ ring ];
	      outerRings.push(polygon); // push to outer rings
	    } else {
	      holes.push(ring); // counterclockwise push to holes
	    }
	  }

	  var uncontainedHoles = [];

	  // while there are holes left...
	  while (holes.length) {
	    // pop a hole off out stack
	    hole = holes.pop();

	    // loop over all outer rings and see if they contain our hole.
	    var contained = false;
	    for (x = outerRings.length - 1; x >= 0; x--) {
	      outerRing = outerRings[x][0];
	      if (coordinatesContainCoordinates(outerRing, hole)) {
	        // the hole is contained push it into our polygon
	        outerRings[x].push(hole);
	        contained = true;
	        break;
	      }
	    }

	    // ring is not contained in any outer ring
	    // sometimes this happens https://github.com/Esri/esri-leaflet/issues/320
	    if (!contained) {
	      uncontainedHoles.push(hole);
	    }
	  }

	  // if we couldn't match any holes using contains we can try intersects...
	  while (uncontainedHoles.length) {
	    // pop a hole off out stack
	    hole = uncontainedHoles.pop();

	    // loop over all outer rings and see if any intersect our hole.
	    var intersects = false;

	    for (x = outerRings.length - 1; x >= 0; x--) {
	      outerRing = outerRings[x][0];
	      if (arrayIntersectsArray(outerRing, hole)) {
	        // the hole is contained push it into our polygon
	        outerRings[x].push(hole);
	        intersects = true;
	        break;
	      }
	    }

	    if (!intersects) {
	      outerRings.push([hole.reverse()]);
	    }
	  }

	  if (outerRings.length === 1) {
	    return {
	      type: 'Polygon',
	      coordinates: outerRings[0]
	    };
	  } else {
	    return {
	      type: 'MultiPolygon',
	      coordinates: outerRings
	    };
	  }
	}

	// This function ensures that rings are oriented in the right directions
	// outer rings are clockwise, holes are counterclockwise
	// used for converting GeoJSON Polygons to ArcGIS Polygons
	function orientRings (poly) {
	  var output = [];
	  var polygon = poly.slice(0);
	  var outerRing = closeRing(polygon.shift().slice(0));
	  if (outerRing.length >= 4) {
	    if (!ringIsClockwise(outerRing)) {
	      outerRing.reverse();
	    }

	    output.push(outerRing);

	    for (var i = 0; i < polygon.length; i++) {
	      var hole = closeRing(polygon[i].slice(0));
	      if (hole.length >= 4) {
	        if (ringIsClockwise(hole)) {
	          hole.reverse();
	        }
	        output.push(hole);
	      }
	    }
	  }

	  return output;
	}

	// This function flattens holes in multipolygons to one array of polygons
	// used for converting GeoJSON Polygons to ArcGIS Polygons
	function flattenMultiPolygonRings (rings) {
	  var output = [];
	  for (var i = 0; i < rings.length; i++) {
	    var polygon = orientRings(rings[i]);
	    for (var x = polygon.length - 1; x >= 0; x--) {
	      var ring = polygon[x].slice(0);
	      output.push(ring);
	    }
	  }
	  return output;
	}

	// shallow object clone for feature properties and attributes
	// from http://jsperf.com/cloning-an-object/2
	function shallowClone$1 (obj) {
	  var target = {};
	  for (var i in obj) {
	    if (obj.hasOwnProperty(i)) {
	      target[i] = obj[i];
	    }
	  }
	  return target;
	}

	function arcgisToGeoJSON$1 (arcgis, idAttribute) {
	  var geojson = {};

	  if (typeof arcgis.x === 'number' && typeof arcgis.y === 'number') {
	    geojson.type = 'Point';
	    geojson.coordinates = [arcgis.x, arcgis.y];
	  }

	  if (arcgis.points) {
	    geojson.type = 'MultiPoint';
	    geojson.coordinates = arcgis.points.slice(0);
	  }

	  if (arcgis.paths) {
	    if (arcgis.paths.length === 1) {
	      geojson.type = 'LineString';
	      geojson.coordinates = arcgis.paths[0].slice(0);
	    } else {
	      geojson.type = 'MultiLineString';
	      geojson.coordinates = arcgis.paths.slice(0);
	    }
	  }

	  if (arcgis.rings) {
	    geojson = convertRingsToGeoJSON(arcgis.rings.slice(0));
	  }

	  if (arcgis.geometry || arcgis.attributes) {
	    geojson.type = 'Feature';
	    geojson.geometry = (arcgis.geometry) ? arcgisToGeoJSON$1(arcgis.geometry) : null;
	    geojson.properties = (arcgis.attributes) ? shallowClone$1(arcgis.attributes) : null;
	    if (arcgis.attributes) {
	      geojson.id = arcgis.attributes[idAttribute] || arcgis.attributes.OBJECTID || arcgis.attributes.FID;
	    }
	  }

	  return geojson;
	}

	function geojsonToArcGIS$1 (geojson, idAttribute) {
	  idAttribute = idAttribute || 'OBJECTID';
	  var spatialReference = { wkid: 4326 };
	  var result = {};
	  var i;

	  switch (geojson.type) {
	    case 'Point':
	      result.x = geojson.coordinates[0];
	      result.y = geojson.coordinates[1];
	      result.spatialReference = spatialReference;
	      break;
	    case 'MultiPoint':
	      result.points = geojson.coordinates.slice(0);
	      result.spatialReference = spatialReference;
	      break;
	    case 'LineString':
	      result.paths = [geojson.coordinates.slice(0)];
	      result.spatialReference = spatialReference;
	      break;
	    case 'MultiLineString':
	      result.paths = geojson.coordinates.slice(0);
	      result.spatialReference = spatialReference;
	      break;
	    case 'Polygon':
	      result.rings = orientRings(geojson.coordinates.slice(0));
	      result.spatialReference = spatialReference;
	      break;
	    case 'MultiPolygon':
	      result.rings = flattenMultiPolygonRings(geojson.coordinates.slice(0));
	      result.spatialReference = spatialReference;
	      break;
	    case 'Feature':
	      if (geojson.geometry) {
	        result.geometry = geojsonToArcGIS$1(geojson.geometry, idAttribute);
	      }
	      result.attributes = (geojson.properties) ? shallowClone$1(geojson.properties) : {};
	      if (geojson.id) {
	        result.attributes[idAttribute] = geojson.id;
	      }
	      break;
	    case 'FeatureCollection':
	      result = [];
	      for (i = 0; i < geojson.features.length; i++) {
	        result.push(geojsonToArcGIS$1(geojson.features[i], idAttribute));
	      }
	      break;
	    case 'GeometryCollection':
	      result = [];
	      for (i = 0; i < geojson.geometries.length; i++) {
	        result.push(geojsonToArcGIS$1(geojson.geometries[i], idAttribute));
	      }
	      break;
	  }

	  return result;
	}

	function geojsonToArcGIS (geojson, idAttr) {
	  return geojsonToArcGIS$1(geojson, idAttr);
	}

	function arcgisToGeoJSON (arcgis, idAttr) {
	  return arcgisToGeoJSON$1(arcgis, idAttr);
	}

	// shallow object clone for feature properties and attributes
	// from http://jsperf.com/cloning-an-object/2
	function shallowClone (obj) {
	  var target = {};
	  for (var i in obj) {
	    if (obj.hasOwnProperty(i)) {
	      target[i] = obj[i];
	    }
	  }
	  return target;
	}

	// convert an extent (ArcGIS) to LatLngBounds (Leaflet)
	function extentToBounds (extent) {
	  var sw = L.latLng(extent.ymin, extent.xmin);
	  var ne = L.latLng(extent.ymax, extent.xmax);
	  return L.latLngBounds(sw, ne);
	}

	// convert an LatLngBounds (Leaflet) to extent (ArcGIS)
	function boundsToExtent (bounds) {
	  bounds = L.latLngBounds(bounds);
	  return {
	    'xmin': bounds.getSouthWest().lng,
	    'ymin': bounds.getSouthWest().lat,
	    'xmax': bounds.getNorthEast().lng,
	    'ymax': bounds.getNorthEast().lat,
	    'spatialReference': {
	      'wkid': 4326
	    }
	  };
	}

	function responseToFeatureCollection (response, idAttribute) {
	  var objectIdField;
	  var features = response.features || response.results;
	  var count = features.length;

	  if (idAttribute) {
	    objectIdField = idAttribute;
	  } else if (response.objectIdFieldName) {
	    objectIdField = response.objectIdFieldName;
	  } else if (response.fields) {
	    for (var j = 0; j <= response.fields.length - 1; j++) {
	      if (response.fields[j].type === 'esriFieldTypeOID') {
	        objectIdField = response.fields[j].name;
	        break;
	      }
	    }
	  } else if (count) {
	    /* as a last resort, check for common ID fieldnames in the first feature returned
	    not foolproof. identifyFeatures can returned a mixed array of features. */
	    for (var key in features[0].attributes) {
	      if (key.match(/^(OBJECTID|FID|OID|ID)$/i)) {
	        objectIdField = key;
	        break;
	      }
	    }
	  }

	  var featureCollection = {
	    type: 'FeatureCollection',
	    features: []
	  };

	  if (count) {
	    for (var i = features.length - 1; i >= 0; i--) {
	      var feature = arcgisToGeoJSON(features[i], objectIdField);
	      featureCollection.features.push(feature);
	    }
	  }

	  return featureCollection;
	}

	  // trim url whitespace and add a trailing slash if needed
	function cleanUrl (url) {
	  // trim leading and trailing spaces, but not spaces inside the url
	  url = L.Util.trim(url);

	  // add a trailing slash to the url if the user omitted it
	  if (url[url.length - 1] !== '/') {
	    url += '/';
	  }

	  return url;
	}

	function isArcgisOnline (url) {
	  /* hosted feature services can emit geojson natively. */
	  return (/\.arcgis\.com.*?FeatureServer/g).test(url);
	}

	function geojsonTypeToArcGIS (geoJsonType) {
	  var arcgisGeometryType;
	  switch (geoJsonType) {
	    case 'Point':
	      arcgisGeometryType = 'esriGeometryPoint';
	      break;
	    case 'MultiPoint':
	      arcgisGeometryType = 'esriGeometryMultipoint';
	      break;
	    case 'LineString':
	      arcgisGeometryType = 'esriGeometryPolyline';
	      break;
	    case 'MultiLineString':
	      arcgisGeometryType = 'esriGeometryPolyline';
	      break;
	    case 'Polygon':
	      arcgisGeometryType = 'esriGeometryPolygon';
	      break;
	    case 'MultiPolygon':
	      arcgisGeometryType = 'esriGeometryPolygon';
	      break;
	  }

	  return arcgisGeometryType;
	}

	function warn () {
	  if (console && console.warn) {
	    console.warn.apply(console, arguments);
	  }
	}

	function calcAttributionWidth (map) {
	  // either crop at 55px or user defined buffer
	  return (map.getSize().x - options.attributionWidthOffset) + 'px';
	}

	function setEsriAttribution (map) {
	  if (map.attributionControl && !map.attributionControl._esriAttributionAdded) {
	    map.attributionControl.setPrefix('<a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a> | Powered by <a href="https://www.esri.com">Esri</a>');

	    var hoverAttributionStyle = document.createElement('style');
	    hoverAttributionStyle.type = 'text/css';
	    hoverAttributionStyle.innerHTML = '.esri-truncated-attribution:hover {' +
	      'white-space: normal;' +
	    '}';

	    document.getElementsByTagName('head')[0].appendChild(hoverAttributionStyle);
	    L.DomUtil.addClass(map.attributionControl._container, 'esri-truncated-attribution:hover');

	    // define a new css class in JS to trim attribution into a single line
	    var attributionStyle = document.createElement('style');
	    attributionStyle.type = 'text/css';
	    attributionStyle.innerHTML = '.esri-truncated-attribution {' +
	      'vertical-align: -3px;' +
	      'white-space: nowrap;' +
	      'overflow: hidden;' +
	      'text-overflow: ellipsis;' +
	      'display: inline-block;' +
	      'transition: 0s white-space;' +
	      'transition-delay: 1s;' +
	      'max-width: ' + calcAttributionWidth(map) + ';' +
	    '}';

	    document.getElementsByTagName('head')[0].appendChild(attributionStyle);
	    L.DomUtil.addClass(map.attributionControl._container, 'esri-truncated-attribution');

	    // update the width used to truncate when the map itself is resized
	    map.on('resize', function (e) {
	      map.attributionControl._container.style.maxWidth = calcAttributionWidth(e.target);
	    });

	    map.attributionControl._esriAttributionAdded = true;
	  }
	}

	function _getAttributionData (url, map) {
	  jsonp(url, {}, L.Util.bind(function (error, attributions) {
	    if (error) { return; }
	    map._esriAttributions = [];
	    for (var c = 0; c < attributions.contributors.length; c++) {
	      var contributor = attributions.contributors[c];

	      for (var i = 0; i < contributor.coverageAreas.length; i++) {
	        var coverageArea = contributor.coverageAreas[i];
	        var southWest = L.latLng(coverageArea.bbox[0], coverageArea.bbox[1]);
	        var northEast = L.latLng(coverageArea.bbox[2], coverageArea.bbox[3]);
	        map._esriAttributions.push({
	          attribution: contributor.attribution,
	          score: coverageArea.score,
	          bounds: L.latLngBounds(southWest, northEast),
	          minZoom: coverageArea.zoomMin,
	          maxZoom: coverageArea.zoomMax
	        });
	      }
	    }

	    map._esriAttributions.sort(function (a, b) {
	      return b.score - a.score;
	    });

	    // pass the same argument as the map's 'moveend' event
	    var obj = { target: map };
	    _updateMapAttribution(obj);
	  }, this));
	}

	function _updateMapAttribution (evt) {
	  var map = evt.target;
	  var oldAttributions = map._esriAttributions;

	  if (map && map.attributionControl && oldAttributions) {
	    var newAttributions = '';
	    var bounds = map.getBounds();
	    var wrappedBounds = L.latLngBounds(
	      bounds.getSouthWest().wrap(),
	      bounds.getNorthEast().wrap()
	    );
	    var zoom = map.getZoom();

	    for (var i = 0; i < oldAttributions.length; i++) {
	      var attribution = oldAttributions[i];
	      var text = attribution.attribution;

	      if (!newAttributions.match(text) && attribution.bounds.intersects(wrappedBounds) && zoom >= attribution.minZoom && zoom <= attribution.maxZoom) {
	        newAttributions += (', ' + text);
	      }
	    }

	    newAttributions = newAttributions.substr(2);
	    var attributionElement = map.attributionControl._container.querySelector('.esri-dynamic-attribution');

	    attributionElement.innerHTML = newAttributions;
	    attributionElement.style.maxWidth = calcAttributionWidth(map);

	    map.fire('attributionupdated', {
	      attribution: newAttributions
	    });
	  }
	}

	var Util = {
	  shallowClone: shallowClone,
	  warn: warn,
	  cleanUrl: cleanUrl,
	  isArcgisOnline: isArcgisOnline,
	  geojsonTypeToArcGIS: geojsonTypeToArcGIS,
	  responseToFeatureCollection: responseToFeatureCollection,
	  geojsonToArcGIS: geojsonToArcGIS,
	  arcgisToGeoJSON: arcgisToGeoJSON,
	  boundsToExtent: boundsToExtent,
	  extentToBounds: extentToBounds,
	  calcAttributionWidth: calcAttributionWidth,
	  setEsriAttribution: setEsriAttribution,
	  _getAttributionData: _getAttributionData,
	  _updateMapAttribution: _updateMapAttribution
	};

	var Task = L.Class.extend({

	  options: {
	    proxy: false,
	    useCors: cors
	  },

	  // Generate a method for each methodName:paramName in the setters for this task.
	  generateSetter: function (param, context) {
	    return L.Util.bind(function (value) {
	      this.params[param] = value;
	      return this;
	    }, context);
	  },

	  initialize: function (endpoint) {
	    // endpoint can be either a url (and options) for an ArcGIS Rest Service or an instance of EsriLeaflet.Service
	    if (endpoint.request && endpoint.options) {
	      this._service = endpoint;
	      L.Util.setOptions(this, endpoint.options);
	    } else {
	      L.Util.setOptions(this, endpoint);
	      this.options.url = cleanUrl(endpoint.url);
	    }

	    // clone default params into this object
	    this.params = L.Util.extend({}, this.params || {});

	    // generate setter methods based on the setters object implimented a child class
	    if (this.setters) {
	      for (var setter in this.setters) {
	        var param = this.setters[setter];
	        this[setter] = this.generateSetter(param, this);
	      }
	    }
	  },

	  token: function (token) {
	    if (this._service) {
	      this._service.authenticate(token);
	    } else {
	      this.params.token = token;
	    }
	    return this;
	  },

	  request: function (callback, context) {
	    if (this._service) {
	      return this._service.request(this.path, this.params, callback, context);
	    }

	    return this._request('request', this.path, this.params, callback, context);
	  },

	  _request: function (method, path, params, callback, context) {
	    var url = (this.options.proxy) ? this.options.proxy + '?' + this.options.url + path : this.options.url + path;

	    if ((method === 'get' || method === 'request') && !this.options.useCors) {
	      return Request.get.JSONP(url, params, callback, context);
	    }

	    return Request[method](url, params, callback, context);
	  }
	});

	function task (options) {
	  return new Task(options);
	}

	var Query = Task.extend({
	  setters: {
	    'offset': 'resultOffset',
	    'limit': 'resultRecordCount',
	    'fields': 'outFields',
	    'precision': 'geometryPrecision',
	    'featureIds': 'objectIds',
	    'returnGeometry': 'returnGeometry',
	    'token': 'token'
	  },

	  path: 'query',

	  params: {
	    returnGeometry: true,
	    where: '1=1',
	    outSr: 4326,
	    outFields: '*'
	  },

	  within: function (geometry) {
	    this._setGeometry(geometry);
	    this.params.spatialRel = 'esriSpatialRelContains'; // will make code read layer within geometry, to the api this will reads geometry contains layer
	    return this;
	  },

	  intersects: function (geometry) {
	    this._setGeometry(geometry);
	    this.params.spatialRel = 'esriSpatialRelIntersects';
	    return this;
	  },

	  contains: function (geometry) {
	    this._setGeometry(geometry);
	    this.params.spatialRel = 'esriSpatialRelWithin'; // will make code read layer contains geometry, to the api this will reads geometry within layer
	    return this;
	  },

	  crosses: function (geometry) {
	    this._setGeometry(geometry);
	    this.params.spatialRel = 'esriSpatialRelCrosses';
	    return this;
	  },

	  touches: function (geometry) {
	    this._setGeometry(geometry);
	    this.params.spatialRel = 'esriSpatialRelTouches';
	    return this;
	  },

	  overlaps: function (geometry) {
	    this._setGeometry(geometry);
	    this.params.spatialRel = 'esriSpatialRelOverlaps';
	    return this;
	  },

	  // only valid for Feature Services running on ArcGIS Server 10.3 or ArcGIS Online
	  nearby: function (latlng, radius) {
	    latlng = L.latLng(latlng);
	    this.params.geometry = [latlng.lng, latlng.lat];
	    this.params.geometryType = 'esriGeometryPoint';
	    this.params.spatialRel = 'esriSpatialRelIntersects';
	    this.params.units = 'esriSRUnit_Meter';
	    this.params.distance = radius;
	    this.params.inSr = 4326;
	    return this;
	  },

	  where: function (string) {
	    // instead of converting double-quotes to single quotes, pass as is, and provide a more informative message if a 400 is encountered
	    this.params.where = string;
	    return this;
	  },

	  between: function (start, end) {
	    this.params.time = [start.valueOf(), end.valueOf()];
	    return this;
	  },

	  simplify: function (map, factor) {
	    var mapWidth = Math.abs(map.getBounds().getWest() - map.getBounds().getEast());
	    this.params.maxAllowableOffset = (mapWidth / map.getSize().y) * factor;
	    return this;
	  },

	  orderBy: function (fieldName, order) {
	    order = order || 'ASC';
	    this.params.orderByFields = (this.params.orderByFields) ? this.params.orderByFields + ',' : '';
	    this.params.orderByFields += ([fieldName, order]).join(' ');
	    return this;
	  },

	  run: function (callback, context) {
	    this._cleanParams();

	    // services hosted on ArcGIS Online also support requesting geojson directly
	    if (this.options.isModern || Util.isArcgisOnline(this.options.url)) {
	      this.params.f = 'geojson';

	      return this.request(function (error, response) {
	        this._trapSQLerrors(error);
	        callback.call(context, error, response, response);
	      }, this);

	    // otherwise convert it in the callback then pass it on
	    } else {
	      return this.request(function (error, response) {
	        this._trapSQLerrors(error);
	        callback.call(context, error, (response && Util.responseToFeatureCollection(response)), response);
	      }, this);
	    }
	  },

	  count: function (callback, context) {
	    this._cleanParams();
	    this.params.returnCountOnly = true;
	    return this.request(function (error, response) {
	      callback.call(this, error, (response && response.count), response);
	    }, context);
	  },

	  ids: function (callback, context) {
	    this._cleanParams();
	    this.params.returnIdsOnly = true;
	    return this.request(function (error, response) {
	      callback.call(this, error, (response && response.objectIds), response);
	    }, context);
	  },

	  // only valid for Feature Services running on ArcGIS Server 10.3 or ArcGIS Online
	  bounds: function (callback, context) {
	    this._cleanParams();
	    this.params.returnExtentOnly = true;
	    return this.request(function (error, response) {
	      callback.call(context, error, (response && response.extent && Util.extentToBounds(response.extent)), response);
	    }, context);
	  },

	  // only valid for image services
	  pixelSize: function (point) {
	    point = L.point(point);
	    this.params.pixelSize = [point.x, point.y];
	    return this;
	  },

	  // only valid for map services
	  layer: function (layer) {
	    this.path = layer + '/query';
	    return this;
	  },

	  _trapSQLerrors: function (error) {
	    if (error) {
	      if (error.code === '400') {
	        Util.warn('one common syntax error in query requests is encasing string values in double quotes instead of single quotes');
	      }
	    }
	  },

	  _cleanParams: function () {
	    delete this.params.returnIdsOnly;
	    delete this.params.returnExtentOnly;
	    delete this.params.returnCountOnly;
	  },

	  _setGeometry: function (geometry) {
	    this.params.inSr = 4326;

	    // convert bounds to extent and finish
	    if (geometry instanceof L.LatLngBounds) {
	      // set geometry + geometryType
	      this.params.geometry = Util.boundsToExtent(geometry);
	      this.params.geometryType = 'esriGeometryEnvelope';
	      return;
	    }

	    // convert L.Marker > L.LatLng
	    if (geometry.getLatLng) {
	      geometry = geometry.getLatLng();
	    }

	    // convert L.LatLng to a geojson point and continue;
	    if (geometry instanceof L.LatLng) {
	      geometry = {
	        type: 'Point',
	        coordinates: [geometry.lng, geometry.lat]
	      };
	    }

	    // handle L.GeoJSON, pull out the first geometry
	    if (geometry instanceof L.GeoJSON) {
	      // reassign geometry to the GeoJSON value  (we are assuming that only one feature is present)
	      geometry = geometry.getLayers()[0].feature.geometry;
	      this.params.geometry = Util.geojsonToArcGIS(geometry);
	      this.params.geometryType = Util.geojsonTypeToArcGIS(geometry.type);
	    }

	    // Handle L.Polyline and L.Polygon
	    if (geometry.toGeoJSON) {
	      geometry = geometry.toGeoJSON();
	    }

	    // handle GeoJSON feature by pulling out the geometry
	    if (geometry.type === 'Feature') {
	      // get the geometry of the geojson feature
	      geometry = geometry.geometry;
	    }

	    // confirm that our GeoJSON is a point, line or polygon
	    if (geometry.type === 'Point' || geometry.type === 'LineString' || geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
	      this.params.geometry = Util.geojsonToArcGIS(geometry);
	      this.params.geometryType = Util.geojsonTypeToArcGIS(geometry.type);
	      return;
	    }

	    // warn the user if we havn't found an appropriate object
	    Util.warn('invalid geometry passed to spatial query. Should be L.LatLng, L.LatLngBounds, L.Marker or a GeoJSON Point, Line, Polygon or MultiPolygon object');

	    return;
	  }
	});

	function query (options) {
	  return new Query(options);
	}

	var Find = Task.extend({
	  setters: {
	    // method name > param name
	    'contains': 'contains',
	    'text': 'searchText',
	    'fields': 'searchFields', // denote an array or single string
	    'spatialReference': 'sr',
	    'sr': 'sr',
	    'layers': 'layers',
	    'returnGeometry': 'returnGeometry',
	    'maxAllowableOffset': 'maxAllowableOffset',
	    'precision': 'geometryPrecision',
	    'dynamicLayers': 'dynamicLayers',
	    'returnZ': 'returnZ',
	    'returnM': 'returnM',
	    'gdbVersion': 'gdbVersion',
	    'token': 'token'
	  },

	  path: 'find',

	  params: {
	    sr: 4326,
	    contains: true,
	    returnGeometry: true,
	    returnZ: true,
	    returnM: false
	  },

	  layerDefs: function (id, where) {
	    this.params.layerDefs = (this.params.layerDefs) ? this.params.layerDefs + ';' : '';
	    this.params.layerDefs += ([id, where]).join(':');
	    return this;
	  },

	  simplify: function (map, factor) {
	    var mapWidth = Math.abs(map.getBounds().getWest() - map.getBounds().getEast());
	    this.params.maxAllowableOffset = (mapWidth / map.getSize().y) * factor;
	    return this;
	  },

	  run: function (callback, context) {
	    return this.request(function (error, response) {
	      callback.call(context, error, (response && Util.responseToFeatureCollection(response)), response);
	    }, context);
	  }
	});

	function find (options) {
	  return new Find(options);
	}

	var Identify = Task.extend({
	  path: 'identify',

	  between: function (start, end) {
	    this.params.time = [start.valueOf(), end.valueOf()];
	    return this;
	  }
	});

	function identify (options) {
	  return new Identify(options);
	}

	var IdentifyFeatures = Identify.extend({
	  setters: {
	    'layers': 'layers',
	    'precision': 'geometryPrecision',
	    'tolerance': 'tolerance',
	    'returnGeometry': 'returnGeometry'
	  },

	  params: {
	    sr: 4326,
	    layers: 'all',
	    tolerance: 3,
	    returnGeometry: true
	  },

	  on: function (map) {
	    var extent = Util.boundsToExtent(map.getBounds());
	    var size = map.getSize();
	    this.params.imageDisplay = [size.x, size.y, 96];
	    this.params.mapExtent = [extent.xmin, extent.ymin, extent.xmax, extent.ymax];
	    return this;
	  },

	  at: function (latlng) {
	    latlng = L.latLng(latlng);
	    this.params.geometry = [latlng.lng, latlng.lat];
	    this.params.geometryType = 'esriGeometryPoint';
	    return this;
	  },

	  layerDef: function (id, where) {
	    this.params.layerDefs = (this.params.layerDefs) ? this.params.layerDefs + ';' : '';
	    this.params.layerDefs += ([id, where]).join(':');
	    return this;
	  },

	  simplify: function (map, factor) {
	    var mapWidth = Math.abs(map.getBounds().getWest() - map.getBounds().getEast());
	    this.params.maxAllowableOffset = (mapWidth / map.getSize().y) * (1 - factor);
	    return this;
	  },

	  run: function (callback, context) {
	    return this.request(function (error, response) {
	      // immediately invoke with an error
	      if (error) {
	        callback.call(context, error, undefined, response);
	        return;

	      // ok no error lets just assume we have features...
	      } else {
	        var featureCollection = Util.responseToFeatureCollection(response);
	        response.results = response.results.reverse();
	        for (var i = 0; i < featureCollection.features.length; i++) {
	          var feature = featureCollection.features[i];
	          feature.layerId = response.results[i].layerId;
	        }
	        callback.call(context, undefined, featureCollection, response);
	      }
	    });
	  }
	});

	function identifyFeatures (options) {
	  return new IdentifyFeatures(options);
	}

	var IdentifyImage = Identify.extend({
	  setters: {
	    'setMosaicRule': 'mosaicRule',
	    'setRenderingRule': 'renderingRule',
	    'setPixelSize': 'pixelSize',
	    'returnCatalogItems': 'returnCatalogItems',
	    'returnGeometry': 'returnGeometry'
	  },

	  params: {
	    returnGeometry: false
	  },

	  at: function (latlng) {
	    latlng = L.latLng(latlng);
	    this.params.geometry = JSON.stringify({
	      x: latlng.lng,
	      y: latlng.lat,
	      spatialReference: {
	        wkid: 4326
	      }
	    });
	    this.params.geometryType = 'esriGeometryPoint';
	    return this;
	  },

	  getMosaicRule: function () {
	    return this.params.mosaicRule;
	  },

	  getRenderingRule: function () {
	    return this.params.renderingRule;
	  },

	  getPixelSize: function () {
	    return this.params.pixelSize;
	  },

	  run: function (callback, context) {
	    return this.request(function (error, response) {
	      callback.call(context, error, (response && this._responseToGeoJSON(response)), response);
	    }, this);
	  },

	  // get pixel data and return as geoJSON point
	  // populate catalog items (if any)
	  // merging in any catalogItemVisibilities as a propery of each feature
	  _responseToGeoJSON: function (response) {
	    var location = response.location;
	    var catalogItems = response.catalogItems;
	    var catalogItemVisibilities = response.catalogItemVisibilities;
	    var geoJSON = {
	      'pixel': {
	        'type': 'Feature',
	        'geometry': {
	          'type': 'Point',
	          'coordinates': [location.x, location.y]
	        },
	        'crs': {
	          'type': 'EPSG',
	          'properties': {
	            'code': location.spatialReference.wkid
	          }
	        },
	        'properties': {
	          'OBJECTID': response.objectId,
	          'name': response.name,
	          'value': response.value
	        },
	        'id': response.objectId
	      }
	    };

	    if (response.properties && response.properties.Values) {
	      geoJSON.pixel.properties.values = response.properties.Values;
	    }

	    if (catalogItems && catalogItems.features) {
	      geoJSON.catalogItems = Util.responseToFeatureCollection(catalogItems);
	      if (catalogItemVisibilities && catalogItemVisibilities.length === geoJSON.catalogItems.features.length) {
	        for (var i = catalogItemVisibilities.length - 1; i >= 0; i--) {
	          geoJSON.catalogItems.features[i].properties.catalogItemVisibility = catalogItemVisibilities[i];
	        }
	      }
	    }
	    return geoJSON;
	  }

	});

	function identifyImage (params) {
	  return new IdentifyImage(params);
	}

	var Service = L.Evented.extend({

	  options: {
	    proxy: false,
	    useCors: cors,
	    timeout: 0
	  },

	  initialize: function (options) {
	    options = options || {};
	    this._requestQueue = [];
	    this._authenticating = false;
	    L.Util.setOptions(this, options);
	    this.options.url = cleanUrl(this.options.url);
	  },

	  get: function (path, params, callback, context) {
	    return this._request('get', path, params, callback, context);
	  },

	  post: function (path, params, callback, context) {
	    return this._request('post', path, params, callback, context);
	  },

	  request: function (path, params, callback, context) {
	    return this._request('request', path, params, callback, context);
	  },

	  metadata: function (callback, context) {
	    return this._request('get', '', {}, callback, context);
	  },

	  authenticate: function (token) {
	    this._authenticating = false;
	    this.options.token = token;
	    this._runQueue();
	    return this;
	  },

	  getTimeout: function () {
	    return this.options.timeout;
	  },

	  setTimeout: function (timeout) {
	    this.options.timeout = timeout;
	  },

	  _request: function (method, path, params, callback, context) {
	    this.fire('requeststart', {
	      url: this.options.url + path,
	      params: params,
	      method: method
	    }, true);

	    var wrappedCallback = this._createServiceCallback(method, path, params, callback, context);

	    if (this.options.token) {
	      params.token = this.options.token;
	    }

	    if (this._authenticating) {
	      this._requestQueue.push([method, path, params, callback, context]);
	      return;
	    } else {
	      var url = (this.options.proxy) ? this.options.proxy + '?' + this.options.url + path : this.options.url + path;

	      if ((method === 'get' || method === 'request') && !this.options.useCors) {
	        return Request.get.JSONP(url, params, wrappedCallback, context);
	      } else {
	        return Request[method](url, params, wrappedCallback, context);
	      }
	    }
	  },

	  _createServiceCallback: function (method, path, params, callback, context) {
	    return L.Util.bind(function (error, response) {
	      if (error && (error.code === 499 || error.code === 498)) {
	        this._authenticating = true;

	        this._requestQueue.push([method, path, params, callback, context]);

	        // fire an event for users to handle and re-authenticate
	        this.fire('authenticationrequired', {
	          authenticate: L.Util.bind(this.authenticate, this)
	        }, true);

	        // if the user has access to a callback they can handle the auth error
	        error.authenticate = L.Util.bind(this.authenticate, this);
	      }

	      callback.call(context, error, response);

	      if (error) {
	        this.fire('requesterror', {
	          url: this.options.url + path,
	          params: params,
	          message: error.message,
	          code: error.code,
	          method: method
	        }, true);
	      } else {
	        this.fire('requestsuccess', {
	          url: this.options.url + path,
	          params: params,
	          response: response,
	          method: method
	        }, true);
	      }

	      this.fire('requestend', {
	        url: this.options.url + path,
	        params: params,
	        method: method
	      }, true);
	    }, this);
	  },

	  _runQueue: function () {
	    for (var i = this._requestQueue.length - 1; i >= 0; i--) {
	      var request = this._requestQueue[i];
	      var method = request.shift();
	      this[method].apply(this, request);
	    }
	    this._requestQueue = [];
	  }
	});

	function service (options) {
	  return new Service(options);
	}

	var MapService = Service.extend({

	  identify: function () {
	    return identifyFeatures(this);
	  },

	  find: function () {
	    return find(this);
	  },

	  query: function () {
	    return query(this);
	  }

	});

	function mapService (options) {
	  return new MapService(options);
	}

	var ImageService = Service.extend({

	  query: function () {
	    return query(this);
	  },

	  identify: function () {
	    return identifyImage(this);
	  }
	});

	function imageService (options) {
	  return new ImageService(options);
	}

	var FeatureLayerService = Service.extend({

	  options: {
	    idAttribute: 'OBJECTID'
	  },

	  query: function () {
	    return query(this);
	  },

	  addFeature: function (feature, callback, context) {
	    delete feature.id;

	    feature = geojsonToArcGIS(feature);

	    return this.post('addFeatures', {
	      features: [feature]
	    }, function (error, response) {
	      var result = (response && response.addResults) ? response.addResults[0] : undefined;
	      if (callback) {
	        callback.call(context, error || response.addResults[0].error, result);
	      }
	    }, context);
	  },

	  updateFeature: function (feature, callback, context) {
	    feature = geojsonToArcGIS(feature, this.options.idAttribute);

	    return this.post('updateFeatures', {
	      features: [feature]
	    }, function (error, response) {
	      var result = (response && response.updateResults) ? response.updateResults[0] : undefined;
	      if (callback) {
	        callback.call(context, error || response.updateResults[0].error, result);
	      }
	    }, context);
	  },

	  deleteFeature: function (id, callback, context) {
	    return this.post('deleteFeatures', {
	      objectIds: id
	    }, function (error, response) {
	      var result = (response && response.deleteResults) ? response.deleteResults[0] : undefined;
	      if (callback) {
	        callback.call(context, error || response.deleteResults[0].error, result);
	      }
	    }, context);
	  },

	  deleteFeatures: function (ids, callback, context) {
	    return this.post('deleteFeatures', {
	      objectIds: ids
	    }, function (error, response) {
	      // pass back the entire array
	      var result = (response && response.deleteResults) ? response.deleteResults : undefined;
	      if (callback) {
	        callback.call(context, error || response.deleteResults[0].error, result);
	      }
	    }, context);
	  }
	});

	function featureLayerService (options) {
	  return new FeatureLayerService(options);
	}

	var tileProtocol = (window.location.protocol !== 'https:') ? 'http:' : 'https:';

	var BasemapLayer = L.TileLayer.extend({
	  statics: {
	    TILES: {
	      Streets: {
	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
	        options: {
	          minZoom: 1,
	          maxZoom: 19,
	          subdomains: ['server', 'services'],
	          attribution: 'USGS, NOAA',
	          attributionUrl: 'https://static.arcgis.com/attribution/World_Street_Map'
	        }
	      },
	      Topographic: {
	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
	        options: {
	          minZoom: 1,
	          maxZoom: 19,
	          subdomains: ['server', 'services'],
	          attribution: 'USGS, NOAA',
	          attributionUrl: 'https://static.arcgis.com/attribution/World_Topo_Map'
	        }
	      },
	      Oceans: {
	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
	        options: {
	          minZoom: 1,
	          maxZoom: 16,
	          subdomains: ['server', 'services'],
	          attribution: 'USGS, NOAA',
	          attributionUrl: 'https://static.arcgis.com/attribution/Ocean_Basemap'
	        }
	      },
	      OceansLabels: {
	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
	        options: {
	          minZoom: 1,
	          maxZoom: 16,
	          subdomains: ['server', 'services'],
	          pane: (pointerEvents) ? 'esri-labels' : 'tilePane'
	        }
	      },
	      NationalGeographic: {
	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}',
	        options: {
	          minZoom: 1,
	          maxZoom: 16,
	          subdomains: ['server', 'services'],
	          attribution: 'National Geographic, DeLorme, HERE, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, increment P Corp.'
	        }
	      },
	      DarkGray: {
	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
	        options: {
	          minZoom: 1,
	          maxZoom: 16,
	          subdomains: ['server', 'services'],
	          attribution: 'HERE, DeLorme, MapmyIndia, &copy; OpenStreetMap contributors'
	        }
	      },
	      DarkGrayLabels: {
	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
	        options: {
	          minZoom: 1,
	          maxZoom: 16,
	          subdomains: ['server', 'services'],
	          pane: (pointerEvents) ? 'esri-labels' : 'tilePane',
	          attribution: ''

	        }
	      },
	      Gray: {
	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
	        options: {
	          minZoom: 1,
	          maxZoom: 16,
	          subdomains: ['server', 'services'],
	          attribution: 'HERE, DeLorme, MapmyIndia, &copy; OpenStreetMap contributors'
	        }
	      },
	      GrayLabels: {
	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
	        options: {
	          minZoom: 1,
	          maxZoom: 16,
	          subdomains: ['server', 'services'],
	          pane: (pointerEvents) ? 'esri-labels' : 'tilePane',
	          attribution: ''
	        }
	      },
	      Imagery: {
	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
	        options: {
	          minZoom: 1,
	          maxZoom: 19,
	          subdomains: ['server', 'services'],
	          attribution: 'DigitalGlobe, GeoEye, i-cubed, USDA, USGS, AEX, Getmapping, Aerogrid, IGN, IGP, swisstopo, and the GIS User Community'
	        }
	      },
	      ImageryLabels: {
	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
	        options: {
	          minZoom: 1,
	          maxZoom: 19,
	          subdomains: ['server', 'services'],
	          pane: (pointerEvents) ? 'esri-labels' : 'tilePane',
	          attribution: ''
	        }
	      },
	      ImageryTransportation: {
	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
	        options: {
	          minZoom: 1,
	          maxZoom: 19,
	          subdomains: ['server', 'services'],
	          pane: (pointerEvents) ? 'esri-labels' : 'tilePane'
	        }
	      },
	      ShadedRelief: {
	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
	        options: {
	          minZoom: 1,
	          maxZoom: 13,
	          subdomains: ['server', 'services'],
	          attribution: 'USGS'
	        }
	      },
	      ShadedReliefLabels: {
	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places_Alternate/MapServer/tile/{z}/{y}/{x}',
	        options: {
	          minZoom: 1,
	          maxZoom: 12,
	          subdomains: ['server', 'services'],
	          pane: (pointerEvents) ? 'esri-labels' : 'tilePane',
	          attribution: ''
	        }
	      },
	      Terrain: {
	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
	        options: {
	          minZoom: 1,
	          maxZoom: 13,
	          subdomains: ['server', 'services'],
	          attribution: 'USGS, NOAA'
	        }
	      },
	      TerrainLabels: {
	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}',
	        options: {
	          minZoom: 1,
	          maxZoom: 13,
	          subdomains: ['server', 'services'],
	          pane: (pointerEvents) ? 'esri-labels' : 'tilePane',
	          attribution: ''
	        }
	      },
	      USATopo: {
	        urlTemplate: tileProtocol + '//{s}.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}',
	        options: {
	          minZoom: 1,
	          maxZoom: 15,
	          subdomains: ['server', 'services'],
	          attribution: 'USGS, National Geographic Society, i-cubed'
	        }
	      }
	    }
	  },

	  initialize: function (key, options) {
	    var config;

	    // set the config variable with the appropriate config object
	    if (typeof key === 'object' && key.urlTemplate && key.options) {
	      config = key;
	    } else if (typeof key === 'string' && BasemapLayer.TILES[key]) {
	      config = BasemapLayer.TILES[key];
	    } else {
	      throw new Error('L.esri.BasemapLayer: Invalid parameter. Use one of "Streets", "Topographic", "Oceans", "OceansLabels", "NationalGeographic", "Gray", "GrayLabels", "DarkGray", "DarkGrayLabels", "Imagery", "ImageryLabels", "ImageryTransportation", "ShadedRelief", "ShadedReliefLabels", "Terrain", "TerrainLabels" or "USATopo"');
	    }

	    // merge passed options into the config options
	    var tileOptions = L.Util.extend(config.options, options);

	    L.Util.setOptions(this, tileOptions);

	    if (this.options.token) {
	      config.urlTemplate += ('?token=' + this.options.token);
	    }

	    // call the initialize method on L.TileLayer to set everything up
	    L.TileLayer.prototype.initialize.call(this, config.urlTemplate, tileOptions);
	  },

	  onAdd: function (map) {
	    // include 'Powered by Esri' in map attribution
	    setEsriAttribution(map);

	    if (this.options.pane === 'esri-labels') {
	      this._initPane();
	    }
	    // some basemaps can supply dynamic attribution
	    if (this.options.attributionUrl) {
	      _getAttributionData(this.options.attributionUrl, map);
	    }

	    map.on('moveend', _updateMapAttribution);

	    L.TileLayer.prototype.onAdd.call(this, map);
	  },

	  onRemove: function (map) {
	    map.off('moveend', _updateMapAttribution);
	    L.TileLayer.prototype.onRemove.call(this, map);
	  },

	  _initPane: function () {
	    if (!this._map.getPane(this.options.pane)) {
	      var pane = this._map.createPane(this.options.pane);
	      pane.style.pointerEvents = 'none';
	      pane.style.zIndex = 500;
	    }
	  },

	  getAttribution: function () {
	    if (this.options.attribution) {
	      var attribution = '<span class="esri-dynamic-attribution">' + this.options.attribution + '</span>';
	    }
	    return attribution;
	  }
	});

	function basemapLayer (key, options) {
	  return new BasemapLayer(key, options);
	}

	var TiledMapLayer = L.TileLayer.extend({
	  options: {
	    zoomOffsetAllowance: 0.1,
	    errorTileUrl: 'http://downloads2.esri.com/support/TechArticles/blank256.png'
	  },

	  statics: {
	    MercatorZoomLevels: {
	      '0': 156543.03392799999,
	      '1': 78271.516963999893,
	      '2': 39135.758482000099,
	      '3': 19567.879240999901,
	      '4': 9783.9396204999593,
	      '5': 4891.9698102499797,
	      '6': 2445.9849051249898,
	      '7': 1222.9924525624899,
	      '8': 611.49622628138002,
	      '9': 305.74811314055802,
	      '10': 152.874056570411,
	      '11': 76.437028285073197,
	      '12': 38.218514142536598,
	      '13': 19.109257071268299,
	      '14': 9.5546285356341496,
	      '15': 4.7773142679493699,
	      '16': 2.38865713397468,
	      '17': 1.1943285668550501,
	      '18': 0.59716428355981699,
	      '19': 0.29858214164761698,
	      '20': 0.14929107082381,
	      '21': 0.07464553541191,
	      '22': 0.0373227677059525,
	      '23': 0.0186613838529763
	    }
	  },

	  initialize: function (options) {
	    options.url = cleanUrl(options.url);
	    options = L.Util.setOptions(this, options);

	    // set the urls
	    this.tileUrl = options.url + 'tile/{z}/{y}/{x}';
	    this.service = mapService(options);
	    this.service.addEventParent(this);

	    var arcgisonline = new RegExp(/tiles.arcgis(online)?\.com/g);
	    if (arcgisonline.test(options.url)) {
	      this.tileUrl = this.tileUrl.replace('://tiles', '://tiles{s}');
	      options.subdomains = ['1', '2', '3', '4'];
	    }

	    if (this.options.token) {
	      this.tileUrl += ('?token=' + this.options.token);
	    }

	    // init layer by calling TileLayers initialize method
	    L.TileLayer.prototype.initialize.call(this, this.tileUrl, options);
	  },

	  getTileUrl: function (tilePoint) {
	    return L.Util.template(this.tileUrl, L.extend({
	      s: this._getSubdomain(tilePoint),
	      z: (this._lodMap && this._lodMap[tilePoint.z]) ? this._lodMap[tilePoint.z] : tilePoint.z, // try lod map first, then just defualt to zoom level
	      x: tilePoint.x,
	      y: tilePoint.y
	    }, this.options));
	  },

	  createTile: function (coords, done) {
	    var tile = document.createElement('img');

	    L.DomEvent.on(tile, 'load', L.bind(this._tileOnLoad, this, done, tile));
	    L.DomEvent.on(tile, 'error', L.bind(this._tileOnError, this, done, tile));

	    if (this.options.crossOrigin) {
	      tile.crossOrigin = '';
	    }

	    /*
	     Alt tag is set to empty string to keep screen readers from reading URL and for compliance reasons
	     http://www.w3.org/TR/WCAG20-TECHS/H67
	    */
	    tile.alt = '';

	    // if there is no lod map or an lod map with a proper zoom load the tile
	    // otherwise wait for the lod map to become available
	    if (!this._lodMap || (this._lodMap && this._lodMap[coords.z])) {
	      tile.src = this.getTileUrl(coords);
	    } else {
	      this.once('lodmap', function () {
	        tile.src = this.getTileUrl(coords);
	      }, this);
	    }

	    return tile;
	  },

	  onAdd: function (map) {
	    // include 'Powered by Esri' in map attribution
	    setEsriAttribution(map);

	    if (map.options.crs === L.CRS.EPSG3857 && !this._lodMap) {
	      this._lodMap = {};
	      this.metadata(function (error, metadata) {
	        if (!error && metadata.spatialReference) {
	          var sr = metadata.spatialReference.latestWkid || metadata.spatialReference.wkid;
	          if (!this.options.attribution && map.attributionControl && metadata.copyrightText) {
	            this.options.attribution = metadata.copyrightText;
	            map.attributionControl.addAttribution(this.getAttribution());
	          }
	          if (sr === 102100 || sr === 3857) {
	            // create the zoom level data
	            var arcgisLODs = metadata.tileInfo.lods;
	            var correctResolutions = TiledMapLayer.MercatorZoomLevels;

	            for (var i = 0; i < arcgisLODs.length; i++) {
	              var arcgisLOD = arcgisLODs[i];
	              for (var ci in correctResolutions) {
	                var correctRes = correctResolutions[ci];

	                if (this._withinPercentage(arcgisLOD.resolution, correctRes, this.options.zoomOffsetAllowance)) {
	                  this._lodMap[ci] = arcgisLOD.level;
	                  break;
	                }
	              }
	            }

	            this.fire('lodmap');
	          } else {
	            warn('L.esri.TiledMapLayer is using a non-mercator spatial reference. Support may be available through Proj4Leaflet http://esri.github.io/esri-leaflet/examples/non-mercator-projection.html');
	          }
	        }
	      }, this);
	    }

	    L.TileLayer.prototype.onAdd.call(this, map);
	  },

	  metadata: function (callback, context) {
	    this.service.metadata(callback, context);
	    return this;
	  },

	  identify: function () {
	    return this.service.identify();
	  },

	  find: function () {
	    return this.service.find();
	  },

	  query: function () {
	    return this.service.query();
	  },

	  authenticate: function (token) {
	    var tokenQs = '?token=' + token;
	    this.tileUrl = (this.options.token) ? this.tileUrl.replace(/\?token=(.+)/g, tokenQs) : this.tileUrl + tokenQs;
	    this.options.token = token;
	    this.service.authenticate(token);
	    return this;
	  },

	  _withinPercentage: function (a, b, percentage) {
	    var diff = Math.abs((a / b) - 1);
	    return diff < percentage;
	  }
	});

	function tiledMapLayer (url, options) {
	  return new TiledMapLayer(url, options);
	}

	var Overlay = L.ImageOverlay.extend({
	  onAdd: function (map) {
	    this._topLeft = map.getPixelBounds().min;
	    L.ImageOverlay.prototype.onAdd.call(this, map);
	  },
	  _reset: function () {
	    if (this._map.options.crs === L.CRS.EPSG3857) {
	      L.ImageOverlay.prototype._reset.call(this);
	    } else {
	      L.DomUtil.setPosition(this._image, this._topLeft.subtract(this._map.getPixelOrigin()));
	    }
	  }
	});

	var RasterLayer = L.Layer.extend({

	  options: {
	    opacity: 1,
	    position: 'front',
	    f: 'image',
	    useCors: cors,
	    attribution: null,
	    interactive: false,
	    alt: ''
	  },

	  onAdd: function (map) {
	    // include 'Powered by Esri' in map attribution
	    setEsriAttribution(map);

	    this._update = L.Util.throttle(this._update, this.options.updateInterval, this);

	    map.on('moveend', this._update, this);

	    // if we had an image loaded and it matches the
	    // current bounds show the image otherwise remove it
	    if (this._currentImage && this._currentImage._bounds.equals(this._map.getBounds())) {
	      map.addLayer(this._currentImage);
	    } else if (this._currentImage) {
	      this._map.removeLayer(this._currentImage);
	      this._currentImage = null;
	    }

	    this._update();

	    if (this._popup) {
	      this._map.on('click', this._getPopupData, this);
	      this._map.on('dblclick', this._resetPopupState, this);
	    }

	    // add copyright text listed in service metadata
	    this.metadata(function (err, metadata) {
	      if (!err && !this.options.attribution && map.attributionControl && metadata.copyrightText) {
	        this.options.attribution = metadata.copyrightText;
	        map.attributionControl.addAttribution(this.getAttribution());
	      }
	    }, this);
	  },

	  onRemove: function (map) {
	    if (this._currentImage) {
	      this._map.removeLayer(this._currentImage);
	    }

	    if (this._popup) {
	      this._map.off('click', this._getPopupData, this);
	      this._map.off('dblclick', this._resetPopupState, this);
	    }

	    this._map.off('moveend', this._update, this);
	  },

	  bindPopup: function (fn, popupOptions) {
	    this._shouldRenderPopup = false;
	    this._lastClick = false;
	    this._popup = L.popup(popupOptions);
	    this._popupFunction = fn;
	    if (this._map) {
	      this._map.on('click', this._getPopupData, this);
	      this._map.on('dblclick', this._resetPopupState, this);
	    }
	    return this;
	  },

	  unbindPopup: function () {
	    if (this._map) {
	      this._map.closePopup(this._popup);
	      this._map.off('click', this._getPopupData, this);
	      this._map.off('dblclick', this._resetPopupState, this);
	    }
	    this._popup = false;
	    return this;
	  },

	  bringToFront: function () {
	    this.options.position = 'front';
	    if (this._currentImage) {
	      this._currentImage.bringToFront();
	    }
	    return this;
	  },

	  bringToBack: function () {
	    this.options.position = 'back';
	    if (this._currentImage) {
	      this._currentImage.bringToBack();
	    }
	    return this;
	  },

	  getAttribution: function () {
	    return this.options.attribution;
	  },

	  getOpacity: function () {
	    return this.options.opacity;
	  },

	  setOpacity: function (opacity) {
	    this.options.opacity = opacity;
	    this._currentImage.setOpacity(opacity);
	    return this;
	  },

	  setZIndex: function (zIndex) {
	    this.options.zIndex = zIndex;
	    this._updateZIndex();
	    return this;
	  },

	  getTimeRange: function () {
	    return [this.options.from, this.options.to];
	  },

	  setTimeRange: function (from, to) {
	    this.options.from = from;
	    this.options.to = to;
	    this._update();
	    return this;
	  },

	  metadata: function (callback, context) {
	    this.service.metadata(callback, context);
	    return this;
	  },

	  authenticate: function (token) {
	    this.service.authenticate(token);
	    return this;
	  },

	  _renderImage: function (url, bounds, contentType) {
	    if (this._map) {
	      // if no output directory has been specified for a service, MIME data will be returned
	      if (contentType) {
	        url = 'data:' + contentType + ';base64,' + url;
	      }
	      // create a new image overlay and add it to the map
	      // to start loading the image
	      // opacity is 0 while the image is loading
	      var image = new Overlay(url, bounds, {
	        opacity: 0,
	        crossOrigin: this.options.useCors,
	        alt: this.options.alt,
	        pane: this.options.pane || this.getPane(),
	        interactive: this.options.interactive
	      }).addTo(this._map);

	      // once the image loads
	      image.once('load', function (e) {
	        if (this._map) {
	          var newImage = e.target;
	          var oldImage = this._currentImage;

	          // if the bounds of this image matches the bounds that
	          // _renderImage was called with and we have a map with the same bounds
	          // hide the old image if there is one and set the opacity
	          // of the new image otherwise remove the new image
	          if (newImage._bounds.equals(bounds) && newImage._bounds.equals(this._map.getBounds())) {
	            this._currentImage = newImage;

	            if (this.options.position === 'front') {
	              this.bringToFront();
	            } else {
	              this.bringToBack();
	            }

	            if (this._map && this._currentImage._map) {
	              this._currentImage.setOpacity(this.options.opacity);
	            } else {
	              this._currentImage._map.removeLayer(this._currentImage);
	            }

	            if (oldImage && this._map) {
	              this._map.removeLayer(oldImage);
	            }

	            if (oldImage && oldImage._map) {
	              oldImage._map.removeLayer(oldImage);
	            }

	            if (this.options.zIndex !== undefined && this.options.zIndex !== null) {
	              this._updateZIndex();
	            }
	          } else {
	            this._map.removeLayer(newImage);
	          }
	        }

	        this.fire('load', {
	          bounds: bounds
	        });
	      }, this);

	      this.fire('loading', {
	        bounds: bounds
	      });
	    }
	  },

	  _update: function () {
	    if (!this._map) {
	      return;
	    }

	    var zoom = this._map.getZoom();
	    var bounds = this._map.getBounds();

	    if (this._animatingZoom) {
	      return;
	    }

	    if (this._map._panTransition && this._map._panTransition._inProgress) {
	      return;
	    }

	    if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
	      this._currentImage._map.removeLayer(this._currentImage);
	      return;
	    }

	    var params = this._buildExportParams();

	    this._requestExport(params, bounds);
	  },

	  _renderPopup: function (latlng, error, results, response) {
	    latlng = L.latLng(latlng);
	    if (this._shouldRenderPopup && this._lastClick.equals(latlng)) {
	      // add the popup to the map where the mouse was clicked at
	      var content = this._popupFunction(error, results, response);
	      if (content) {
	        this._popup.setLatLng(latlng).setContent(content).openOn(this._map);
	      }
	    }
	  },

	  _resetPopupState: function (e) {
	    this._shouldRenderPopup = false;
	    this._lastClick = e.latlng;
	  },

	  _updateZIndex: function () {
	    if (this._currentImage && this._currentImage._image && this.options.zIndex !== undefined) {
	      this._currentImage._image.style.zIndex = this.options.zIndex;
	    }
	  }
	});

	var ImageMapLayer = RasterLayer.extend({

	  options: {
	    updateInterval: 150,
	    format: 'jpgpng',
	    transparent: true,
	    f: 'json'
	  },

	  query: function () {
	    return this.service.query();
	  },

	  identify: function () {
	    return this.service.identify();
	  },

	  initialize: function (options) {
	    options.url = cleanUrl(options.url);
	    this.service = imageService(options);
	    this.service.addEventParent(this);

	    L.Util.setOptions(this, options);
	  },

	  setPixelType: function (pixelType) {
	    this.options.pixelType = pixelType;
	    this._update();
	    return this;
	  },

	  getPixelType: function () {
	    return this.options.pixelType;
	  },

	  setBandIds: function (bandIds) {
	    if (L.Util.isArray(bandIds)) {
	      this.options.bandIds = bandIds.join(',');
	    } else {
	      this.options.bandIds = bandIds.toString();
	    }
	    this._update();
	    return this;
	  },

	  getBandIds: function () {
	    return this.options.bandIds;
	  },

	  setNoData: function (noData, noDataInterpretation) {
	    if (L.Util.isArray(noData)) {
	      this.options.noData = noData.join(',');
	    } else {
	      this.options.noData = noData.toString();
	    }
	    if (noDataInterpretation) {
	      this.options.noDataInterpretation = noDataInterpretation;
	    }
	    this._update();
	    return this;
	  },

	  getNoData: function () {
	    return this.options.noData;
	  },

	  getNoDataInterpretation: function () {
	    return this.options.noDataInterpretation;
	  },

	  setRenderingRule: function (renderingRule) {
	    this.options.renderingRule = renderingRule;
	    this._update();
	  },

	  getRenderingRule: function () {
	    return this.options.renderingRule;
	  },

	  setMosaicRule: function (mosaicRule) {
	    this.options.mosaicRule = mosaicRule;
	    this._update();
	  },

	  getMosaicRule: function () {
	    return this.options.mosaicRule;
	  },

	  _getPopupData: function (e) {
	    var callback = L.Util.bind(function (error, results, response) {
	      if (error) { return; } // we really can't do anything here but authenticate or requesterror will fire
	      setTimeout(L.Util.bind(function () {
	        this._renderPopup(e.latlng, error, results, response);
	      }, this), 300);
	    }, this);

	    var identifyRequest = this.identify().at(e.latlng);

	    // set mosaic rule for identify task if it is set for layer
	    if (this.options.mosaicRule) {
	      identifyRequest.setMosaicRule(this.options.mosaicRule);
	      // @TODO: force return catalog items too?
	    }

	    // @TODO: set rendering rule? Not sure,
	    // sometimes you want raw pixel values
	    // if (this.options.renderingRule) {
	    //   identifyRequest.setRenderingRule(this.options.renderingRule);
	    // }

	    identifyRequest.run(callback);

	    // set the flags to show the popup
	    this._shouldRenderPopup = true;
	    this._lastClick = e.latlng;
	  },

	  _buildExportParams: function () {
	    var bounds = this._map.getBounds();
	    var size = this._map.getSize();
	    var ne = this._map.options.crs.project(bounds._northEast);
	    var sw = this._map.options.crs.project(bounds._southWest);

	    // ensure that we don't ask ArcGIS Server for a taller image than we have actual map displaying
	    var top = this._map.latLngToLayerPoint(bounds._northEast);
	    var bottom = this._map.latLngToLayerPoint(bounds._southWest);

	    if (top.y > 0 || bottom.y < size.y) {
	      size.y = bottom.y - top.y;
	    }

	    var sr = parseInt(this._map.options.crs.code.split(':')[1], 10);

	    var params = {
	      bbox: [sw.x, sw.y, ne.x, ne.y].join(','),
	      size: size.x + ',' + size.y,
	      format: this.options.format,
	      transparent: this.options.transparent,
	      bboxSR: sr,
	      imageSR: sr
	    };

	    if (this.options.from && this.options.to) {
	      params.time = this.options.from.valueOf() + ',' + this.options.to.valueOf();
	    }

	    if (this.options.pixelType) {
	      params.pixelType = this.options.pixelType;
	    }

	    if (this.options.interpolation) {
	      params.interpolation = this.options.interpolation;
	    }

	    if (this.options.compressionQuality) {
	      params.compressionQuality = this.options.compressionQuality;
	    }

	    if (this.options.bandIds) {
	      params.bandIds = this.options.bandIds;
	    }

	    if (this.options.noData) {
	      params.noData = this.options.noData;
	    }

	    if (this.options.noDataInterpretation) {
	      params.noDataInterpretation = this.options.noDataInterpretation;
	    }

	    if (this.service.options.token) {
	      params.token = this.service.options.token;
	    }

	    if (this.options.renderingRule) {
	      params.renderingRule = JSON.stringify(this.options.renderingRule);
	    }

	    if (this.options.mosaicRule) {
	      params.mosaicRule = JSON.stringify(this.options.mosaicRule);
	    }

	    return params;
	  },

	  _requestExport: function (params, bounds) {
	    if (this.options.f === 'json') {
	      this.service.request('exportImage', params, function (error, response) {
	        if (error) { return; } // we really can't do anything here but authenticate or requesterror will fire
	        if (this.options.token) {
	          response.href += ('?token=' + this.options.token);
	        }
	        this._renderImage(response.href, bounds);
	      }, this);
	    } else {
	      params.f = 'image';
	      this._renderImage(this.options.url + 'exportImage' + L.Util.getParamString(params), bounds);
	    }
	  }
	});

	function imageMapLayer (url, options) {
	  return new ImageMapLayer(url, options);
	}

	var DynamicMapLayer = RasterLayer.extend({

	  options: {
	    updateInterval: 150,
	    layers: false,
	    layerDefs: false,
	    timeOptions: false,
	    format: 'png24',
	    transparent: true,
	    f: 'json'
	  },

	  initialize: function (options) {
	    options.url = cleanUrl(options.url);
	    this.service = mapService(options);
	    this.service.addEventParent(this);

	    if ((options.proxy || options.token) && options.f !== 'json') {
	      options.f = 'json';
	    }
	    L.Util.setOptions(this, options);
	  },

	  getDynamicLayers: function () {
	    return this.options.dynamicLayers;
	  },

	  setDynamicLayers: function (dynamicLayers) {
	    this.options.dynamicLayers = dynamicLayers;
	    this._update();
	    return this;
	  },

	  getLayers: function () {
	    return this.options.layers;
	  },

	  setLayers: function (layers) {
	    this.options.layers = layers;
	    this._update();
	    return this;
	  },

	  getLayerDefs: function () {
	    return this.options.layerDefs;
	  },

	  setLayerDefs: function (layerDefs) {
	    this.options.layerDefs = layerDefs;
	    this._update();
	    return this;
	  },

	  getTimeOptions: function () {
	    return this.options.timeOptions;
	  },

	  setTimeOptions: function (timeOptions) {
	    this.options.timeOptions = timeOptions;
	    this._update();
	    return this;
	  },

	  query: function () {
	    return this.service.query();
	  },

	  identify: function () {
	    return this.service.identify();
	  },

	  find: function () {
	    return this.service.find();
	  },

	  _getPopupData: function (e) {
	    var callback = L.Util.bind(function (error, featureCollection, response) {
	      if (error) { return; } // we really can't do anything here but authenticate or requesterror will fire
	      setTimeout(L.Util.bind(function () {
	        this._renderPopup(e.latlng, error, featureCollection, response);
	      }, this), 300);
	    }, this);

	    var identifyRequest = this.identify().on(this._map).at(e.latlng);

	    if (this.options.layers) {
	      identifyRequest.layers('visible:' + this.options.layers.join(','));
	    } else {
	      identifyRequest.layers('visible');
	    }

	    identifyRequest.run(callback);

	    // set the flags to show the popup
	    this._shouldRenderPopup = true;
	    this._lastClick = e.latlng;
	  },

	  _buildExportParams: function () {
	    var bounds = this._map.getBounds();
	    var size = this._map.getSize();
	    var ne = this._map.options.crs.project(bounds.getNorthEast());
	    var sw = this._map.options.crs.project(bounds.getSouthWest());
	    var sr = parseInt(this._map.options.crs.code.split(':')[1], 10);

	    // ensure that we don't ask ArcGIS Server for a taller image than we have actual map displaying
	    var top = this._map.latLngToLayerPoint(bounds._northEast);
	    var bottom = this._map.latLngToLayerPoint(bounds._southWest);

	    if (top.y > 0 || bottom.y < size.y) {
	      size.y = bottom.y - top.y;
	    }

	    var params = {
	      bbox: [sw.x, sw.y, ne.x, ne.y].join(','),
	      size: size.x + ',' + size.y,
	      dpi: 96,
	      format: this.options.format,
	      transparent: this.options.transparent,
	      bboxSR: sr,
	      imageSR: sr
	    };

	    if (this.options.dynamicLayers) {
	      params.dynamicLayers = this.options.dynamicLayers;
	    }

	    if (this.options.layers) {
	      params.layers = 'show:' + this.options.layers.join(',');
	    }

	    if (this.options.layerDefs) {
	      params.layerDefs = JSON.stringify(this.options.layerDefs);
	    }

	    if (this.options.timeOptions) {
	      params.timeOptions = JSON.stringify(this.options.timeOptions);
	    }

	    if (this.options.from && this.options.to) {
	      params.time = this.options.from.valueOf() + ',' + this.options.to.valueOf();
	    }

	    if (this.service.options.token) {
	      params.token = this.service.options.token;
	    }

	    return params;
	  },

	  _requestExport: function (params, bounds) {
	    if (this.options.f === 'json') {
	      this.service.request('export', params, function (error, response) {
	        if (error) { return; } // we really can't do anything here but authenticate or requesterror will fire
	        if (this.options.token) {
	          response.href += ('?token=' + this.options.token);
	        }
	        if (response.href) {
	          this._renderImage(response.href, bounds);
	        } else {
	          this._renderImage(response.imageData, bounds, response.contentType);
	        }
	      }, this);
	    } else {
	      params.f = 'image';
	      this._renderImage(this.options.url + 'export' + L.Util.getParamString(params), bounds);
	    }
	  }
	});

	function dynamicMapLayer (url, options) {
	  return new DynamicMapLayer(url, options);
	}

	var VirtualGrid = L.Layer.extend({

	  options: {
	    cellSize: 512,
	    updateInterval: 150
	  },

	  initialize: function (options) {
	    options = L.setOptions(this, options);
	    this._zooming = false;
	  },

	  onAdd: function (map) {
	    this._map = map;
	    this._update = L.Util.throttle(this._update, this.options.updateInterval, this);
	    this._reset();
	    this._update();
	  },

	  onRemove: function () {
	    this._map.removeEventListener(this.getEvents(), this);
	    this._removeCells();
	  },

	  getEvents: function () {
	    var events = {
	      moveend: this._update,
	      zoomstart: this._zoomstart,
	      zoomend: this._reset
	    };

	    return events;
	  },

	  addTo: function (map) {
	    map.addLayer(this);
	    return this;
	  },

	  removeFrom: function (map) {
	    map.removeLayer(this);
	    return this;
	  },

	  _zoomstart: function () {
	    this._zooming = true;
	  },

	  _reset: function () {
	    this._removeCells();

	    this._cells = {};
	    this._activeCells = {};
	    this._cellsToLoad = 0;
	    this._cellsTotal = 0;
	    this._cellNumBounds = this._getCellNumBounds();

	    this._resetWrap();
	    this._zooming = false;
	  },

	  _resetWrap: function () {
	    var map = this._map;
	    var crs = map.options.crs;

	    if (crs.infinite) { return; }

	    var cellSize = this._getCellSize();

	    if (crs.wrapLng) {
	      this._wrapLng = [
	        Math.floor(map.project([0, crs.wrapLng[0]]).x / cellSize),
	        Math.ceil(map.project([0, crs.wrapLng[1]]).x / cellSize)
	      ];
	    }

	    if (crs.wrapLat) {
	      this._wrapLat = [
	        Math.floor(map.project([crs.wrapLat[0], 0]).y / cellSize),
	        Math.ceil(map.project([crs.wrapLat[1], 0]).y / cellSize)
	      ];
	    }
	  },

	  _getCellSize: function () {
	    return this.options.cellSize;
	  },

	  _update: function () {
	    if (!this._map) {
	      return;
	    }

	    var bounds = this._map.getPixelBounds();
	    var cellSize = this._getCellSize();

	    // cell coordinates range for the current view
	    var cellBounds = L.bounds(
	      bounds.min.divideBy(cellSize).floor(),
	      bounds.max.divideBy(cellSize).floor());

	    this._removeOtherCells(cellBounds);
	    this._addCells(cellBounds);

	    this.fire('cellsupdated');
	  },

	  _addCells: function (bounds) {
	    var queue = [];
	    var center = bounds.getCenter();
	    var zoom = this._map.getZoom();

	    var j, i, coords;
	    // create a queue of coordinates to load cells from
	    for (j = bounds.min.y; j <= bounds.max.y; j++) {
	      for (i = bounds.min.x; i <= bounds.max.x; i++) {
	        coords = L.point(i, j);
	        coords.z = zoom;

	        if (this._isValidCell(coords)) {
	          queue.push(coords);
	        }
	      }
	    }

	    var cellsToLoad = queue.length;

	    if (cellsToLoad === 0) { return; }

	    this._cellsToLoad += cellsToLoad;
	    this._cellsTotal += cellsToLoad;

	    // sort cell queue to load cells in order of their distance to center
	    queue.sort(function (a, b) {
	      return a.distanceTo(center) - b.distanceTo(center);
	    });

	    for (i = 0; i < cellsToLoad; i++) {
	      this._addCell(queue[i]);
	    }
	  },

	  _isValidCell: function (coords) {
	    var crs = this._map.options.crs;

	    if (!crs.infinite) {
	      // don't load cell if it's out of bounds and not wrapped
	      var bounds = this._cellNumBounds;
	      if (
	        (!crs.wrapLng && (coords.x < bounds.min.x || coords.x > bounds.max.x)) ||
	        (!crs.wrapLat && (coords.y < bounds.min.y || coords.y > bounds.max.y))
	      ) {
	        return false;
	      }
	    }

	    if (!this.options.bounds) {
	      return true;
	    }

	    // don't load cell if it doesn't intersect the bounds in options
	    var cellBounds = this._cellCoordsToBounds(coords);
	    return L.latLngBounds(this.options.bounds).intersects(cellBounds);
	  },

	  // converts cell coordinates to its geographical bounds
	  _cellCoordsToBounds: function (coords) {
	    var map = this._map;
	    var cellSize = this.options.cellSize;
	    var nwPoint = coords.multiplyBy(cellSize);
	    var sePoint = nwPoint.add([cellSize, cellSize]);
	    var nw = map.wrapLatLng(map.unproject(nwPoint, coords.z));
	    var se = map.wrapLatLng(map.unproject(sePoint, coords.z));

	    return L.latLngBounds(nw, se);
	  },

	  // converts cell coordinates to key for the cell cache
	  _cellCoordsToKey: function (coords) {
	    return coords.x + ':' + coords.y;
	  },

	  // converts cell cache key to coordiantes
	  _keyToCellCoords: function (key) {
	    var kArr = key.split(':');
	    var x = parseInt(kArr[0], 10);
	    var y = parseInt(kArr[1], 10);

	    return L.point(x, y);
	  },

	  // remove any present cells that are off the specified bounds
	  _removeOtherCells: function (bounds) {
	    for (var key in this._cells) {
	      if (!bounds.contains(this._keyToCellCoords(key))) {
	        this._removeCell(key);
	      }
	    }
	  },

	  _removeCell: function (key) {
	    var cell = this._activeCells[key];

	    if (cell) {
	      delete this._activeCells[key];

	      if (this.cellLeave) {
	        this.cellLeave(cell.bounds, cell.coords);
	      }

	      this.fire('cellleave', {
	        bounds: cell.bounds,
	        coords: cell.coords
	      });
	    }
	  },

	  _removeCells: function () {
	    for (var key in this._cells) {
	      var bounds = this._cells[key].bounds;
	      var coords = this._cells[key].coords;

	      if (this.cellLeave) {
	        this.cellLeave(bounds, coords);
	      }

	      this.fire('cellleave', {
	        bounds: bounds,
	        coords: coords
	      });
	    }
	  },

	  _addCell: function (coords) {
	    // wrap cell coords if necessary (depending on CRS)
	    this._wrapCoords(coords);

	    // generate the cell key
	    var key = this._cellCoordsToKey(coords);

	    // get the cell from the cache
	    var cell = this._cells[key];
	    // if this cell should be shown as isnt active yet (enter)

	    if (cell && !this._activeCells[key]) {
	      if (this.cellEnter) {
	        this.cellEnter(cell.bounds, coords);
	      }

	      this.fire('cellenter', {
	        bounds: cell.bounds,
	        coords: coords
	      });

	      this._activeCells[key] = cell;
	    }

	    // if we dont have this cell in the cache yet (create)
	    if (!cell) {
	      cell = {
	        coords: coords,
	        bounds: this._cellCoordsToBounds(coords)
	      };

	      this._cells[key] = cell;
	      this._activeCells[key] = cell;

	      if (this.createCell) {
	        this.createCell(cell.bounds, coords);
	      }

	      this.fire('cellcreate', {
	        bounds: cell.bounds,
	        coords: coords
	      });
	    }
	  },

	  _wrapCoords: function (coords) {
	    coords.x = this._wrapLng ? L.Util.wrapNum(coords.x, this._wrapLng) : coords.x;
	    coords.y = this._wrapLat ? L.Util.wrapNum(coords.y, this._wrapLat) : coords.y;
	  },

	  // get the global cell coordinates range for the current zoom
	  _getCellNumBounds: function () {
	    var bounds = this._map.getPixelWorldBounds();
	    var size = this._getCellSize();

	    return bounds ? L.bounds(
	        bounds.min.divideBy(size).floor(),
	        bounds.max.divideBy(size).ceil().subtract([1, 1])) : null;
	  }
	});

	function BinarySearchIndex (values) {
	  this.values = [].concat(values || []);
	}

	BinarySearchIndex.prototype.query = function (value) {
	  var index = this.getIndex(value);
	  return this.values[index];
	};

	BinarySearchIndex.prototype.getIndex = function getIndex (value) {
	  if (this.dirty) {
	    this.sort();
	  }

	  var minIndex = 0;
	  var maxIndex = this.values.length - 1;
	  var currentIndex;
	  var currentElement;

	  while (minIndex <= maxIndex) {
	    currentIndex = (minIndex + maxIndex) / 2 | 0;
	    currentElement = this.values[Math.round(currentIndex)];
	    if (+currentElement.value < +value) {
	      minIndex = currentIndex + 1;
	    } else if (+currentElement.value > +value) {
	      maxIndex = currentIndex - 1;
	    } else {
	      return currentIndex;
	    }
	  }

	  return Math.abs(~maxIndex);
	};

	BinarySearchIndex.prototype.between = function between (start, end) {
	  var startIndex = this.getIndex(start);
	  var endIndex = this.getIndex(end);

	  if (startIndex === 0 && endIndex === 0) {
	    return [];
	  }

	  while (this.values[startIndex - 1] && this.values[startIndex - 1].value === start) {
	    startIndex--;
	  }

	  while (this.values[endIndex + 1] && this.values[endIndex + 1].value === end) {
	    endIndex++;
	  }

	  if (this.values[endIndex] && this.values[endIndex].value === end && this.values[endIndex + 1]) {
	    endIndex++;
	  }

	  return this.values.slice(startIndex, endIndex);
	};

	BinarySearchIndex.prototype.insert = function insert (item) {
	  this.values.splice(this.getIndex(item.value), 0, item);
	  return this;
	};

	BinarySearchIndex.prototype.bulkAdd = function bulkAdd (items, sort) {
	  this.values = this.values.concat([].concat(items || []));

	  if (sort) {
	    this.sort();
	  } else {
	    this.dirty = true;
	  }

	  return this;
	};

	BinarySearchIndex.prototype.sort = function sort () {
	  this.values.sort(function (a, b) {
	    return +b.value - +a.value;
	  }).reverse();
	  this.dirty = false;
	  return this;
	};

	var FeatureManager = VirtualGrid.extend({
	  /**
	   * Options
	   */

	  options: {
	    attribution: null,
	    where: '1=1',
	    fields: ['*'],
	    from: false,
	    to: false,
	    timeField: false,
	    timeFilterMode: 'server',
	    simplifyFactor: 0,
	    precision: 6
	  },

	  /**
	   * Constructor
	   */

	  initialize: function (options) {
	    VirtualGrid.prototype.initialize.call(this, options);

	    options.url = cleanUrl(options.url);
	    options = L.setOptions(this, options);

	    this.service = featureLayerService(options);
	    this.service.addEventParent(this);

	    // use case insensitive regex to look for common fieldnames used for indexing
	    if (this.options.fields[0] !== '*') {
	      var oidCheck = false;
	      for (var i = 0; i < this.options.fields.length; i++) {
	        if (this.options.fields[i].match(/^(OBJECTID|FID|OID|ID)$/i)) {
	          oidCheck = true;
	        }
	      }
	      if (oidCheck === false) {
	        warn('no known esriFieldTypeOID field detected in fields Array.  Please add an attribute field containing unique IDs to ensure the layer can be drawn correctly.');
	      }
	    }

	    if (this.options.timeField.start && this.options.timeField.end) {
	      this._startTimeIndex = new BinarySearchIndex();
	      this._endTimeIndex = new BinarySearchIndex();
	    } else if (this.options.timeField) {
	      this._timeIndex = new BinarySearchIndex();
	    }

	    this._cache = {};
	    this._currentSnapshot = []; // cache of what layers should be active
	    this._activeRequests = 0;
	  },

	  /**
	   * Layer Interface
	   */

	  onAdd: function (map) {
	    // include 'Powered by Esri' in map attribution
	    setEsriAttribution(map);

	    this.service.metadata(function (err, metadata) {
	      if (!err) {
	        var supportedFormats = metadata.supportedQueryFormats;
	        // check to see whether service can emit GeoJSON natively
	        if (supportedFormats && supportedFormats.indexOf('geoJSON') !== -1) {
	          this.service.options.isModern = true;
	        }
	        // add copyright text listed in service metadata
	        if (!this.options.attribution && map.attributionControl && metadata.copyrightText) {
	          this.options.attribution = metadata.copyrightText;
	          map.attributionControl.addAttribution(this.getAttribution());
	        }
	      }
	    }, this);

	    map.on('zoomend', this._handleZoomChange, this);

	    return VirtualGrid.prototype.onAdd.call(this, map);
	  },

	  onRemove: function (map) {
	    map.off('zoomend', this._handleZoomChange, this);

	    return VirtualGrid.prototype.onRemove.call(this, map);
	  },

	  getAttribution: function () {
	    return this.options.attribution;
	  },

	  /**
	   * Feature Management
	   */

	  createCell: function (bounds, coords) {
	    this._requestFeatures(bounds, coords);
	  },

	  _requestFeatures: function (bounds, coords, callback) {
	    this._activeRequests++;

	    // our first active request fires loading
	    if (this._activeRequests === 1) {
	      this.fire('loading', {
	        bounds: bounds
	      }, true);
	    }

	    return this._buildQuery(bounds).run(function (error, featureCollection, response) {
	      if (response && response.exceededTransferLimit) {
	        this.fire('drawlimitexceeded');
	      }

	      // no error, features
	      if (!error && featureCollection && featureCollection.features.length) {
	        // schedule adding features until the next animation frame
	        L.Util.requestAnimFrame(L.Util.bind(function () {
	          this._addFeatures(featureCollection.features, coords);
	          this._postProcessFeatures(bounds);
	        }, this));
	      }

	      // no error, no features
	      if (!error && featureCollection && !featureCollection.features.length) {
	        this._postProcessFeatures(bounds);
	      }

	      if (error) {
	        this._postProcessFeatures(bounds);
	      }

	      if (callback) {
	        callback.call(this, error, featureCollection);
	      }
	    }, this);
	  },

	  _postProcessFeatures: function (bounds) {
	    // deincriment the request counter now that we have processed features
	    this._activeRequests--;

	    // if there are no more active requests fire a load event for this view
	    if (this._activeRequests <= 0) {
	      this.fire('load', {
	        bounds: bounds
	      });
	    }
	  },

	  _cacheKey: function (coords) {
	    return coords.z + ':' + coords.x + ':' + coords.y;
	  },

	  _addFeatures: function (features, coords) {
	    var key = this._cacheKey(coords);
	    this._cache[key] = this._cache[key] || [];

	    for (var i = features.length - 1; i >= 0; i--) {
	      var id = features[i].id;
	      this._currentSnapshot.push(id);
	      this._cache[key].push(id);
	    }

	    if (this.options.timeField) {
	      this._buildTimeIndexes(features);
	    }

	    // need to PR removal of the logic below too...
	    // https://github.com/patrickarlt/leaflet-virtual-grid/blob/master/src/virtual-grid.js#L100-L102

	    this.createLayers(features);
	  },

	  _buildQuery: function (bounds) {
	    var query = this.service.query()
	      .intersects(bounds)
	      .where(this.options.where)
	      .fields(this.options.fields)
	      .precision(this.options.precision);

	    if (this.options.simplifyFactor) {
	      query.simplify(this._map, this.options.simplifyFactor);
	    }

	    if (this.options.timeFilterMode === 'server' && this.options.from && this.options.to) {
	      query.between(this.options.from, this.options.to);
	    }

	    return query;
	  },

	  /**
	   * Where Methods
	   */

	  setWhere: function (where, callback, context) {
	    this.options.where = (where && where.length) ? where : '1=1';

	    var oldSnapshot = [];
	    var newSnapshot = [];
	    var pendingRequests = 0;
	    var requestError = null;
	    var requestCallback = L.Util.bind(function (error, featureCollection) {
	      if (error) {
	        requestError = error;
	      }

	      if (featureCollection) {
	        for (var i = featureCollection.features.length - 1; i >= 0; i--) {
	          newSnapshot.push(featureCollection.features[i].id);
	        }
	      }

	      pendingRequests--;

	      if (pendingRequests <= 0) {
	        this._currentSnapshot = newSnapshot;
	        // schedule adding features for the next animation frame
	        L.Util.requestAnimFrame(L.Util.bind(function () {
	          this.removeLayers(oldSnapshot);
	          this.addLayers(newSnapshot);
	          if (callback) {
	            callback.call(context, requestError);
	          }
	        }, this));
	      }
	    }, this);

	    for (var i = this._currentSnapshot.length - 1; i >= 0; i--) {
	      oldSnapshot.push(this._currentSnapshot[i]);
	    }

	    for (var key in this._activeCells) {
	      pendingRequests++;
	      var coords = this._keyToCellCoords(key);
	      var bounds = this._cellCoordsToBounds(coords);
	      this._requestFeatures(bounds, key, requestCallback);
	    }

	    return this;
	  },

	  getWhere: function () {
	    return this.options.where;
	  },

	  /**
	   * Time Range Methods
	   */

	  getTimeRange: function () {
	    return [this.options.from, this.options.to];
	  },

	  setTimeRange: function (from, to, callback, context) {
	    var oldFrom = this.options.from;
	    var oldTo = this.options.to;
	    var pendingRequests = 0;
	    var requestError = null;
	    var requestCallback = L.Util.bind(function (error) {
	      if (error) {
	        requestError = error;
	      }
	      this._filterExistingFeatures(oldFrom, oldTo, from, to);

	      pendingRequests--;

	      if (callback && pendingRequests <= 0) {
	        callback.call(context, requestError);
	      }
	    }, this);

	    this.options.from = from;
	    this.options.to = to;

	    this._filterExistingFeatures(oldFrom, oldTo, from, to);

	    if (this.options.timeFilterMode === 'server') {
	      for (var key in this._activeCells) {
	        pendingRequests++;
	        var coords = this._keyToCellCoords(key);
	        var bounds = this._cellCoordsToBounds(coords);
	        this._requestFeatures(bounds, key, requestCallback);
	      }
	    }

	    return this;
	  },

	  refresh: function () {
	    for (var key in this._activeCells) {
	      var coords = this._keyToCellCoords(key);
	      var bounds = this._cellCoordsToBounds(coords);
	      this._requestFeatures(bounds, key);
	    }

	    if (this.redraw) {
	      this.once('load', function () {
	        this.eachFeature(function (layer) {
	          this._redraw(layer.feature.id);
	        }, this);
	      }, this);
	    }
	  },

	  _filterExistingFeatures: function (oldFrom, oldTo, newFrom, newTo) {
	    var layersToRemove = (oldFrom && oldTo) ? this._getFeaturesInTimeRange(oldFrom, oldTo) : this._currentSnapshot;
	    var layersToAdd = this._getFeaturesInTimeRange(newFrom, newTo);

	    if (layersToAdd.indexOf) {
	      for (var i = 0; i < layersToAdd.length; i++) {
	        var shouldRemoveLayer = layersToRemove.indexOf(layersToAdd[i]);
	        if (shouldRemoveLayer >= 0) {
	          layersToRemove.splice(shouldRemoveLayer, 1);
	        }
	      }
	    }

	    // schedule adding features until the next animation frame
	    L.Util.requestAnimFrame(L.Util.bind(function () {
	      this.removeLayers(layersToRemove);
	      this.addLayers(layersToAdd);
	    }, this));
	  },

	  _getFeaturesInTimeRange: function (start, end) {
	    var ids = [];
	    var search;

	    if (this.options.timeField.start && this.options.timeField.end) {
	      var startTimes = this._startTimeIndex.between(start, end);
	      var endTimes = this._endTimeIndex.between(start, end);
	      search = startTimes.concat(endTimes);
	    } else {
	      search = this._timeIndex.between(start, end);
	    }

	    for (var i = search.length - 1; i >= 0; i--) {
	      ids.push(search[i].id);
	    }

	    return ids;
	  },

	  _buildTimeIndexes: function (geojson) {
	    var i;
	    var feature;
	    if (this.options.timeField.start && this.options.timeField.end) {
	      var startTimeEntries = [];
	      var endTimeEntries = [];
	      for (i = geojson.length - 1; i >= 0; i--) {
	        feature = geojson[i];
	        startTimeEntries.push({
	          id: feature.id,
	          value: new Date(feature.properties[this.options.timeField.start])
	        });
	        endTimeEntries.push({
	          id: feature.id,
	          value: new Date(feature.properties[this.options.timeField.end])
	        });
	      }
	      this._startTimeIndex.bulkAdd(startTimeEntries);
	      this._endTimeIndex.bulkAdd(endTimeEntries);
	    } else {
	      var timeEntries = [];
	      for (i = geojson.length - 1; i >= 0; i--) {
	        feature = geojson[i];
	        timeEntries.push({
	          id: feature.id,
	          value: new Date(feature.properties[this.options.timeField])
	        });
	      }

	      this._timeIndex.bulkAdd(timeEntries);
	    }
	  },

	  _featureWithinTimeRange: function (feature) {
	    if (!this.options.from || !this.options.to) {
	      return true;
	    }

	    var from = +this.options.from.valueOf();
	    var to = +this.options.to.valueOf();

	    if (typeof this.options.timeField === 'string') {
	      var date = +feature.properties[this.options.timeField];
	      return (date >= from) && (date <= to);
	    }

	    if (this.options.timeField.start && this.options.timeField.end) {
	      var startDate = +feature.properties[this.options.timeField.start];
	      var endDate = +feature.properties[this.options.timeField.end];
	      return ((startDate >= from) && (startDate <= to)) || ((endDate >= from) && (endDate <= to));
	    }
	  },

	  _visibleZoom: function () {
	    // check to see whether the current zoom level of the map is within the optional limit defined for the FeatureLayer
	    if (!this._map) {
	      return false;
	    }
	    var zoom = this._map.getZoom();
	    if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
	      return false;
	    } else { return true; }
	  },

	  _handleZoomChange: function () {
	    if (!this._visibleZoom()) {
	      this.removeLayers(this._currentSnapshot);
	      this._currentSnapshot = [];
	    } else {
	      /*
	      for every cell in this._activeCells
	        1. Get the cache key for the coords of the cell
	        2. If this._cache[key] exists it will be an array of feature IDs.
	        3. Call this.addLayers(this._cache[key]) to instruct the feature layer to add the layers back.
	      */
	      for (var i in this._activeCells) {
	        var coords = this._activeCells[i].coords;
	        var key = this._cacheKey(coords);
	        if (this._cache[key]) {
	          this.addLayers(this._cache[key]);
	        }
	      }
	    }
	  },

	  /**
	   * Service Methods
	   */

	  authenticate: function (token) {
	    this.service.authenticate(token);
	    return this;
	  },

	  metadata: function (callback, context) {
	    this.service.metadata(callback, context);
	    return this;
	  },

	  query: function () {
	    return this.service.query();
	  },

	  _getMetadata: function (callback) {
	    if (this._metadata) {
	      var error;
	      callback(error, this._metadata);
	    } else {
	      this.metadata(L.Util.bind(function (error, response) {
	        this._metadata = response;
	        callback(error, this._metadata);
	      }, this));
	    }
	  },

	  addFeature: function (feature, callback, context) {
	    this._getMetadata(L.Util.bind(function (error, metadata) {
	      if (error) {
	        if (callback) { callback.call(this, error, null); }
	        return;
	      }

	      this.service.addFeature(feature, L.Util.bind(function (error, response) {
	        if (!error) {
	          // assign ID from result to appropriate objectid field from service metadata
	          feature.properties[metadata.objectIdField] = response.objectId;

	          // we also need to update the geojson id for createLayers() to function
	          feature.id = response.objectId;
	          this.createLayers([feature]);
	        }

	        if (callback) {
	          callback.call(context, error, response);
	        }
	      }, this));
	    }, this));
	  },

	  updateFeature: function (feature, callback, context) {
	    this.service.updateFeature(feature, function (error, response) {
	      if (!error) {
	        this.removeLayers([feature.id], true);
	        this.createLayers([feature]);
	      }

	      if (callback) {
	        callback.call(context, error, response);
	      }
	    }, this);
	  },

	  deleteFeature: function (id, callback, context) {
	    this.service.deleteFeature(id, function (error, response) {
	      if (!error && response.objectId) {
	        this.removeLayers([response.objectId], true);
	      }
	      if (callback) {
	        callback.call(context, error, response);
	      }
	    }, this);
	  },

	  deleteFeatures: function (ids, callback, context) {
	    return this.service.deleteFeatures(ids, function (error, response) {
	      if (!error && response.length > 0) {
	        for (var i = 0; i < response.length; i++) {
	          this.removeLayers([response[i].objectId], true);
	        }
	      }
	      if (callback) {
	        callback.call(context, error, response);
	      }
	    }, this);
	  }
	});

	var FeatureLayer = FeatureManager.extend({

	  options: {
	    cacheLayers: true
	  },

	  /**
	   * Constructor
	   */
	  initialize: function (options) {
	    FeatureManager.prototype.initialize.call(this, options);
	    this._originalStyle = this.options.style;
	    this._layers = {};
	  },

	  /**
	   * Layer Interface
	   */

	  onRemove: function (map) {
	    for (var i in this._layers) {
	      map.removeLayer(this._layers[i]);
	      // trigger the event when the entire featureLayer is removed from the map
	      this.fire('removefeature', {
	        feature: this._layers[i].feature,
	        permanent: false
	      }, true);
	    }

	    return FeatureManager.prototype.onRemove.call(this, map);
	  },

	  createNewLayer: function (geojson) {
	    var layer = L.GeoJSON.geometryToLayer(geojson, this.options);
	    layer.defaultOptions = layer.options;
	    return layer;
	  },

	  _updateLayer: function (layer, geojson) {
	    // convert the geojson coordinates into a Leaflet LatLng array/nested arrays
	    // pass it to setLatLngs to update layer geometries
	    var latlngs = [];
	    var coordsToLatLng = this.options.coordsToLatLng || L.GeoJSON.coordsToLatLng;

	    // copy new attributes, if present
	    if (geojson.properties) {
	      layer.feature.properties = geojson.properties;
	    }

	    switch (geojson.geometry.type) {
	      case 'Point':
	        latlngs = L.GeoJSON.coordsToLatLng(geojson.geometry.coordinates);
	        layer.setLatLng(latlngs);
	        break;
	      case 'LineString':
	        latlngs = L.GeoJSON.coordsToLatLngs(geojson.geometry.coordinates, 0, coordsToLatLng);
	        layer.setLatLngs(latlngs);
	        break;
	      case 'MultiLineString':
	        latlngs = L.GeoJSON.coordsToLatLngs(geojson.geometry.coordinates, 1, coordsToLatLng);
	        layer.setLatLngs(latlngs);
	        break;
	      case 'Polygon':
	        latlngs = L.GeoJSON.coordsToLatLngs(geojson.geometry.coordinates, 1, coordsToLatLng);
	        layer.setLatLngs(latlngs);
	        break;
	      case 'MultiPolygon':
	        latlngs = L.GeoJSON.coordsToLatLngs(geojson.geometry.coordinates, 2, coordsToLatLng);
	        layer.setLatLngs(latlngs);
	        break;
	    }
	  },

	  /**
	   * Feature Management Methods
	   */

	  createLayers: function (features) {
	    for (var i = features.length - 1; i >= 0; i--) {
	      var geojson = features[i];

	      var layer = this._layers[geojson.id];
	      var newLayer;

	      if (this._visibleZoom() && layer && !this._map.hasLayer(layer)) {
	        this._map.addLayer(layer);
	        this.fire('addfeature', {
	          feature: layer.feature
	        }, true);
	      }

	      // update geometry if necessary
	      if (layer && this.options.simplifyFactor > 0 && (layer.setLatLngs || layer.setLatLng)) {
	        this._updateLayer(layer, geojson);
	      }

	      if (!layer) {
	        newLayer = this.createNewLayer(geojson);
	        newLayer.feature = geojson;

	        // bubble events from individual layers to the feature layer
	        newLayer.addEventParent(this);

	        if (this.options.onEachFeature) {
	          this.options.onEachFeature(newLayer.feature, newLayer);
	        }

	        // cache the layer
	        this._layers[newLayer.feature.id] = newLayer;

	        // style the layer
	        this.setFeatureStyle(newLayer.feature.id, this.options.style);

	        this.fire('createfeature', {
	          feature: newLayer.feature
	        }, true);

	        // add the layer if the current zoom level is inside the range defined for the layer, it is within the current time bounds or our layer is not time enabled
	        if (this._visibleZoom() && (!this.options.timeField || (this.options.timeField && this._featureWithinTimeRange(geojson)))) {
	          this.fire('addfeature', {
	            feature: newLayer.feature
	          }, true);
	          this._map.addLayer(newLayer);
	        }
	      }
	    }
	  },

	  addLayers: function (ids) {
	    for (var i = ids.length - 1; i >= 0; i--) {
	      var layer = this._layers[ids[i]];
	      if (layer) {
	        this.fire('addfeature', {
	          feature: layer.feature
	        }, true);
	        this._map.addLayer(layer);
	      }
	    }
	  },

	  removeLayers: function (ids, permanent) {
	    for (var i = ids.length - 1; i >= 0; i--) {
	      var id = ids[i];
	      var layer = this._layers[id];
	      if (layer) {
	        this.fire('removefeature', {
	          feature: layer.feature,
	          permanent: permanent
	        }, true);
	        this._map.removeLayer(layer);
	      }
	      if (layer && permanent) {
	        delete this._layers[id];
	      }
	    }
	  },

	  cellEnter: function (bounds, coords) {
	    if (!this._zooming && this._map) {
	      L.Util.requestAnimFrame(L.Util.bind(function () {
	        var cacheKey = this._cacheKey(coords);
	        var cellKey = this._cellCoordsToKey(coords);
	        var layers = this._cache[cacheKey];
	        if (this._activeCells[cellKey] && layers) {
	          this.addLayers(layers);
	        }
	      }, this));
	    }
	  },

	  cellLeave: function (bounds, coords) {
	    if (!this._zooming) {
	      L.Util.requestAnimFrame(L.Util.bind(function () {
	        if (this._map) {
	          var cacheKey = this._cacheKey(coords);
	          var cellKey = this._cellCoordsToKey(coords);
	          var layers = this._cache[cacheKey];
	          var mapBounds = this._map.getBounds();
	          if (!this._activeCells[cellKey] && layers) {
	            var removable = true;

	            for (var i = 0; i < layers.length; i++) {
	              var layer = this._layers[layers[i]];
	              if (layer && layer.getBounds && mapBounds.intersects(layer.getBounds())) {
	                removable = false;
	              }
	            }

	            if (removable) {
	              this.removeLayers(layers, !this.options.cacheLayers);
	            }

	            if (!this.options.cacheLayers && removable) {
	              delete this._cache[cacheKey];
	              delete this._cells[cellKey];
	              delete this._activeCells[cellKey];
	            }
	          }
	        }
	      }, this));
	    }
	  },

	  /**
	   * Styling Methods
	   */

	  resetStyle: function () {
	    this.options.style = this._originalStyle;
	    this.eachFeature(function (layer) {
	      this.resetFeatureStyle(layer.feature.id);
	    }, this);
	    return this;
	  },

	  setStyle: function (style) {
	    this.options.style = style;
	    this.eachFeature(function (layer) {
	      this.setFeatureStyle(layer.feature.id, style);
	    }, this);
	    return this;
	  },

	  resetFeatureStyle: function (id) {
	    var layer = this._layers[id];
	    var style = this._originalStyle || L.Path.prototype.options;
	    if (layer) {
	      L.Util.extend(layer.options, layer.defaultOptions);
	      this.setFeatureStyle(id, style);
	    }
	    return this;
	  },

	  setFeatureStyle: function (id, style) {
	    var layer = this._layers[id];
	    if (typeof style === 'function') {
	      style = style(layer.feature);
	    }
	    if (layer.setStyle) {
	      layer.setStyle(style);
	    }
	    return this;
	  },

	  /**
	   * Utility Methods
	   */

	  eachFeature: function (fn, context) {
	    for (var i in this._layers) {
	      fn.call(context, this._layers[i]);
	    }
	    return this;
	  },

	  getFeature: function (id) {
	    return this._layers[id];
	  },

	  bringToBack: function () {
	    this.eachFeature(function (layer) {
	      if (layer.bringToBack) {
	        layer.bringToBack();
	      }
	    });
	  },

	  bringToFront: function () {
	    this.eachFeature(function (layer) {
	      if (layer.bringToFront) {
	        layer.bringToFront();
	      }
	    });
	  },

	  redraw: function (id) {
	    if (id) {
	      this._redraw(id);
	    }
	    return this;
	  },

	  _redraw: function (id) {
	    var layer = this._layers[id];
	    var geojson = layer.feature;

	    // if this looks like a marker
	    if (layer && layer.setIcon && this.options.pointToLayer) {
	      // update custom symbology, if necessary
	      if (this.options.pointToLayer) {
	        var getIcon = this.options.pointToLayer(geojson, L.latLng(geojson.geometry.coordinates[1], geojson.geometry.coordinates[0]));
	        var updatedIcon = getIcon.options.icon;
	        layer.setIcon(updatedIcon);
	      }
	    }

	    // looks like a vector marker (circleMarker)
	    if (layer && layer.setStyle && this.options.pointToLayer) {
	      var getStyle = this.options.pointToLayer(geojson, L.latLng(geojson.geometry.coordinates[1], geojson.geometry.coordinates[0]));
	      var updatedStyle = getStyle.options;
	      this.setFeatureStyle(geojson.id, updatedStyle);
	    }

	    // looks like a path (polygon/polyline)
	    if (layer && layer.setStyle && this.options.style) {
	      this.resetStyle(geojson.id);
	    }
	  }
	});

	function featureLayer (options) {
	  return new FeatureLayer(options);
	}

	exports.VERSION = version;
	exports.Support = Support;
	exports.options = options;
	exports.Util = Util;
	exports.get = get;
	exports.post = xmlHttpPost;
	exports.request = request;
	exports.Task = Task;
	exports.task = task;
	exports.Query = Query;
	exports.query = query;
	exports.Find = Find;
	exports.find = find;
	exports.Identify = Identify;
	exports.identify = identify;
	exports.IdentifyFeatures = IdentifyFeatures;
	exports.identifyFeatures = identifyFeatures;
	exports.IdentifyImage = IdentifyImage;
	exports.identifyImage = identifyImage;
	exports.Service = Service;
	exports.service = service;
	exports.MapService = MapService;
	exports.mapService = mapService;
	exports.ImageService = ImageService;
	exports.imageService = imageService;
	exports.FeatureLayerService = FeatureLayerService;
	exports.featureLayerService = featureLayerService;
	exports.BasemapLayer = BasemapLayer;
	exports.basemapLayer = basemapLayer;
	exports.TiledMapLayer = TiledMapLayer;
	exports.tiledMapLayer = tiledMapLayer;
	exports.RasterLayer = RasterLayer;
	exports.ImageMapLayer = ImageMapLayer;
	exports.imageMapLayer = imageMapLayer;
	exports.DynamicMapLayer = DynamicMapLayer;
	exports.dynamicMapLayer = dynamicMapLayer;
	exports.FeatureManager = FeatureManager;
	exports.FeatureLayer = FeatureLayer;
	exports.featureLayer = featureLayer;

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNyaS1sZWFmbGV0LWRlYnVnLmpzIiwic291cmNlcyI6WyIuLi9wYWNrYWdlLmpzb24iLCIuLi9zcmMvU3VwcG9ydC5qcyIsIi4uL3NyYy9PcHRpb25zLmpzIiwiLi4vc3JjL1JlcXVlc3QuanMiLCIuLi9ub2RlX21vZHVsZXMvYXJjZ2lzLXRvLWdlb2pzb24tdXRpbHMvaW5kZXguanMiLCIuLi9zcmMvVXRpbC5qcyIsIi4uL3NyYy9UYXNrcy9UYXNrLmpzIiwiLi4vc3JjL1Rhc2tzL1F1ZXJ5LmpzIiwiLi4vc3JjL1Rhc2tzL0ZpbmQuanMiLCIuLi9zcmMvVGFza3MvSWRlbnRpZnkuanMiLCIuLi9zcmMvVGFza3MvSWRlbnRpZnlGZWF0dXJlcy5qcyIsIi4uL3NyYy9UYXNrcy9JZGVudGlmeUltYWdlLmpzIiwiLi4vc3JjL1NlcnZpY2VzL1NlcnZpY2UuanMiLCIuLi9zcmMvU2VydmljZXMvTWFwU2VydmljZS5qcyIsIi4uL3NyYy9TZXJ2aWNlcy9JbWFnZVNlcnZpY2UuanMiLCIuLi9zcmMvU2VydmljZXMvRmVhdHVyZUxheWVyU2VydmljZS5qcyIsIi4uL3NyYy9MYXllcnMvQmFzZW1hcExheWVyLmpzIiwiLi4vc3JjL0xheWVycy9UaWxlZE1hcExheWVyLmpzIiwiLi4vc3JjL0xheWVycy9SYXN0ZXJMYXllci5qcyIsIi4uL3NyYy9MYXllcnMvSW1hZ2VNYXBMYXllci5qcyIsIi4uL3NyYy9MYXllcnMvRHluYW1pY01hcExheWVyLmpzIiwiLi4vbm9kZV9tb2R1bGVzL2xlYWZsZXQtdmlydHVhbC1ncmlkL3NyYy92aXJ0dWFsLWdyaWQuanMiLCIuLi9ub2RlX21vZHVsZXMvdGlueS1iaW5hcnktc2VhcmNoL2luZGV4LmpzIiwiLi4vc3JjL0xheWVycy9GZWF0dXJlTGF5ZXIvRmVhdHVyZU1hbmFnZXIuanMiLCIuLi9zcmMvTGF5ZXJzL0ZlYXR1cmVMYXllci9GZWF0dXJlTGF5ZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsie1xuICBcIm5hbWVcIjogXCJlc3JpLWxlYWZsZXRcIixcbiAgXCJkZXNjcmlwdGlvblwiOiBcIkxlYWZsZXQgcGx1Z2lucyBmb3IgY29uc3VtaW5nIEFyY0dJUyBPbmxpbmUgYW5kIEFyY0dJUyBTZXJ2ZXIgc2VydmljZXMuXCIsXG4gIFwidmVyc2lvblwiOiBcIjIuMC40XCIsXG4gIFwiYXV0aG9yXCI6IFwiUGF0cmljayBBcmx0IDxwYXJsdEBlc3JpLmNvbT4gKGh0dHA6Ly9wYXRyaWNrYXJsdC5jb20pXCIsXG4gIFwiYnJvd3NlclwiOiBcImRpc3QvZXNyaS1sZWFmbGV0LWRlYnVnLmpzXCIsXG4gIFwiYnVnc1wiOiB7XG4gICAgXCJ1cmxcIjogXCJodHRwczovL2dpdGh1Yi5jb20vZXNyaS9lc3JpLWxlYWZsZXQvaXNzdWVzXCJcbiAgfSxcbiAgXCJjb250cmlidXRvcnNcIjogW1xuICAgIFwiUGF0cmljayBBcmx0IDxwYXJsdEBlc3JpLmNvbT4gKGh0dHA6Ly9wYXRyaWNrYXJsdC5jb20pXCIsXG4gICAgXCJKb2huIEdyYXZvaXMgPGpncmF2b2lzQGVzcmkuY29tPiAoaHR0cDovL2pvaG5ncmF2b2lzLmNvbSlcIlxuICBdLFxuICBcImRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJhcmNnaXMtdG8tZ2VvanNvbi11dGlsc1wiOiBcIl4xLjAuMVwiLFxuICAgIFwibGVhZmxldFwiOiBcIl4xLjAuMFwiLFxuICAgIFwibGVhZmxldC12aXJ0dWFsLWdyaWRcIjogXCJeMS4wLjNcIixcbiAgICBcInRpbnktYmluYXJ5LXNlYXJjaFwiOiBcIl4xLjAuMlwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImNoYWlcIjogXCIyLjMuMFwiLFxuICAgIFwiZ2gtcmVsZWFzZVwiOiBcIl4yLjAuMFwiLFxuICAgIFwiaGlnaGxpZ2h0LmpzXCI6IFwiXjguMC4wXCIsXG4gICAgXCJodHRwLXNlcnZlclwiOiBcIl4wLjguNVwiLFxuICAgIFwiaXNwYXJ0YVwiOiBcIl4zLjAuM1wiLFxuICAgIFwiaXN0YW5idWxcIjogXCJeMC40LjJcIixcbiAgICBcImthcm1hXCI6IFwiXjAuMTIuMTZcIixcbiAgICBcImthcm1hLWNoYWktc2lub25cIjogXCJeMC4xLjNcIixcbiAgICBcImthcm1hLWNvdmVyYWdlXCI6IFwiXjAuNS4zXCIsXG4gICAgXCJrYXJtYS1tb2NoYVwiOiBcIl4wLjEuMFwiLFxuICAgIFwia2FybWEtbW9jaGEtcmVwb3J0ZXJcIjogXCJeMC4yLjVcIixcbiAgICBcImthcm1hLXBoYW50b21qcy1sYXVuY2hlclwiOiBcIl4wLjIuMFwiLFxuICAgIFwia2FybWEtc291cmNlbWFwLWxvYWRlclwiOiBcIl4wLjMuNVwiLFxuICAgIFwibG9hZC1ncnVudC10YXNrc1wiOiBcIl4wLjQuMFwiLFxuICAgIFwibWtkaXJwXCI6IFwiXjAuNS4xXCIsXG4gICAgXCJtb2NoYVwiOiBcIl4yLjMuNFwiLFxuICAgIFwicGhhbnRvbWpzXCI6IFwiXjEuOS4xN1wiLFxuICAgIFwicm9sbHVwXCI6IFwiXjAuMjUuNFwiLFxuICAgIFwicm9sbHVwLXBsdWdpbi1qc29uXCI6IFwiXjIuMC4wXCIsXG4gICAgXCJyb2xsdXAtcGx1Z2luLW5vZGUtcmVzb2x2ZVwiOiBcIl4xLjQuMFwiLFxuICAgIFwicm9sbHVwLXBsdWdpbi11Z2xpZnlcIjogXCJeMC4zLjFcIixcbiAgICBcInNlbWlzdGFuZGFyZFwiOiBcIl44LjAuMFwiLFxuICAgIFwic2lub25cIjogXCJeMS4xMS4xXCIsXG4gICAgXCJzaW5vbi1jaGFpXCI6IFwiMi43LjBcIixcbiAgICBcInNuYXp6eVwiOiBcIl4yLjAuMVwiLFxuICAgIFwidWdsaWZ5LWpzXCI6IFwiXjIuNi4xXCIsXG4gICAgXCJ3YXRjaFwiOiBcIl4wLjE3LjFcIlxuICB9LFxuICBcImhvbWVwYWdlXCI6IFwiaHR0cDovL2VzcmkuZ2l0aHViLmlvL2VzcmktbGVhZmxldFwiLFxuICBcImpzbmV4dDptYWluXCI6IFwic3JjL0VzcmlMZWFmbGV0LmpzXCIsXG4gIFwianNwbVwiOiB7XG4gICAgXCJyZWdpc3RyeVwiOiBcIm5wbVwiLFxuICAgIFwiZm9ybWF0XCI6IFwiZXM2XCIsXG4gICAgXCJtYWluXCI6IFwic3JjL0VzcmlMZWFmbGV0LmpzXCJcbiAgfSxcbiAgXCJrZXl3b3Jkc1wiOiBbXG4gICAgXCJhcmNnaXNcIixcbiAgICBcImVzcmlcIixcbiAgICBcImVzcmkgbGVhZmxldFwiLFxuICAgIFwiZ2lzXCIsXG4gICAgXCJsZWFmbGV0IHBsdWdpblwiLFxuICAgIFwibWFwcGluZ1wiXG4gIF0sXG4gIFwibGljZW5zZVwiOiBcIkFwYWNoZS0yLjBcIixcbiAgXCJtYWluXCI6IFwiZGlzdC9lc3JpLWxlYWZsZXQtZGVidWcuanNcIixcbiAgXCJyZWFkbWVGaWxlbmFtZVwiOiBcIlJFQURNRS5tZFwiLFxuICBcInJlcG9zaXRvcnlcIjoge1xuICAgIFwidHlwZVwiOiBcImdpdFwiLFxuICAgIFwidXJsXCI6IFwiZ2l0QGdpdGh1Yi5jb206RXNyaS9lc3JpLWxlYWZsZXQuZ2l0XCJcbiAgfSxcbiAgXCJzY3JpcHRzXCI6IHtcbiAgICBcImJ1aWxkXCI6IFwicm9sbHVwIC1jIHByb2ZpbGVzL2RlYnVnLmpzICYgcm9sbHVwIC1jIHByb2ZpbGVzL3Byb2R1Y3Rpb24uanNcIixcbiAgICBcImxpbnRcIjogXCJzZW1pc3RhbmRhcmQgfCBzbmF6enlcIixcbiAgICBcInByZWJ1aWxkXCI6IFwibWtkaXJwIGRpc3RcIixcbiAgICBcInByZXB1Ymxpc2hcIjogXCJucG0gcnVuIGJ1aWxkXCIsXG4gICAgXCJwcmV0ZXN0XCI6IFwibnBtIHJ1biBidWlsZFwiLFxuICAgIFwicmVsZWFzZVwiOiBcIi4vc2NyaXB0cy9yZWxlYXNlLnNoXCIsXG4gICAgXCJzdGFydFwiOiBcIndhdGNoICducG0gcnVuIGJ1aWxkJyBzcmMgJiBodHRwLXNlcnZlciAtcCA1MDAwIC1jLTEgLW9cIixcbiAgICBcInRlc3RcIjogXCJucG0gcnVuIGxpbnQgJiYga2FybWEgc3RhcnRcIlxuICB9LFxuICBcInNlbWlzdGFuZGFyZFwiOiB7XG4gICAgXCJnbG9iYWxzXCI6IFsgXCJleHBlY3RcIiwgXCJMXCIsIFwiWE1MSHR0cFJlcXVlc3RcIiwgXCJzaW5vblwiLCBcInhoclwiIF1cbiAgfVxufVxuIiwiZXhwb3J0IHZhciBjb3JzID0gKCh3aW5kb3cuWE1MSHR0cFJlcXVlc3QgJiYgJ3dpdGhDcmVkZW50aWFscycgaW4gbmV3IHdpbmRvdy5YTUxIdHRwUmVxdWVzdCgpKSk7XG5leHBvcnQgdmFyIHBvaW50ZXJFdmVudHMgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUucG9pbnRlckV2ZW50cyA9PT0gJyc7XG5cbmV4cG9ydCB2YXIgU3VwcG9ydCA9IHtcbiAgY29yczogY29ycyxcbiAgcG9pbnRlckV2ZW50czogcG9pbnRlckV2ZW50c1xufTtcblxuZXhwb3J0IGRlZmF1bHQgU3VwcG9ydDtcbiIsImV4cG9ydCB2YXIgb3B0aW9ucyA9IHtcbiAgYXR0cmlidXRpb25XaWR0aE9mZnNldDogNTVcbn07XG5cbmV4cG9ydCBkZWZhdWx0IG9wdGlvbnM7XG4iLCJpbXBvcnQgTCBmcm9tICdsZWFmbGV0JztcbmltcG9ydCBTdXBwb3J0IGZyb20gJy4vU3VwcG9ydCc7XG5pbXBvcnQgeyB3YXJuIH0gZnJvbSAnLi9VdGlsJztcblxudmFyIGNhbGxiYWNrcyA9IDA7XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZSAocGFyYW1zKSB7XG4gIHZhciBkYXRhID0gJyc7XG5cbiAgcGFyYW1zLmYgPSBwYXJhbXMuZiB8fCAnanNvbic7XG5cbiAgZm9yICh2YXIga2V5IGluIHBhcmFtcykge1xuICAgIGlmIChwYXJhbXMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgdmFyIHBhcmFtID0gcGFyYW1zW2tleV07XG4gICAgICB2YXIgdHlwZSA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChwYXJhbSk7XG4gICAgICB2YXIgdmFsdWU7XG5cbiAgICAgIGlmIChkYXRhLmxlbmd0aCkge1xuICAgICAgICBkYXRhICs9ICcmJztcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGUgPT09ICdbb2JqZWN0IEFycmF5XScpIHtcbiAgICAgICAgdmFsdWUgPSAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHBhcmFtWzBdKSA9PT0gJ1tvYmplY3QgT2JqZWN0XScpID8gSlNPTi5zdHJpbmdpZnkocGFyYW0pIDogcGFyYW0uam9pbignLCcpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnW29iamVjdCBPYmplY3RdJykge1xuICAgICAgICB2YWx1ZSA9IEpTT04uc3RyaW5naWZ5KHBhcmFtKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ1tvYmplY3QgRGF0ZV0nKSB7XG4gICAgICAgIHZhbHVlID0gcGFyYW0udmFsdWVPZigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsdWUgPSBwYXJhbTtcbiAgICAgIH1cblxuICAgICAgZGF0YSArPSBlbmNvZGVVUklDb21wb25lbnQoa2V5KSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGRhdGE7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVJlcXVlc3QgKGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gIHZhciBodHRwUmVxdWVzdCA9IG5ldyB3aW5kb3cuWE1MSHR0cFJlcXVlc3QoKTtcblxuICBodHRwUmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24gKGUpIHtcbiAgICBodHRwUmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBMLlV0aWwuZmFsc2VGbjtcblxuICAgIGNhbGxiYWNrLmNhbGwoY29udGV4dCwge1xuICAgICAgZXJyb3I6IHtcbiAgICAgICAgY29kZTogNTAwLFxuICAgICAgICBtZXNzYWdlOiAnWE1MSHR0cFJlcXVlc3QgZXJyb3InXG4gICAgICB9XG4gICAgfSwgbnVsbCk7XG4gIH07XG5cbiAgaHR0cFJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciByZXNwb25zZTtcbiAgICB2YXIgZXJyb3I7XG5cbiAgICBpZiAoaHR0cFJlcXVlc3QucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzcG9uc2UgPSBKU09OLnBhcnNlKGh0dHBSZXF1ZXN0LnJlc3BvbnNlVGV4dCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJlc3BvbnNlID0gbnVsbDtcbiAgICAgICAgZXJyb3IgPSB7XG4gICAgICAgICAgY29kZTogNTAwLFxuICAgICAgICAgIG1lc3NhZ2U6ICdDb3VsZCBub3QgcGFyc2UgcmVzcG9uc2UgYXMgSlNPTi4gVGhpcyBjb3VsZCBhbHNvIGJlIGNhdXNlZCBieSBhIENPUlMgb3IgWE1MSHR0cFJlcXVlc3QgZXJyb3IuJ1xuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBpZiAoIWVycm9yICYmIHJlc3BvbnNlLmVycm9yKSB7XG4gICAgICAgIGVycm9yID0gcmVzcG9uc2UuZXJyb3I7XG4gICAgICAgIHJlc3BvbnNlID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgaHR0cFJlcXVlc3Qub25lcnJvciA9IEwuVXRpbC5mYWxzZUZuO1xuXG4gICAgICBjYWxsYmFjay5jYWxsKGNvbnRleHQsIGVycm9yLCByZXNwb25zZSk7XG4gICAgfVxuICB9O1xuXG4gIGh0dHBSZXF1ZXN0Lm9udGltZW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLm9uZXJyb3IoKTtcbiAgfTtcblxuICByZXR1cm4gaHR0cFJlcXVlc3Q7XG59XG5cbmZ1bmN0aW9uIHhtbEh0dHBQb3N0ICh1cmwsIHBhcmFtcywgY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgdmFyIGh0dHBSZXF1ZXN0ID0gY3JlYXRlUmVxdWVzdChjYWxsYmFjaywgY29udGV4dCk7XG4gIGh0dHBSZXF1ZXN0Lm9wZW4oJ1BPU1QnLCB1cmwpO1xuXG4gIGlmICh0eXBlb2YgY29udGV4dCAhPT0gJ3VuZGVmaW5lZCcgJiYgY29udGV4dCAhPT0gbnVsbCkge1xuICAgIGlmICh0eXBlb2YgY29udGV4dC5vcHRpb25zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgaHR0cFJlcXVlc3QudGltZW91dCA9IGNvbnRleHQub3B0aW9ucy50aW1lb3V0O1xuICAgIH1cbiAgfVxuICBodHRwUmVxdWVzdC5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyk7XG4gIGh0dHBSZXF1ZXN0LnNlbmQoc2VyaWFsaXplKHBhcmFtcykpO1xuXG4gIHJldHVybiBodHRwUmVxdWVzdDtcbn1cblxuZnVuY3Rpb24geG1sSHR0cEdldCAodXJsLCBwYXJhbXMsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gIHZhciBodHRwUmVxdWVzdCA9IGNyZWF0ZVJlcXVlc3QoY2FsbGJhY2ssIGNvbnRleHQpO1xuICBodHRwUmVxdWVzdC5vcGVuKCdHRVQnLCB1cmwgKyAnPycgKyBzZXJpYWxpemUocGFyYW1zKSwgdHJ1ZSk7XG5cbiAgaWYgKHR5cGVvZiBjb250ZXh0ICE9PSAndW5kZWZpbmVkJyAmJiBjb250ZXh0ICE9PSBudWxsKSB7XG4gICAgaWYgKHR5cGVvZiBjb250ZXh0Lm9wdGlvbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBodHRwUmVxdWVzdC50aW1lb3V0ID0gY29udGV4dC5vcHRpb25zLnRpbWVvdXQ7XG4gICAgfVxuICB9XG4gIGh0dHBSZXF1ZXN0LnNlbmQobnVsbCk7XG5cbiAgcmV0dXJuIGh0dHBSZXF1ZXN0O1xufVxuXG4vLyBBSkFYIGhhbmRsZXJzIGZvciBDT1JTIChtb2Rlcm4gYnJvd3NlcnMpIG9yIEpTT05QIChvbGRlciBicm93c2VycylcbmV4cG9ydCBmdW5jdGlvbiByZXF1ZXN0ICh1cmwsIHBhcmFtcywgY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgdmFyIHBhcmFtU3RyaW5nID0gc2VyaWFsaXplKHBhcmFtcyk7XG4gIHZhciBodHRwUmVxdWVzdCA9IGNyZWF0ZVJlcXVlc3QoY2FsbGJhY2ssIGNvbnRleHQpO1xuICB2YXIgcmVxdWVzdExlbmd0aCA9ICh1cmwgKyAnPycgKyBwYXJhbVN0cmluZykubGVuZ3RoO1xuXG4gIC8vIGdldCBhcm91bmQgaWUxMC8xMSBidWcgd2hpY2ggcmVxdWlyZXMgdGhhdCB0aGUgcmVxdWVzdCBiZSBvcGVuZWQgYmVmb3JlIGEgdGltZW91dCBpcyBhcHBsaWVkXG4gIGlmIChyZXF1ZXN0TGVuZ3RoIDw9IDIwMDAgJiYgU3VwcG9ydC5jb3JzKSB7XG4gICAgaHR0cFJlcXVlc3Qub3BlbignR0VUJywgdXJsICsgJz8nICsgcGFyYW1TdHJpbmcpO1xuICB9IGVsc2UgaWYgKHJlcXVlc3RMZW5ndGggPiAyMDAwICYmIFN1cHBvcnQuY29ycykge1xuICAgIGh0dHBSZXF1ZXN0Lm9wZW4oJ1BPU1QnLCB1cmwpO1xuICAgIGh0dHBSZXF1ZXN0LnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnKTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgY29udGV4dCAhPT0gJ3VuZGVmaW5lZCcgJiYgY29udGV4dCAhPT0gbnVsbCkge1xuICAgIGlmICh0eXBlb2YgY29udGV4dC5vcHRpb25zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgaHR0cFJlcXVlc3QudGltZW91dCA9IGNvbnRleHQub3B0aW9ucy50aW1lb3V0O1xuICAgIH1cbiAgfVxuXG4gIC8vIHJlcXVlc3QgaXMgbGVzcyB0aGVuIDIwMDAgY2hhcmFjdGVycyBhbmQgdGhlIGJyb3dzZXIgc3VwcG9ydHMgQ09SUywgbWFrZSBHRVQgcmVxdWVzdCB3aXRoIFhNTEh0dHBSZXF1ZXN0XG4gIGlmIChyZXF1ZXN0TGVuZ3RoIDw9IDIwMDAgJiYgU3VwcG9ydC5jb3JzKSB7XG4gICAgaHR0cFJlcXVlc3Quc2VuZChudWxsKTtcblxuICAvLyByZXF1ZXN0IGlzIGxlc3MgbW9yZSB0aGVuIDIwMDAgY2hhcmFjdGVycyBhbmQgdGhlIGJyb3dzZXIgc3VwcG9ydHMgQ09SUywgbWFrZSBQT1NUIHJlcXVlc3Qgd2l0aCBYTUxIdHRwUmVxdWVzdFxuICB9IGVsc2UgaWYgKHJlcXVlc3RMZW5ndGggPiAyMDAwICYmIFN1cHBvcnQuY29ycykge1xuICAgIGh0dHBSZXF1ZXN0LnNlbmQocGFyYW1TdHJpbmcpO1xuXG4gIC8vIHJlcXVlc3QgaXMgbGVzcyBtb3JlIHRoZW4gMjAwMCBjaGFyYWN0ZXJzIGFuZCB0aGUgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IENPUlMsIG1ha2UgYSBKU09OUCByZXF1ZXN0XG4gIH0gZWxzZSBpZiAocmVxdWVzdExlbmd0aCA8PSAyMDAwICYmICFTdXBwb3J0LmNvcnMpIHtcbiAgICByZXR1cm4ganNvbnAodXJsLCBwYXJhbXMsIGNhbGxiYWNrLCBjb250ZXh0KTtcblxuICAvLyByZXF1ZXN0IGlzIGxvbmdlciB0aGVuIDIwMDAgY2hhcmFjdGVycyBhbmQgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBDT1JTLCBsb2cgYSB3YXJuaW5nXG4gIH0gZWxzZSB7XG4gICAgd2FybignYSByZXF1ZXN0IHRvICcgKyB1cmwgKyAnIHdhcyBsb25nZXIgdGhlbiAyMDAwIGNoYXJhY3RlcnMgYW5kIHRoaXMgYnJvd3NlciBjYW5ub3QgbWFrZSBhIGNyb3NzLWRvbWFpbiBwb3N0IHJlcXVlc3QuIFBsZWFzZSB1c2UgYSBwcm94eSBodHRwOi8vZXNyaS5naXRodWIuaW8vZXNyaS1sZWFmbGV0L2FwaS1yZWZlcmVuY2UvcmVxdWVzdC5odG1sJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgcmV0dXJuIGh0dHBSZXF1ZXN0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24ganNvbnAgKHVybCwgcGFyYW1zLCBjYWxsYmFjaywgY29udGV4dCkge1xuICB3aW5kb3cuX0VzcmlMZWFmbGV0Q2FsbGJhY2tzID0gd2luZG93Ll9Fc3JpTGVhZmxldENhbGxiYWNrcyB8fCB7fTtcbiAgdmFyIGNhbGxiYWNrSWQgPSAnYycgKyBjYWxsYmFja3M7XG4gIHBhcmFtcy5jYWxsYmFjayA9ICd3aW5kb3cuX0VzcmlMZWFmbGV0Q2FsbGJhY2tzLicgKyBjYWxsYmFja0lkO1xuXG4gIHdpbmRvdy5fRXNyaUxlYWZsZXRDYWxsYmFja3NbY2FsbGJhY2tJZF0gPSBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICBpZiAod2luZG93Ll9Fc3JpTGVhZmxldENhbGxiYWNrc1tjYWxsYmFja0lkXSAhPT0gdHJ1ZSkge1xuICAgICAgdmFyIGVycm9yO1xuICAgICAgdmFyIHJlc3BvbnNlVHlwZSA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChyZXNwb25zZSk7XG5cbiAgICAgIGlmICghKHJlc3BvbnNlVHlwZSA9PT0gJ1tvYmplY3QgT2JqZWN0XScgfHwgcmVzcG9uc2VUeXBlID09PSAnW29iamVjdCBBcnJheV0nKSkge1xuICAgICAgICBlcnJvciA9IHtcbiAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgY29kZTogNTAwLFxuICAgICAgICAgICAgbWVzc2FnZTogJ0V4cGVjdGVkIGFycmF5IG9yIG9iamVjdCBhcyBKU09OUCByZXNwb25zZSdcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJlc3BvbnNlID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgaWYgKCFlcnJvciAmJiByZXNwb25zZS5lcnJvcikge1xuICAgICAgICBlcnJvciA9IHJlc3BvbnNlO1xuICAgICAgICByZXNwb25zZSA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNhbGxiYWNrLmNhbGwoY29udGV4dCwgZXJyb3IsIHJlc3BvbnNlKTtcbiAgICAgIHdpbmRvdy5fRXNyaUxlYWZsZXRDYWxsYmFja3NbY2FsbGJhY2tJZF0gPSB0cnVlO1xuICAgIH1cbiAgfTtcblxuICB2YXIgc2NyaXB0ID0gTC5Eb21VdGlsLmNyZWF0ZSgnc2NyaXB0JywgbnVsbCwgZG9jdW1lbnQuYm9keSk7XG4gIHNjcmlwdC50eXBlID0gJ3RleHQvamF2YXNjcmlwdCc7XG4gIHNjcmlwdC5zcmMgPSB1cmwgKyAnPycgKyBzZXJpYWxpemUocGFyYW1zKTtcbiAgc2NyaXB0LmlkID0gY2FsbGJhY2tJZDtcblxuICBjYWxsYmFja3MrKztcblxuICByZXR1cm4ge1xuICAgIGlkOiBjYWxsYmFja0lkLFxuICAgIHVybDogc2NyaXB0LnNyYyxcbiAgICBhYm9ydDogZnVuY3Rpb24gKCkge1xuICAgICAgd2luZG93Ll9Fc3JpTGVhZmxldENhbGxiYWNrcy5fY2FsbGJhY2tbY2FsbGJhY2tJZF0oe1xuICAgICAgICBjb2RlOiAwLFxuICAgICAgICBtZXNzYWdlOiAnUmVxdWVzdCBhYm9ydGVkLidcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn1cblxudmFyIGdldCA9ICgoU3VwcG9ydC5jb3JzKSA/IHhtbEh0dHBHZXQgOiBqc29ucCk7XG5nZXQuQ09SUyA9IHhtbEh0dHBHZXQ7XG5nZXQuSlNPTlAgPSBqc29ucDtcblxuLy8gY2hvb3NlIHRoZSBjb3JyZWN0IEFKQVggaGFuZGxlciBkZXBlbmRpbmcgb24gQ09SUyBzdXBwb3J0XG5leHBvcnQgeyBnZXQgfTtcblxuLy8gYWx3YXlzIHVzZSBYTUxIdHRwUmVxdWVzdCBmb3IgcG9zdHNcbmV4cG9ydCB7IHhtbEh0dHBQb3N0IGFzIHBvc3QgfTtcblxuLy8gZXhwb3J0IHRoZSBSZXF1ZXN0IG9iamVjdCB0byBjYWxsIHRoZSBkaWZmZXJlbnQgaGFuZGxlcnMgZm9yIGRlYnVnZ2luZ1xuZXhwb3J0IHZhciBSZXF1ZXN0ID0ge1xuICByZXF1ZXN0OiByZXF1ZXN0LFxuICBnZXQ6IGdldCxcbiAgcG9zdDogeG1sSHR0cFBvc3Rcbn07XG5cbmV4cG9ydCBkZWZhdWx0IFJlcXVlc3Q7XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTUgRXNyaVxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGlzY2Vuc2UuXG4gKi9cblxuLy8gY2hlY2tzIGlmIDIgeCx5IHBvaW50cyBhcmUgZXF1YWxcbmZ1bmN0aW9uIHBvaW50c0VxdWFsIChhLCBiKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgIGlmIChhW2ldICE9PSBiW2ldKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vLyBjaGVja3MgaWYgdGhlIGZpcnN0IGFuZCBsYXN0IHBvaW50cyBvZiBhIHJpbmcgYXJlIGVxdWFsIGFuZCBjbG9zZXMgdGhlIHJpbmdcbmZ1bmN0aW9uIGNsb3NlUmluZyAoY29vcmRpbmF0ZXMpIHtcbiAgaWYgKCFwb2ludHNFcXVhbChjb29yZGluYXRlc1swXSwgY29vcmRpbmF0ZXNbY29vcmRpbmF0ZXMubGVuZ3RoIC0gMV0pKSB7XG4gICAgY29vcmRpbmF0ZXMucHVzaChjb29yZGluYXRlc1swXSk7XG4gIH1cbiAgcmV0dXJuIGNvb3JkaW5hdGVzO1xufVxuXG4vLyBkZXRlcm1pbmUgaWYgcG9seWdvbiByaW5nIGNvb3JkaW5hdGVzIGFyZSBjbG9ja3dpc2UuIGNsb2Nrd2lzZSBzaWduaWZpZXMgb3V0ZXIgcmluZywgY291bnRlci1jbG9ja3dpc2UgYW4gaW5uZXIgcmluZ1xuLy8gb3IgaG9sZS4gdGhpcyBsb2dpYyB3YXMgZm91bmQgYXQgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMTY1NjQ3L2hvdy10by1kZXRlcm1pbmUtaWYtYS1saXN0LW9mLXBvbHlnb24tXG4vLyBwb2ludHMtYXJlLWluLWNsb2Nrd2lzZS1vcmRlclxuZnVuY3Rpb24gcmluZ0lzQ2xvY2t3aXNlIChyaW5nVG9UZXN0KSB7XG4gIHZhciB0b3RhbCA9IDA7XG4gIHZhciBpID0gMDtcbiAgdmFyIHJMZW5ndGggPSByaW5nVG9UZXN0Lmxlbmd0aDtcbiAgdmFyIHB0MSA9IHJpbmdUb1Rlc3RbaV07XG4gIHZhciBwdDI7XG4gIGZvciAoaTsgaSA8IHJMZW5ndGggLSAxOyBpKyspIHtcbiAgICBwdDIgPSByaW5nVG9UZXN0W2kgKyAxXTtcbiAgICB0b3RhbCArPSAocHQyWzBdIC0gcHQxWzBdKSAqIChwdDJbMV0gKyBwdDFbMV0pO1xuICAgIHB0MSA9IHB0MjtcbiAgfVxuICByZXR1cm4gKHRvdGFsID49IDApO1xufVxuXG4vLyBwb3J0ZWQgZnJvbSB0ZXJyYWZvcm1lci5qcyBodHRwczovL2dpdGh1Yi5jb20vRXNyaS9UZXJyYWZvcm1lci9ibG9iL21hc3Rlci90ZXJyYWZvcm1lci5qcyNMNTA0LUw1MTlcbmZ1bmN0aW9uIHZlcnRleEludGVyc2VjdHNWZXJ0ZXggKGExLCBhMiwgYjEsIGIyKSB7XG4gIHZhciB1YVQgPSAoYjJbMF0gLSBiMVswXSkgKiAoYTFbMV0gLSBiMVsxXSkgLSAoYjJbMV0gLSBiMVsxXSkgKiAoYTFbMF0gLSBiMVswXSk7XG4gIHZhciB1YlQgPSAoYTJbMF0gLSBhMVswXSkgKiAoYTFbMV0gLSBiMVsxXSkgLSAoYTJbMV0gLSBhMVsxXSkgKiAoYTFbMF0gLSBiMVswXSk7XG4gIHZhciB1QiA9IChiMlsxXSAtIGIxWzFdKSAqIChhMlswXSAtIGExWzBdKSAtIChiMlswXSAtIGIxWzBdKSAqIChhMlsxXSAtIGExWzFdKTtcblxuICBpZiAodUIgIT09IDApIHtcbiAgICB2YXIgdWEgPSB1YVQgLyB1QjtcbiAgICB2YXIgdWIgPSB1YlQgLyB1QjtcblxuICAgIGlmICh1YSA+PSAwICYmIHVhIDw9IDEgJiYgdWIgPj0gMCAmJiB1YiA8PSAxKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8vIHBvcnRlZCBmcm9tIHRlcnJhZm9ybWVyLmpzIGh0dHBzOi8vZ2l0aHViLmNvbS9Fc3JpL1RlcnJhZm9ybWVyL2Jsb2IvbWFzdGVyL3RlcnJhZm9ybWVyLmpzI0w1MjEtTDUzMVxuZnVuY3Rpb24gYXJyYXlJbnRlcnNlY3RzQXJyYXkgKGEsIGIpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhLmxlbmd0aCAtIDE7IGkrKykge1xuICAgIGZvciAodmFyIGogPSAwOyBqIDwgYi5sZW5ndGggLSAxOyBqKyspIHtcbiAgICAgIGlmICh2ZXJ0ZXhJbnRlcnNlY3RzVmVydGV4KGFbaV0sIGFbaSArIDFdLCBiW2pdLCBiW2ogKyAxXSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyBwb3J0ZWQgZnJvbSB0ZXJyYWZvcm1lci5qcyBodHRwczovL2dpdGh1Yi5jb20vRXNyaS9UZXJyYWZvcm1lci9ibG9iL21hc3Rlci90ZXJyYWZvcm1lci5qcyNMNDcwLUw0ODBcbmZ1bmN0aW9uIGNvb3JkaW5hdGVzQ29udGFpblBvaW50IChjb29yZGluYXRlcywgcG9pbnQpIHtcbiAgdmFyIGNvbnRhaW5zID0gZmFsc2U7XG4gIGZvciAodmFyIGkgPSAtMSwgbCA9IGNvb3JkaW5hdGVzLmxlbmd0aCwgaiA9IGwgLSAxOyArK2kgPCBsOyBqID0gaSkge1xuICAgIGlmICgoKGNvb3JkaW5hdGVzW2ldWzFdIDw9IHBvaW50WzFdICYmIHBvaW50WzFdIDwgY29vcmRpbmF0ZXNbal1bMV0pIHx8XG4gICAgICAgICAoY29vcmRpbmF0ZXNbal1bMV0gPD0gcG9pbnRbMV0gJiYgcG9pbnRbMV0gPCBjb29yZGluYXRlc1tpXVsxXSkpICYmXG4gICAgICAgIChwb2ludFswXSA8IChjb29yZGluYXRlc1tqXVswXSAtIGNvb3JkaW5hdGVzW2ldWzBdKSAqIChwb2ludFsxXSAtIGNvb3JkaW5hdGVzW2ldWzFdKSAvIChjb29yZGluYXRlc1tqXVsxXSAtIGNvb3JkaW5hdGVzW2ldWzFdKSArIGNvb3JkaW5hdGVzW2ldWzBdKSkge1xuICAgICAgY29udGFpbnMgPSAhY29udGFpbnM7XG4gICAgfVxuICB9XG4gIHJldHVybiBjb250YWlucztcbn1cblxuLy8gcG9ydGVkIGZyb20gdGVycmFmb3JtZXItYXJjZ2lzLXBhcnNlci5qcyBodHRwczovL2dpdGh1Yi5jb20vRXNyaS90ZXJyYWZvcm1lci1hcmNnaXMtcGFyc2VyL2Jsb2IvbWFzdGVyL3RlcnJhZm9ybWVyLWFyY2dpcy1wYXJzZXIuanMjTDEwNi1MMTEzXG5mdW5jdGlvbiBjb29yZGluYXRlc0NvbnRhaW5Db29yZGluYXRlcyAob3V0ZXIsIGlubmVyKSB7XG4gIHZhciBpbnRlcnNlY3RzID0gYXJyYXlJbnRlcnNlY3RzQXJyYXkob3V0ZXIsIGlubmVyKTtcbiAgdmFyIGNvbnRhaW5zID0gY29vcmRpbmF0ZXNDb250YWluUG9pbnQob3V0ZXIsIGlubmVyWzBdKTtcbiAgaWYgKCFpbnRlcnNlY3RzICYmIGNvbnRhaW5zKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyBkbyBhbnkgcG9seWdvbnMgaW4gdGhpcyBhcnJheSBjb250YWluIGFueSBvdGhlciBwb2x5Z29ucyBpbiB0aGlzIGFycmF5P1xuLy8gdXNlZCBmb3IgY2hlY2tpbmcgZm9yIGhvbGVzIGluIGFyY2dpcyByaW5nc1xuLy8gcG9ydGVkIGZyb20gdGVycmFmb3JtZXItYXJjZ2lzLXBhcnNlci5qcyBodHRwczovL2dpdGh1Yi5jb20vRXNyaS90ZXJyYWZvcm1lci1hcmNnaXMtcGFyc2VyL2Jsb2IvbWFzdGVyL3RlcnJhZm9ybWVyLWFyY2dpcy1wYXJzZXIuanMjTDExNy1MMTcyXG5mdW5jdGlvbiBjb252ZXJ0UmluZ3NUb0dlb0pTT04gKHJpbmdzKSB7XG4gIHZhciBvdXRlclJpbmdzID0gW107XG4gIHZhciBob2xlcyA9IFtdO1xuICB2YXIgeDsgLy8gaXRlcmF0b3JcbiAgdmFyIG91dGVyUmluZzsgLy8gY3VycmVudCBvdXRlciByaW5nIGJlaW5nIGV2YWx1YXRlZFxuICB2YXIgaG9sZTsgLy8gY3VycmVudCBob2xlIGJlaW5nIGV2YWx1YXRlZFxuXG4gIC8vIGZvciBlYWNoIHJpbmdcbiAgZm9yICh2YXIgciA9IDA7IHIgPCByaW5ncy5sZW5ndGg7IHIrKykge1xuICAgIHZhciByaW5nID0gY2xvc2VSaW5nKHJpbmdzW3JdLnNsaWNlKDApKTtcbiAgICBpZiAocmluZy5sZW5ndGggPCA0KSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgLy8gaXMgdGhpcyByaW5nIGFuIG91dGVyIHJpbmc/IGlzIGl0IGNsb2Nrd2lzZT9cbiAgICBpZiAocmluZ0lzQ2xvY2t3aXNlKHJpbmcpKSB7XG4gICAgICB2YXIgcG9seWdvbiA9IFsgcmluZyBdO1xuICAgICAgb3V0ZXJSaW5ncy5wdXNoKHBvbHlnb24pOyAvLyBwdXNoIHRvIG91dGVyIHJpbmdzXG4gICAgfSBlbHNlIHtcbiAgICAgIGhvbGVzLnB1c2gocmluZyk7IC8vIGNvdW50ZXJjbG9ja3dpc2UgcHVzaCB0byBob2xlc1xuICAgIH1cbiAgfVxuXG4gIHZhciB1bmNvbnRhaW5lZEhvbGVzID0gW107XG5cbiAgLy8gd2hpbGUgdGhlcmUgYXJlIGhvbGVzIGxlZnQuLi5cbiAgd2hpbGUgKGhvbGVzLmxlbmd0aCkge1xuICAgIC8vIHBvcCBhIGhvbGUgb2ZmIG91dCBzdGFja1xuICAgIGhvbGUgPSBob2xlcy5wb3AoKTtcblxuICAgIC8vIGxvb3Agb3ZlciBhbGwgb3V0ZXIgcmluZ3MgYW5kIHNlZSBpZiB0aGV5IGNvbnRhaW4gb3VyIGhvbGUuXG4gICAgdmFyIGNvbnRhaW5lZCA9IGZhbHNlO1xuICAgIGZvciAoeCA9IG91dGVyUmluZ3MubGVuZ3RoIC0gMTsgeCA+PSAwOyB4LS0pIHtcbiAgICAgIG91dGVyUmluZyA9IG91dGVyUmluZ3NbeF1bMF07XG4gICAgICBpZiAoY29vcmRpbmF0ZXNDb250YWluQ29vcmRpbmF0ZXMob3V0ZXJSaW5nLCBob2xlKSkge1xuICAgICAgICAvLyB0aGUgaG9sZSBpcyBjb250YWluZWQgcHVzaCBpdCBpbnRvIG91ciBwb2x5Z29uXG4gICAgICAgIG91dGVyUmluZ3NbeF0ucHVzaChob2xlKTtcbiAgICAgICAgY29udGFpbmVkID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gcmluZyBpcyBub3QgY29udGFpbmVkIGluIGFueSBvdXRlciByaW5nXG4gICAgLy8gc29tZXRpbWVzIHRoaXMgaGFwcGVucyBodHRwczovL2dpdGh1Yi5jb20vRXNyaS9lc3JpLWxlYWZsZXQvaXNzdWVzLzMyMFxuICAgIGlmICghY29udGFpbmVkKSB7XG4gICAgICB1bmNvbnRhaW5lZEhvbGVzLnB1c2goaG9sZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgd2UgY291bGRuJ3QgbWF0Y2ggYW55IGhvbGVzIHVzaW5nIGNvbnRhaW5zIHdlIGNhbiB0cnkgaW50ZXJzZWN0cy4uLlxuICB3aGlsZSAodW5jb250YWluZWRIb2xlcy5sZW5ndGgpIHtcbiAgICAvLyBwb3AgYSBob2xlIG9mZiBvdXQgc3RhY2tcbiAgICBob2xlID0gdW5jb250YWluZWRIb2xlcy5wb3AoKTtcblxuICAgIC8vIGxvb3Agb3ZlciBhbGwgb3V0ZXIgcmluZ3MgYW5kIHNlZSBpZiBhbnkgaW50ZXJzZWN0IG91ciBob2xlLlxuICAgIHZhciBpbnRlcnNlY3RzID0gZmFsc2U7XG5cbiAgICBmb3IgKHggPSBvdXRlclJpbmdzLmxlbmd0aCAtIDE7IHggPj0gMDsgeC0tKSB7XG4gICAgICBvdXRlclJpbmcgPSBvdXRlclJpbmdzW3hdWzBdO1xuICAgICAgaWYgKGFycmF5SW50ZXJzZWN0c0FycmF5KG91dGVyUmluZywgaG9sZSkpIHtcbiAgICAgICAgLy8gdGhlIGhvbGUgaXMgY29udGFpbmVkIHB1c2ggaXQgaW50byBvdXIgcG9seWdvblxuICAgICAgICBvdXRlclJpbmdzW3hdLnB1c2goaG9sZSk7XG4gICAgICAgIGludGVyc2VjdHMgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIWludGVyc2VjdHMpIHtcbiAgICAgIG91dGVyUmluZ3MucHVzaChbaG9sZS5yZXZlcnNlKCldKTtcbiAgICB9XG4gIH1cblxuICBpZiAob3V0ZXJSaW5ncy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogJ1BvbHlnb24nLFxuICAgICAgY29vcmRpbmF0ZXM6IG91dGVyUmluZ3NbMF1cbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnTXVsdGlQb2x5Z29uJyxcbiAgICAgIGNvb3JkaW5hdGVzOiBvdXRlclJpbmdzXG4gICAgfTtcbiAgfVxufVxuXG4vLyBUaGlzIGZ1bmN0aW9uIGVuc3VyZXMgdGhhdCByaW5ncyBhcmUgb3JpZW50ZWQgaW4gdGhlIHJpZ2h0IGRpcmVjdGlvbnNcbi8vIG91dGVyIHJpbmdzIGFyZSBjbG9ja3dpc2UsIGhvbGVzIGFyZSBjb3VudGVyY2xvY2t3aXNlXG4vLyB1c2VkIGZvciBjb252ZXJ0aW5nIEdlb0pTT04gUG9seWdvbnMgdG8gQXJjR0lTIFBvbHlnb25zXG5mdW5jdGlvbiBvcmllbnRSaW5ncyAocG9seSkge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIHZhciBwb2x5Z29uID0gcG9seS5zbGljZSgwKTtcbiAgdmFyIG91dGVyUmluZyA9IGNsb3NlUmluZyhwb2x5Z29uLnNoaWZ0KCkuc2xpY2UoMCkpO1xuICBpZiAob3V0ZXJSaW5nLmxlbmd0aCA+PSA0KSB7XG4gICAgaWYgKCFyaW5nSXNDbG9ja3dpc2Uob3V0ZXJSaW5nKSkge1xuICAgICAgb3V0ZXJSaW5nLnJldmVyc2UoKTtcbiAgICB9XG5cbiAgICBvdXRwdXQucHVzaChvdXRlclJpbmcpO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwb2x5Z29uLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgaG9sZSA9IGNsb3NlUmluZyhwb2x5Z29uW2ldLnNsaWNlKDApKTtcbiAgICAgIGlmIChob2xlLmxlbmd0aCA+PSA0KSB7XG4gICAgICAgIGlmIChyaW5nSXNDbG9ja3dpc2UoaG9sZSkpIHtcbiAgICAgICAgICBob2xlLnJldmVyc2UoKTtcbiAgICAgICAgfVxuICAgICAgICBvdXRwdXQucHVzaChob2xlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gb3V0cHV0O1xufVxuXG4vLyBUaGlzIGZ1bmN0aW9uIGZsYXR0ZW5zIGhvbGVzIGluIG11bHRpcG9seWdvbnMgdG8gb25lIGFycmF5IG9mIHBvbHlnb25zXG4vLyB1c2VkIGZvciBjb252ZXJ0aW5nIEdlb0pTT04gUG9seWdvbnMgdG8gQXJjR0lTIFBvbHlnb25zXG5mdW5jdGlvbiBmbGF0dGVuTXVsdGlQb2x5Z29uUmluZ3MgKHJpbmdzKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByaW5ncy5sZW5ndGg7IGkrKykge1xuICAgIHZhciBwb2x5Z29uID0gb3JpZW50UmluZ3MocmluZ3NbaV0pO1xuICAgIGZvciAodmFyIHggPSBwb2x5Z29uLmxlbmd0aCAtIDE7IHggPj0gMDsgeC0tKSB7XG4gICAgICB2YXIgcmluZyA9IHBvbHlnb25beF0uc2xpY2UoMCk7XG4gICAgICBvdXRwdXQucHVzaChyaW5nKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuLy8gc2hhbGxvdyBvYmplY3QgY2xvbmUgZm9yIGZlYXR1cmUgcHJvcGVydGllcyBhbmQgYXR0cmlidXRlc1xuLy8gZnJvbSBodHRwOi8vanNwZXJmLmNvbS9jbG9uaW5nLWFuLW9iamVjdC8yXG5mdW5jdGlvbiBzaGFsbG93Q2xvbmUgKG9iaikge1xuICB2YXIgdGFyZ2V0ID0ge307XG4gIGZvciAodmFyIGkgaW4gb2JqKSB7XG4gICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgdGFyZ2V0W2ldID0gb2JqW2ldO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdGFyZ2V0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXJjZ2lzVG9HZW9KU09OIChhcmNnaXMsIGlkQXR0cmlidXRlKSB7XG4gIHZhciBnZW9qc29uID0ge307XG5cbiAgaWYgKHR5cGVvZiBhcmNnaXMueCA9PT0gJ251bWJlcicgJiYgdHlwZW9mIGFyY2dpcy55ID09PSAnbnVtYmVyJykge1xuICAgIGdlb2pzb24udHlwZSA9ICdQb2ludCc7XG4gICAgZ2VvanNvbi5jb29yZGluYXRlcyA9IFthcmNnaXMueCwgYXJjZ2lzLnldO1xuICB9XG5cbiAgaWYgKGFyY2dpcy5wb2ludHMpIHtcbiAgICBnZW9qc29uLnR5cGUgPSAnTXVsdGlQb2ludCc7XG4gICAgZ2VvanNvbi5jb29yZGluYXRlcyA9IGFyY2dpcy5wb2ludHMuc2xpY2UoMCk7XG4gIH1cblxuICBpZiAoYXJjZ2lzLnBhdGhzKSB7XG4gICAgaWYgKGFyY2dpcy5wYXRocy5sZW5ndGggPT09IDEpIHtcbiAgICAgIGdlb2pzb24udHlwZSA9ICdMaW5lU3RyaW5nJztcbiAgICAgIGdlb2pzb24uY29vcmRpbmF0ZXMgPSBhcmNnaXMucGF0aHNbMF0uc2xpY2UoMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGdlb2pzb24udHlwZSA9ICdNdWx0aUxpbmVTdHJpbmcnO1xuICAgICAgZ2VvanNvbi5jb29yZGluYXRlcyA9IGFyY2dpcy5wYXRocy5zbGljZSgwKTtcbiAgICB9XG4gIH1cblxuICBpZiAoYXJjZ2lzLnJpbmdzKSB7XG4gICAgZ2VvanNvbiA9IGNvbnZlcnRSaW5nc1RvR2VvSlNPTihhcmNnaXMucmluZ3Muc2xpY2UoMCkpO1xuICB9XG5cbiAgaWYgKGFyY2dpcy5nZW9tZXRyeSB8fCBhcmNnaXMuYXR0cmlidXRlcykge1xuICAgIGdlb2pzb24udHlwZSA9ICdGZWF0dXJlJztcbiAgICBnZW9qc29uLmdlb21ldHJ5ID0gKGFyY2dpcy5nZW9tZXRyeSkgPyBhcmNnaXNUb0dlb0pTT04oYXJjZ2lzLmdlb21ldHJ5KSA6IG51bGw7XG4gICAgZ2VvanNvbi5wcm9wZXJ0aWVzID0gKGFyY2dpcy5hdHRyaWJ1dGVzKSA/IHNoYWxsb3dDbG9uZShhcmNnaXMuYXR0cmlidXRlcykgOiBudWxsO1xuICAgIGlmIChhcmNnaXMuYXR0cmlidXRlcykge1xuICAgICAgZ2VvanNvbi5pZCA9IGFyY2dpcy5hdHRyaWJ1dGVzW2lkQXR0cmlidXRlXSB8fCBhcmNnaXMuYXR0cmlidXRlcy5PQkpFQ1RJRCB8fCBhcmNnaXMuYXR0cmlidXRlcy5GSUQ7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGdlb2pzb247XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW9qc29uVG9BcmNHSVMgKGdlb2pzb24sIGlkQXR0cmlidXRlKSB7XG4gIGlkQXR0cmlidXRlID0gaWRBdHRyaWJ1dGUgfHwgJ09CSkVDVElEJztcbiAgdmFyIHNwYXRpYWxSZWZlcmVuY2UgPSB7IHdraWQ6IDQzMjYgfTtcbiAgdmFyIHJlc3VsdCA9IHt9O1xuICB2YXIgaTtcblxuICBzd2l0Y2ggKGdlb2pzb24udHlwZSkge1xuICAgIGNhc2UgJ1BvaW50JzpcbiAgICAgIHJlc3VsdC54ID0gZ2VvanNvbi5jb29yZGluYXRlc1swXTtcbiAgICAgIHJlc3VsdC55ID0gZ2VvanNvbi5jb29yZGluYXRlc1sxXTtcbiAgICAgIHJlc3VsdC5zcGF0aWFsUmVmZXJlbmNlID0gc3BhdGlhbFJlZmVyZW5jZTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ011bHRpUG9pbnQnOlxuICAgICAgcmVzdWx0LnBvaW50cyA9IGdlb2pzb24uY29vcmRpbmF0ZXMuc2xpY2UoMCk7XG4gICAgICByZXN1bHQuc3BhdGlhbFJlZmVyZW5jZSA9IHNwYXRpYWxSZWZlcmVuY2U7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdMaW5lU3RyaW5nJzpcbiAgICAgIHJlc3VsdC5wYXRocyA9IFtnZW9qc29uLmNvb3JkaW5hdGVzLnNsaWNlKDApXTtcbiAgICAgIHJlc3VsdC5zcGF0aWFsUmVmZXJlbmNlID0gc3BhdGlhbFJlZmVyZW5jZTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ011bHRpTGluZVN0cmluZyc6XG4gICAgICByZXN1bHQucGF0aHMgPSBnZW9qc29uLmNvb3JkaW5hdGVzLnNsaWNlKDApO1xuICAgICAgcmVzdWx0LnNwYXRpYWxSZWZlcmVuY2UgPSBzcGF0aWFsUmVmZXJlbmNlO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnUG9seWdvbic6XG4gICAgICByZXN1bHQucmluZ3MgPSBvcmllbnRSaW5ncyhnZW9qc29uLmNvb3JkaW5hdGVzLnNsaWNlKDApKTtcbiAgICAgIHJlc3VsdC5zcGF0aWFsUmVmZXJlbmNlID0gc3BhdGlhbFJlZmVyZW5jZTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ011bHRpUG9seWdvbic6XG4gICAgICByZXN1bHQucmluZ3MgPSBmbGF0dGVuTXVsdGlQb2x5Z29uUmluZ3MoZ2VvanNvbi5jb29yZGluYXRlcy5zbGljZSgwKSk7XG4gICAgICByZXN1bHQuc3BhdGlhbFJlZmVyZW5jZSA9IHNwYXRpYWxSZWZlcmVuY2U7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdGZWF0dXJlJzpcbiAgICAgIGlmIChnZW9qc29uLmdlb21ldHJ5KSB7XG4gICAgICAgIHJlc3VsdC5nZW9tZXRyeSA9IGdlb2pzb25Ub0FyY0dJUyhnZW9qc29uLmdlb21ldHJ5LCBpZEF0dHJpYnV0ZSk7XG4gICAgICB9XG4gICAgICByZXN1bHQuYXR0cmlidXRlcyA9IChnZW9qc29uLnByb3BlcnRpZXMpID8gc2hhbGxvd0Nsb25lKGdlb2pzb24ucHJvcGVydGllcykgOiB7fTtcbiAgICAgIGlmIChnZW9qc29uLmlkKSB7XG4gICAgICAgIHJlc3VsdC5hdHRyaWJ1dGVzW2lkQXR0cmlidXRlXSA9IGdlb2pzb24uaWQ7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdGZWF0dXJlQ29sbGVjdGlvbic6XG4gICAgICByZXN1bHQgPSBbXTtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBnZW9qc29uLmZlYXR1cmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGdlb2pzb25Ub0FyY0dJUyhnZW9qc29uLmZlYXR1cmVzW2ldLCBpZEF0dHJpYnV0ZSkpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnR2VvbWV0cnlDb2xsZWN0aW9uJzpcbiAgICAgIHJlc3VsdCA9IFtdO1xuICAgICAgZm9yIChpID0gMDsgaSA8IGdlb2pzb24uZ2VvbWV0cmllcy5sZW5ndGg7IGkrKykge1xuICAgICAgICByZXN1bHQucHVzaChnZW9qc29uVG9BcmNHSVMoZ2VvanNvbi5nZW9tZXRyaWVzW2ldLCBpZEF0dHJpYnV0ZSkpO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuIiwiaW1wb3J0IEwgZnJvbSAnbGVhZmxldCc7XG5pbXBvcnQgeyBqc29ucCB9IGZyb20gJy4vUmVxdWVzdCc7XG5pbXBvcnQgeyBvcHRpb25zIH0gZnJvbSAnLi9PcHRpb25zJztcblxuaW1wb3J0IHtcbiAgZ2VvanNvblRvQXJjR0lTIGFzIGcyYSxcbiAgYXJjZ2lzVG9HZW9KU09OIGFzIGEyZ1xufSBmcm9tICdhcmNnaXMtdG8tZ2VvanNvbi11dGlscyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW9qc29uVG9BcmNHSVMgKGdlb2pzb24sIGlkQXR0cikge1xuICByZXR1cm4gZzJhKGdlb2pzb24sIGlkQXR0cik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhcmNnaXNUb0dlb0pTT04gKGFyY2dpcywgaWRBdHRyKSB7XG4gIHJldHVybiBhMmcoYXJjZ2lzLCBpZEF0dHIpO1xufVxuXG4vLyBzaGFsbG93IG9iamVjdCBjbG9uZSBmb3IgZmVhdHVyZSBwcm9wZXJ0aWVzIGFuZCBhdHRyaWJ1dGVzXG4vLyBmcm9tIGh0dHA6Ly9qc3BlcmYuY29tL2Nsb25pbmctYW4tb2JqZWN0LzJcbmV4cG9ydCBmdW5jdGlvbiBzaGFsbG93Q2xvbmUgKG9iaikge1xuICB2YXIgdGFyZ2V0ID0ge307XG4gIGZvciAodmFyIGkgaW4gb2JqKSB7XG4gICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgdGFyZ2V0W2ldID0gb2JqW2ldO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdGFyZ2V0O1xufVxuXG4vLyBjb252ZXJ0IGFuIGV4dGVudCAoQXJjR0lTKSB0byBMYXRMbmdCb3VuZHMgKExlYWZsZXQpXG5leHBvcnQgZnVuY3Rpb24gZXh0ZW50VG9Cb3VuZHMgKGV4dGVudCkge1xuICB2YXIgc3cgPSBMLmxhdExuZyhleHRlbnQueW1pbiwgZXh0ZW50LnhtaW4pO1xuICB2YXIgbmUgPSBMLmxhdExuZyhleHRlbnQueW1heCwgZXh0ZW50LnhtYXgpO1xuICByZXR1cm4gTC5sYXRMbmdCb3VuZHMoc3csIG5lKTtcbn1cblxuLy8gY29udmVydCBhbiBMYXRMbmdCb3VuZHMgKExlYWZsZXQpIHRvIGV4dGVudCAoQXJjR0lTKVxuZXhwb3J0IGZ1bmN0aW9uIGJvdW5kc1RvRXh0ZW50IChib3VuZHMpIHtcbiAgYm91bmRzID0gTC5sYXRMbmdCb3VuZHMoYm91bmRzKTtcbiAgcmV0dXJuIHtcbiAgICAneG1pbic6IGJvdW5kcy5nZXRTb3V0aFdlc3QoKS5sbmcsXG4gICAgJ3ltaW4nOiBib3VuZHMuZ2V0U291dGhXZXN0KCkubGF0LFxuICAgICd4bWF4JzogYm91bmRzLmdldE5vcnRoRWFzdCgpLmxuZyxcbiAgICAneW1heCc6IGJvdW5kcy5nZXROb3J0aEVhc3QoKS5sYXQsXG4gICAgJ3NwYXRpYWxSZWZlcmVuY2UnOiB7XG4gICAgICAnd2tpZCc6IDQzMjZcbiAgICB9XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNwb25zZVRvRmVhdHVyZUNvbGxlY3Rpb24gKHJlc3BvbnNlLCBpZEF0dHJpYnV0ZSkge1xuICB2YXIgb2JqZWN0SWRGaWVsZDtcbiAgdmFyIGZlYXR1cmVzID0gcmVzcG9uc2UuZmVhdHVyZXMgfHwgcmVzcG9uc2UucmVzdWx0cztcbiAgdmFyIGNvdW50ID0gZmVhdHVyZXMubGVuZ3RoO1xuXG4gIGlmIChpZEF0dHJpYnV0ZSkge1xuICAgIG9iamVjdElkRmllbGQgPSBpZEF0dHJpYnV0ZTtcbiAgfSBlbHNlIGlmIChyZXNwb25zZS5vYmplY3RJZEZpZWxkTmFtZSkge1xuICAgIG9iamVjdElkRmllbGQgPSByZXNwb25zZS5vYmplY3RJZEZpZWxkTmFtZTtcbiAgfSBlbHNlIGlmIChyZXNwb25zZS5maWVsZHMpIHtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8PSByZXNwb25zZS5maWVsZHMubGVuZ3RoIC0gMTsgaisrKSB7XG4gICAgICBpZiAocmVzcG9uc2UuZmllbGRzW2pdLnR5cGUgPT09ICdlc3JpRmllbGRUeXBlT0lEJykge1xuICAgICAgICBvYmplY3RJZEZpZWxkID0gcmVzcG9uc2UuZmllbGRzW2pdLm5hbWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIGlmIChjb3VudCkge1xuICAgIC8qIGFzIGEgbGFzdCByZXNvcnQsIGNoZWNrIGZvciBjb21tb24gSUQgZmllbGRuYW1lcyBpbiB0aGUgZmlyc3QgZmVhdHVyZSByZXR1cm5lZFxuICAgIG5vdCBmb29scHJvb2YuIGlkZW50aWZ5RmVhdHVyZXMgY2FuIHJldHVybmVkIGEgbWl4ZWQgYXJyYXkgb2YgZmVhdHVyZXMuICovXG4gICAgZm9yICh2YXIga2V5IGluIGZlYXR1cmVzWzBdLmF0dHJpYnV0ZXMpIHtcbiAgICAgIGlmIChrZXkubWF0Y2goL14oT0JKRUNUSUR8RklEfE9JRHxJRCkkL2kpKSB7XG4gICAgICAgIG9iamVjdElkRmllbGQgPSBrZXk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHZhciBmZWF0dXJlQ29sbGVjdGlvbiA9IHtcbiAgICB0eXBlOiAnRmVhdHVyZUNvbGxlY3Rpb24nLFxuICAgIGZlYXR1cmVzOiBbXVxuICB9O1xuXG4gIGlmIChjb3VudCkge1xuICAgIGZvciAodmFyIGkgPSBmZWF0dXJlcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgdmFyIGZlYXR1cmUgPSBhcmNnaXNUb0dlb0pTT04oZmVhdHVyZXNbaV0sIG9iamVjdElkRmllbGQpO1xuICAgICAgZmVhdHVyZUNvbGxlY3Rpb24uZmVhdHVyZXMucHVzaChmZWF0dXJlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmVhdHVyZUNvbGxlY3Rpb247XG59XG5cbiAgLy8gdHJpbSB1cmwgd2hpdGVzcGFjZSBhbmQgYWRkIGEgdHJhaWxpbmcgc2xhc2ggaWYgbmVlZGVkXG5leHBvcnQgZnVuY3Rpb24gY2xlYW5VcmwgKHVybCkge1xuICAvLyB0cmltIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHNwYWNlcywgYnV0IG5vdCBzcGFjZXMgaW5zaWRlIHRoZSB1cmxcbiAgdXJsID0gTC5VdGlsLnRyaW0odXJsKTtcblxuICAvLyBhZGQgYSB0cmFpbGluZyBzbGFzaCB0byB0aGUgdXJsIGlmIHRoZSB1c2VyIG9taXR0ZWQgaXRcbiAgaWYgKHVybFt1cmwubGVuZ3RoIC0gMV0gIT09ICcvJykge1xuICAgIHVybCArPSAnLyc7XG4gIH1cblxuICByZXR1cm4gdXJsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNBcmNnaXNPbmxpbmUgKHVybCkge1xuICAvKiBob3N0ZWQgZmVhdHVyZSBzZXJ2aWNlcyBjYW4gZW1pdCBnZW9qc29uIG5hdGl2ZWx5LiAqL1xuICByZXR1cm4gKC9cXC5hcmNnaXNcXC5jb20uKj9GZWF0dXJlU2VydmVyL2cpLnRlc3QodXJsKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdlb2pzb25UeXBlVG9BcmNHSVMgKGdlb0pzb25UeXBlKSB7XG4gIHZhciBhcmNnaXNHZW9tZXRyeVR5cGU7XG4gIHN3aXRjaCAoZ2VvSnNvblR5cGUpIHtcbiAgICBjYXNlICdQb2ludCc6XG4gICAgICBhcmNnaXNHZW9tZXRyeVR5cGUgPSAnZXNyaUdlb21ldHJ5UG9pbnQnO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnTXVsdGlQb2ludCc6XG4gICAgICBhcmNnaXNHZW9tZXRyeVR5cGUgPSAnZXNyaUdlb21ldHJ5TXVsdGlwb2ludCc7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdMaW5lU3RyaW5nJzpcbiAgICAgIGFyY2dpc0dlb21ldHJ5VHlwZSA9ICdlc3JpR2VvbWV0cnlQb2x5bGluZSc7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdNdWx0aUxpbmVTdHJpbmcnOlxuICAgICAgYXJjZ2lzR2VvbWV0cnlUeXBlID0gJ2VzcmlHZW9tZXRyeVBvbHlsaW5lJztcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ1BvbHlnb24nOlxuICAgICAgYXJjZ2lzR2VvbWV0cnlUeXBlID0gJ2VzcmlHZW9tZXRyeVBvbHlnb24nO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnTXVsdGlQb2x5Z29uJzpcbiAgICAgIGFyY2dpc0dlb21ldHJ5VHlwZSA9ICdlc3JpR2VvbWV0cnlQb2x5Z29uJztcbiAgICAgIGJyZWFrO1xuICB9XG5cbiAgcmV0dXJuIGFyY2dpc0dlb21ldHJ5VHlwZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdhcm4gKCkge1xuICBpZiAoY29uc29sZSAmJiBjb25zb2xlLndhcm4pIHtcbiAgICBjb25zb2xlLndhcm4uYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY2FsY0F0dHJpYnV0aW9uV2lkdGggKG1hcCkge1xuICAvLyBlaXRoZXIgY3JvcCBhdCA1NXB4IG9yIHVzZXIgZGVmaW5lZCBidWZmZXJcbiAgcmV0dXJuIChtYXAuZ2V0U2l6ZSgpLnggLSBvcHRpb25zLmF0dHJpYnV0aW9uV2lkdGhPZmZzZXQpICsgJ3B4Jztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldEVzcmlBdHRyaWJ1dGlvbiAobWFwKSB7XG4gIGlmIChtYXAuYXR0cmlidXRpb25Db250cm9sICYmICFtYXAuYXR0cmlidXRpb25Db250cm9sLl9lc3JpQXR0cmlidXRpb25BZGRlZCkge1xuICAgIG1hcC5hdHRyaWJ1dGlvbkNvbnRyb2wuc2V0UHJlZml4KCc8YSBocmVmPVwiaHR0cDovL2xlYWZsZXRqcy5jb21cIiB0aXRsZT1cIkEgSlMgbGlicmFyeSBmb3IgaW50ZXJhY3RpdmUgbWFwc1wiPkxlYWZsZXQ8L2E+IHwgUG93ZXJlZCBieSA8YSBocmVmPVwiaHR0cHM6Ly93d3cuZXNyaS5jb21cIj5Fc3JpPC9hPicpO1xuXG4gICAgdmFyIGhvdmVyQXR0cmlidXRpb25TdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgaG92ZXJBdHRyaWJ1dGlvblN0eWxlLnR5cGUgPSAndGV4dC9jc3MnO1xuICAgIGhvdmVyQXR0cmlidXRpb25TdHlsZS5pbm5lckhUTUwgPSAnLmVzcmktdHJ1bmNhdGVkLWF0dHJpYnV0aW9uOmhvdmVyIHsnICtcbiAgICAgICd3aGl0ZS1zcGFjZTogbm9ybWFsOycgK1xuICAgICd9JztcblxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0uYXBwZW5kQ2hpbGQoaG92ZXJBdHRyaWJ1dGlvblN0eWxlKTtcbiAgICBMLkRvbVV0aWwuYWRkQ2xhc3MobWFwLmF0dHJpYnV0aW9uQ29udHJvbC5fY29udGFpbmVyLCAnZXNyaS10cnVuY2F0ZWQtYXR0cmlidXRpb246aG92ZXInKTtcblxuICAgIC8vIGRlZmluZSBhIG5ldyBjc3MgY2xhc3MgaW4gSlMgdG8gdHJpbSBhdHRyaWJ1dGlvbiBpbnRvIGEgc2luZ2xlIGxpbmVcbiAgICB2YXIgYXR0cmlidXRpb25TdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgYXR0cmlidXRpb25TdHlsZS50eXBlID0gJ3RleHQvY3NzJztcbiAgICBhdHRyaWJ1dGlvblN0eWxlLmlubmVySFRNTCA9ICcuZXNyaS10cnVuY2F0ZWQtYXR0cmlidXRpb24geycgK1xuICAgICAgJ3ZlcnRpY2FsLWFsaWduOiAtM3B4OycgK1xuICAgICAgJ3doaXRlLXNwYWNlOiBub3dyYXA7JyArXG4gICAgICAnb3ZlcmZsb3c6IGhpZGRlbjsnICtcbiAgICAgICd0ZXh0LW92ZXJmbG93OiBlbGxpcHNpczsnICtcbiAgICAgICdkaXNwbGF5OiBpbmxpbmUtYmxvY2s7JyArXG4gICAgICAndHJhbnNpdGlvbjogMHMgd2hpdGUtc3BhY2U7JyArXG4gICAgICAndHJhbnNpdGlvbi1kZWxheTogMXM7JyArXG4gICAgICAnbWF4LXdpZHRoOiAnICsgY2FsY0F0dHJpYnV0aW9uV2lkdGgobWFwKSArICc7JyArXG4gICAgJ30nO1xuXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChhdHRyaWJ1dGlvblN0eWxlKTtcbiAgICBMLkRvbVV0aWwuYWRkQ2xhc3MobWFwLmF0dHJpYnV0aW9uQ29udHJvbC5fY29udGFpbmVyLCAnZXNyaS10cnVuY2F0ZWQtYXR0cmlidXRpb24nKTtcblxuICAgIC8vIHVwZGF0ZSB0aGUgd2lkdGggdXNlZCB0byB0cnVuY2F0ZSB3aGVuIHRoZSBtYXAgaXRzZWxmIGlzIHJlc2l6ZWRcbiAgICBtYXAub24oJ3Jlc2l6ZScsIGZ1bmN0aW9uIChlKSB7XG4gICAgICBtYXAuYXR0cmlidXRpb25Db250cm9sLl9jb250YWluZXIuc3R5bGUubWF4V2lkdGggPSBjYWxjQXR0cmlidXRpb25XaWR0aChlLnRhcmdldCk7XG4gICAgfSk7XG5cbiAgICBtYXAuYXR0cmlidXRpb25Db250cm9sLl9lc3JpQXR0cmlidXRpb25BZGRlZCA9IHRydWU7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIF9nZXRBdHRyaWJ1dGlvbkRhdGEgKHVybCwgbWFwKSB7XG4gIGpzb25wKHVybCwge30sIEwuVXRpbC5iaW5kKGZ1bmN0aW9uIChlcnJvciwgYXR0cmlidXRpb25zKSB7XG4gICAgaWYgKGVycm9yKSB7IHJldHVybjsgfVxuICAgIG1hcC5fZXNyaUF0dHJpYnV0aW9ucyA9IFtdO1xuICAgIGZvciAodmFyIGMgPSAwOyBjIDwgYXR0cmlidXRpb25zLmNvbnRyaWJ1dG9ycy5sZW5ndGg7IGMrKykge1xuICAgICAgdmFyIGNvbnRyaWJ1dG9yID0gYXR0cmlidXRpb25zLmNvbnRyaWJ1dG9yc1tjXTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb250cmlidXRvci5jb3ZlcmFnZUFyZWFzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjb3ZlcmFnZUFyZWEgPSBjb250cmlidXRvci5jb3ZlcmFnZUFyZWFzW2ldO1xuICAgICAgICB2YXIgc291dGhXZXN0ID0gTC5sYXRMbmcoY292ZXJhZ2VBcmVhLmJib3hbMF0sIGNvdmVyYWdlQXJlYS5iYm94WzFdKTtcbiAgICAgICAgdmFyIG5vcnRoRWFzdCA9IEwubGF0TG5nKGNvdmVyYWdlQXJlYS5iYm94WzJdLCBjb3ZlcmFnZUFyZWEuYmJveFszXSk7XG4gICAgICAgIG1hcC5fZXNyaUF0dHJpYnV0aW9ucy5wdXNoKHtcbiAgICAgICAgICBhdHRyaWJ1dGlvbjogY29udHJpYnV0b3IuYXR0cmlidXRpb24sXG4gICAgICAgICAgc2NvcmU6IGNvdmVyYWdlQXJlYS5zY29yZSxcbiAgICAgICAgICBib3VuZHM6IEwubGF0TG5nQm91bmRzKHNvdXRoV2VzdCwgbm9ydGhFYXN0KSxcbiAgICAgICAgICBtaW5ab29tOiBjb3ZlcmFnZUFyZWEuem9vbU1pbixcbiAgICAgICAgICBtYXhab29tOiBjb3ZlcmFnZUFyZWEuem9vbU1heFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBtYXAuX2VzcmlBdHRyaWJ1dGlvbnMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgcmV0dXJuIGIuc2NvcmUgLSBhLnNjb3JlO1xuICAgIH0pO1xuXG4gICAgLy8gcGFzcyB0aGUgc2FtZSBhcmd1bWVudCBhcyB0aGUgbWFwJ3MgJ21vdmVlbmQnIGV2ZW50XG4gICAgdmFyIG9iaiA9IHsgdGFyZ2V0OiBtYXAgfTtcbiAgICBfdXBkYXRlTWFwQXR0cmlidXRpb24ob2JqKTtcbiAgfSwgdGhpcykpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gX3VwZGF0ZU1hcEF0dHJpYnV0aW9uIChldnQpIHtcbiAgdmFyIG1hcCA9IGV2dC50YXJnZXQ7XG4gIHZhciBvbGRBdHRyaWJ1dGlvbnMgPSBtYXAuX2VzcmlBdHRyaWJ1dGlvbnM7XG5cbiAgaWYgKG1hcCAmJiBtYXAuYXR0cmlidXRpb25Db250cm9sICYmIG9sZEF0dHJpYnV0aW9ucykge1xuICAgIHZhciBuZXdBdHRyaWJ1dGlvbnMgPSAnJztcbiAgICB2YXIgYm91bmRzID0gbWFwLmdldEJvdW5kcygpO1xuICAgIHZhciB3cmFwcGVkQm91bmRzID0gTC5sYXRMbmdCb3VuZHMoXG4gICAgICBib3VuZHMuZ2V0U291dGhXZXN0KCkud3JhcCgpLFxuICAgICAgYm91bmRzLmdldE5vcnRoRWFzdCgpLndyYXAoKVxuICAgICk7XG4gICAgdmFyIHpvb20gPSBtYXAuZ2V0Wm9vbSgpO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvbGRBdHRyaWJ1dGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBhdHRyaWJ1dGlvbiA9IG9sZEF0dHJpYnV0aW9uc1tpXTtcbiAgICAgIHZhciB0ZXh0ID0gYXR0cmlidXRpb24uYXR0cmlidXRpb247XG5cbiAgICAgIGlmICghbmV3QXR0cmlidXRpb25zLm1hdGNoKHRleHQpICYmIGF0dHJpYnV0aW9uLmJvdW5kcy5pbnRlcnNlY3RzKHdyYXBwZWRCb3VuZHMpICYmIHpvb20gPj0gYXR0cmlidXRpb24ubWluWm9vbSAmJiB6b29tIDw9IGF0dHJpYnV0aW9uLm1heFpvb20pIHtcbiAgICAgICAgbmV3QXR0cmlidXRpb25zICs9ICgnLCAnICsgdGV4dCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbmV3QXR0cmlidXRpb25zID0gbmV3QXR0cmlidXRpb25zLnN1YnN0cigyKTtcbiAgICB2YXIgYXR0cmlidXRpb25FbGVtZW50ID0gbWFwLmF0dHJpYnV0aW9uQ29udHJvbC5fY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy5lc3JpLWR5bmFtaWMtYXR0cmlidXRpb24nKTtcblxuICAgIGF0dHJpYnV0aW9uRWxlbWVudC5pbm5lckhUTUwgPSBuZXdBdHRyaWJ1dGlvbnM7XG4gICAgYXR0cmlidXRpb25FbGVtZW50LnN0eWxlLm1heFdpZHRoID0gY2FsY0F0dHJpYnV0aW9uV2lkdGgobWFwKTtcblxuICAgIG1hcC5maXJlKCdhdHRyaWJ1dGlvbnVwZGF0ZWQnLCB7XG4gICAgICBhdHRyaWJ1dGlvbjogbmV3QXR0cmlidXRpb25zXG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IHZhciBVdGlsID0ge1xuICBzaGFsbG93Q2xvbmU6IHNoYWxsb3dDbG9uZSxcbiAgd2Fybjogd2FybixcbiAgY2xlYW5Vcmw6IGNsZWFuVXJsLFxuICBpc0FyY2dpc09ubGluZTogaXNBcmNnaXNPbmxpbmUsXG4gIGdlb2pzb25UeXBlVG9BcmNHSVM6IGdlb2pzb25UeXBlVG9BcmNHSVMsXG4gIHJlc3BvbnNlVG9GZWF0dXJlQ29sbGVjdGlvbjogcmVzcG9uc2VUb0ZlYXR1cmVDb2xsZWN0aW9uLFxuICBnZW9qc29uVG9BcmNHSVM6IGdlb2pzb25Ub0FyY0dJUyxcbiAgYXJjZ2lzVG9HZW9KU09OOiBhcmNnaXNUb0dlb0pTT04sXG4gIGJvdW5kc1RvRXh0ZW50OiBib3VuZHNUb0V4dGVudCxcbiAgZXh0ZW50VG9Cb3VuZHM6IGV4dGVudFRvQm91bmRzLFxuICBjYWxjQXR0cmlidXRpb25XaWR0aDogY2FsY0F0dHJpYnV0aW9uV2lkdGgsXG4gIHNldEVzcmlBdHRyaWJ1dGlvbjogc2V0RXNyaUF0dHJpYnV0aW9uLFxuICBfZ2V0QXR0cmlidXRpb25EYXRhOiBfZ2V0QXR0cmlidXRpb25EYXRhLFxuICBfdXBkYXRlTWFwQXR0cmlidXRpb246IF91cGRhdGVNYXBBdHRyaWJ1dGlvblxufTtcblxuZXhwb3J0IGRlZmF1bHQgVXRpbDtcbiIsImltcG9ydCBMIGZyb20gJ2xlYWZsZXQnO1xuaW1wb3J0IHtjb3JzfSBmcm9tICcuLi9TdXBwb3J0JztcbmltcG9ydCB7Y2xlYW5Vcmx9IGZyb20gJy4uL1V0aWwnO1xuaW1wb3J0IFJlcXVlc3QgZnJvbSAnLi4vUmVxdWVzdCc7XG5cbmV4cG9ydCB2YXIgVGFzayA9IEwuQ2xhc3MuZXh0ZW5kKHtcblxuICBvcHRpb25zOiB7XG4gICAgcHJveHk6IGZhbHNlLFxuICAgIHVzZUNvcnM6IGNvcnNcbiAgfSxcblxuICAvLyBHZW5lcmF0ZSBhIG1ldGhvZCBmb3IgZWFjaCBtZXRob2ROYW1lOnBhcmFtTmFtZSBpbiB0aGUgc2V0dGVycyBmb3IgdGhpcyB0YXNrLlxuICBnZW5lcmF0ZVNldHRlcjogZnVuY3Rpb24gKHBhcmFtLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIEwuVXRpbC5iaW5kKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgdGhpcy5wYXJhbXNbcGFyYW1dID0gdmFsdWU7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LCBjb250ZXh0KTtcbiAgfSxcblxuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoZW5kcG9pbnQpIHtcbiAgICAvLyBlbmRwb2ludCBjYW4gYmUgZWl0aGVyIGEgdXJsIChhbmQgb3B0aW9ucykgZm9yIGFuIEFyY0dJUyBSZXN0IFNlcnZpY2Ugb3IgYW4gaW5zdGFuY2Ugb2YgRXNyaUxlYWZsZXQuU2VydmljZVxuICAgIGlmIChlbmRwb2ludC5yZXF1ZXN0ICYmIGVuZHBvaW50Lm9wdGlvbnMpIHtcbiAgICAgIHRoaXMuX3NlcnZpY2UgPSBlbmRwb2ludDtcbiAgICAgIEwuVXRpbC5zZXRPcHRpb25zKHRoaXMsIGVuZHBvaW50Lm9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBMLlV0aWwuc2V0T3B0aW9ucyh0aGlzLCBlbmRwb2ludCk7XG4gICAgICB0aGlzLm9wdGlvbnMudXJsID0gY2xlYW5VcmwoZW5kcG9pbnQudXJsKTtcbiAgICB9XG5cbiAgICAvLyBjbG9uZSBkZWZhdWx0IHBhcmFtcyBpbnRvIHRoaXMgb2JqZWN0XG4gICAgdGhpcy5wYXJhbXMgPSBMLlV0aWwuZXh0ZW5kKHt9LCB0aGlzLnBhcmFtcyB8fCB7fSk7XG5cbiAgICAvLyBnZW5lcmF0ZSBzZXR0ZXIgbWV0aG9kcyBiYXNlZCBvbiB0aGUgc2V0dGVycyBvYmplY3QgaW1wbGltZW50ZWQgYSBjaGlsZCBjbGFzc1xuICAgIGlmICh0aGlzLnNldHRlcnMpIHtcbiAgICAgIGZvciAodmFyIHNldHRlciBpbiB0aGlzLnNldHRlcnMpIHtcbiAgICAgICAgdmFyIHBhcmFtID0gdGhpcy5zZXR0ZXJzW3NldHRlcl07XG4gICAgICAgIHRoaXNbc2V0dGVyXSA9IHRoaXMuZ2VuZXJhdGVTZXR0ZXIocGFyYW0sIHRoaXMpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICB0b2tlbjogZnVuY3Rpb24gKHRva2VuKSB7XG4gICAgaWYgKHRoaXMuX3NlcnZpY2UpIHtcbiAgICAgIHRoaXMuX3NlcnZpY2UuYXV0aGVudGljYXRlKHRva2VuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wYXJhbXMudG9rZW4gPSB0b2tlbjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgcmVxdWVzdDogZnVuY3Rpb24gKGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgaWYgKHRoaXMuX3NlcnZpY2UpIHtcbiAgICAgIHJldHVybiB0aGlzLl9zZXJ2aWNlLnJlcXVlc3QodGhpcy5wYXRoLCB0aGlzLnBhcmFtcywgY2FsbGJhY2ssIGNvbnRleHQpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9yZXF1ZXN0KCdyZXF1ZXN0JywgdGhpcy5wYXRoLCB0aGlzLnBhcmFtcywgY2FsbGJhY2ssIGNvbnRleHQpO1xuICB9LFxuXG4gIF9yZXF1ZXN0OiBmdW5jdGlvbiAobWV0aG9kLCBwYXRoLCBwYXJhbXMsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgdmFyIHVybCA9ICh0aGlzLm9wdGlvbnMucHJveHkpID8gdGhpcy5vcHRpb25zLnByb3h5ICsgJz8nICsgdGhpcy5vcHRpb25zLnVybCArIHBhdGggOiB0aGlzLm9wdGlvbnMudXJsICsgcGF0aDtcblxuICAgIGlmICgobWV0aG9kID09PSAnZ2V0JyB8fCBtZXRob2QgPT09ICdyZXF1ZXN0JykgJiYgIXRoaXMub3B0aW9ucy51c2VDb3JzKSB7XG4gICAgICByZXR1cm4gUmVxdWVzdC5nZXQuSlNPTlAodXJsLCBwYXJhbXMsIGNhbGxiYWNrLCBjb250ZXh0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gUmVxdWVzdFttZXRob2RdKHVybCwgcGFyYW1zLCBjYWxsYmFjaywgY29udGV4dCk7XG4gIH1cbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gdGFzayAob3B0aW9ucykge1xuICByZXR1cm4gbmV3IFRhc2sob3B0aW9ucyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHRhc2s7XG4iLCJpbXBvcnQgTCBmcm9tICdsZWFmbGV0JztcbmltcG9ydCB7IFRhc2sgfSBmcm9tICcuL1Rhc2snO1xuaW1wb3J0IFV0aWwgZnJvbSAnLi4vVXRpbCc7XG5cbmV4cG9ydCB2YXIgUXVlcnkgPSBUYXNrLmV4dGVuZCh7XG4gIHNldHRlcnM6IHtcbiAgICAnb2Zmc2V0JzogJ3Jlc3VsdE9mZnNldCcsXG4gICAgJ2xpbWl0JzogJ3Jlc3VsdFJlY29yZENvdW50JyxcbiAgICAnZmllbGRzJzogJ291dEZpZWxkcycsXG4gICAgJ3ByZWNpc2lvbic6ICdnZW9tZXRyeVByZWNpc2lvbicsXG4gICAgJ2ZlYXR1cmVJZHMnOiAnb2JqZWN0SWRzJyxcbiAgICAncmV0dXJuR2VvbWV0cnknOiAncmV0dXJuR2VvbWV0cnknLFxuICAgICd0b2tlbic6ICd0b2tlbidcbiAgfSxcblxuICBwYXRoOiAncXVlcnknLFxuXG4gIHBhcmFtczoge1xuICAgIHJldHVybkdlb21ldHJ5OiB0cnVlLFxuICAgIHdoZXJlOiAnMT0xJyxcbiAgICBvdXRTcjogNDMyNixcbiAgICBvdXRGaWVsZHM6ICcqJ1xuICB9LFxuXG4gIHdpdGhpbjogZnVuY3Rpb24gKGdlb21ldHJ5KSB7XG4gICAgdGhpcy5fc2V0R2VvbWV0cnkoZ2VvbWV0cnkpO1xuICAgIHRoaXMucGFyYW1zLnNwYXRpYWxSZWwgPSAnZXNyaVNwYXRpYWxSZWxDb250YWlucyc7IC8vIHdpbGwgbWFrZSBjb2RlIHJlYWQgbGF5ZXIgd2l0aGluIGdlb21ldHJ5LCB0byB0aGUgYXBpIHRoaXMgd2lsbCByZWFkcyBnZW9tZXRyeSBjb250YWlucyBsYXllclxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIGludGVyc2VjdHM6IGZ1bmN0aW9uIChnZW9tZXRyeSkge1xuICAgIHRoaXMuX3NldEdlb21ldHJ5KGdlb21ldHJ5KTtcbiAgICB0aGlzLnBhcmFtcy5zcGF0aWFsUmVsID0gJ2VzcmlTcGF0aWFsUmVsSW50ZXJzZWN0cyc7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgY29udGFpbnM6IGZ1bmN0aW9uIChnZW9tZXRyeSkge1xuICAgIHRoaXMuX3NldEdlb21ldHJ5KGdlb21ldHJ5KTtcbiAgICB0aGlzLnBhcmFtcy5zcGF0aWFsUmVsID0gJ2VzcmlTcGF0aWFsUmVsV2l0aGluJzsgLy8gd2lsbCBtYWtlIGNvZGUgcmVhZCBsYXllciBjb250YWlucyBnZW9tZXRyeSwgdG8gdGhlIGFwaSB0aGlzIHdpbGwgcmVhZHMgZ2VvbWV0cnkgd2l0aGluIGxheWVyXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgY3Jvc3NlczogZnVuY3Rpb24gKGdlb21ldHJ5KSB7XG4gICAgdGhpcy5fc2V0R2VvbWV0cnkoZ2VvbWV0cnkpO1xuICAgIHRoaXMucGFyYW1zLnNwYXRpYWxSZWwgPSAnZXNyaVNwYXRpYWxSZWxDcm9zc2VzJztcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICB0b3VjaGVzOiBmdW5jdGlvbiAoZ2VvbWV0cnkpIHtcbiAgICB0aGlzLl9zZXRHZW9tZXRyeShnZW9tZXRyeSk7XG4gICAgdGhpcy5wYXJhbXMuc3BhdGlhbFJlbCA9ICdlc3JpU3BhdGlhbFJlbFRvdWNoZXMnO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIG92ZXJsYXBzOiBmdW5jdGlvbiAoZ2VvbWV0cnkpIHtcbiAgICB0aGlzLl9zZXRHZW9tZXRyeShnZW9tZXRyeSk7XG4gICAgdGhpcy5wYXJhbXMuc3BhdGlhbFJlbCA9ICdlc3JpU3BhdGlhbFJlbE92ZXJsYXBzJztcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICAvLyBvbmx5IHZhbGlkIGZvciBGZWF0dXJlIFNlcnZpY2VzIHJ1bm5pbmcgb24gQXJjR0lTIFNlcnZlciAxMC4zIG9yIEFyY0dJUyBPbmxpbmVcbiAgbmVhcmJ5OiBmdW5jdGlvbiAobGF0bG5nLCByYWRpdXMpIHtcbiAgICBsYXRsbmcgPSBMLmxhdExuZyhsYXRsbmcpO1xuICAgIHRoaXMucGFyYW1zLmdlb21ldHJ5ID0gW2xhdGxuZy5sbmcsIGxhdGxuZy5sYXRdO1xuICAgIHRoaXMucGFyYW1zLmdlb21ldHJ5VHlwZSA9ICdlc3JpR2VvbWV0cnlQb2ludCc7XG4gICAgdGhpcy5wYXJhbXMuc3BhdGlhbFJlbCA9ICdlc3JpU3BhdGlhbFJlbEludGVyc2VjdHMnO1xuICAgIHRoaXMucGFyYW1zLnVuaXRzID0gJ2VzcmlTUlVuaXRfTWV0ZXInO1xuICAgIHRoaXMucGFyYW1zLmRpc3RhbmNlID0gcmFkaXVzO1xuICAgIHRoaXMucGFyYW1zLmluU3IgPSA0MzI2O1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIHdoZXJlOiBmdW5jdGlvbiAoc3RyaW5nKSB7XG4gICAgLy8gaW5zdGVhZCBvZiBjb252ZXJ0aW5nIGRvdWJsZS1xdW90ZXMgdG8gc2luZ2xlIHF1b3RlcywgcGFzcyBhcyBpcywgYW5kIHByb3ZpZGUgYSBtb3JlIGluZm9ybWF0aXZlIG1lc3NhZ2UgaWYgYSA0MDAgaXMgZW5jb3VudGVyZWRcbiAgICB0aGlzLnBhcmFtcy53aGVyZSA9IHN0cmluZztcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBiZXR3ZWVuOiBmdW5jdGlvbiAoc3RhcnQsIGVuZCkge1xuICAgIHRoaXMucGFyYW1zLnRpbWUgPSBbc3RhcnQudmFsdWVPZigpLCBlbmQudmFsdWVPZigpXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBzaW1wbGlmeTogZnVuY3Rpb24gKG1hcCwgZmFjdG9yKSB7XG4gICAgdmFyIG1hcFdpZHRoID0gTWF0aC5hYnMobWFwLmdldEJvdW5kcygpLmdldFdlc3QoKSAtIG1hcC5nZXRCb3VuZHMoKS5nZXRFYXN0KCkpO1xuICAgIHRoaXMucGFyYW1zLm1heEFsbG93YWJsZU9mZnNldCA9IChtYXBXaWR0aCAvIG1hcC5nZXRTaXplKCkueSkgKiBmYWN0b3I7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgb3JkZXJCeTogZnVuY3Rpb24gKGZpZWxkTmFtZSwgb3JkZXIpIHtcbiAgICBvcmRlciA9IG9yZGVyIHx8ICdBU0MnO1xuICAgIHRoaXMucGFyYW1zLm9yZGVyQnlGaWVsZHMgPSAodGhpcy5wYXJhbXMub3JkZXJCeUZpZWxkcykgPyB0aGlzLnBhcmFtcy5vcmRlckJ5RmllbGRzICsgJywnIDogJyc7XG4gICAgdGhpcy5wYXJhbXMub3JkZXJCeUZpZWxkcyArPSAoW2ZpZWxkTmFtZSwgb3JkZXJdKS5qb2luKCcgJyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgcnVuOiBmdW5jdGlvbiAoY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgICB0aGlzLl9jbGVhblBhcmFtcygpO1xuXG4gICAgLy8gc2VydmljZXMgaG9zdGVkIG9uIEFyY0dJUyBPbmxpbmUgYWxzbyBzdXBwb3J0IHJlcXVlc3RpbmcgZ2VvanNvbiBkaXJlY3RseVxuICAgIGlmICh0aGlzLm9wdGlvbnMuaXNNb2Rlcm4gfHwgVXRpbC5pc0FyY2dpc09ubGluZSh0aGlzLm9wdGlvbnMudXJsKSkge1xuICAgICAgdGhpcy5wYXJhbXMuZiA9ICdnZW9qc29uJztcblxuICAgICAgcmV0dXJuIHRoaXMucmVxdWVzdChmdW5jdGlvbiAoZXJyb3IsIHJlc3BvbnNlKSB7XG4gICAgICAgIHRoaXMuX3RyYXBTUUxlcnJvcnMoZXJyb3IpO1xuICAgICAgICBjYWxsYmFjay5jYWxsKGNvbnRleHQsIGVycm9yLCByZXNwb25zZSwgcmVzcG9uc2UpO1xuICAgICAgfSwgdGhpcyk7XG5cbiAgICAvLyBvdGhlcndpc2UgY29udmVydCBpdCBpbiB0aGUgY2FsbGJhY2sgdGhlbiBwYXNzIGl0IG9uXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnJlcXVlc3QoZnVuY3Rpb24gKGVycm9yLCByZXNwb25zZSkge1xuICAgICAgICB0aGlzLl90cmFwU1FMZXJyb3JzKGVycm9yKTtcbiAgICAgICAgY2FsbGJhY2suY2FsbChjb250ZXh0LCBlcnJvciwgKHJlc3BvbnNlICYmIFV0aWwucmVzcG9uc2VUb0ZlYXR1cmVDb2xsZWN0aW9uKHJlc3BvbnNlKSksIHJlc3BvbnNlKTtcbiAgICAgIH0sIHRoaXMpO1xuICAgIH1cbiAgfSxcblxuICBjb3VudDogZnVuY3Rpb24gKGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgdGhpcy5fY2xlYW5QYXJhbXMoKTtcbiAgICB0aGlzLnBhcmFtcy5yZXR1cm5Db3VudE9ubHkgPSB0cnVlO1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoZnVuY3Rpb24gKGVycm9yLCByZXNwb25zZSkge1xuICAgICAgY2FsbGJhY2suY2FsbCh0aGlzLCBlcnJvciwgKHJlc3BvbnNlICYmIHJlc3BvbnNlLmNvdW50KSwgcmVzcG9uc2UpO1xuICAgIH0sIGNvbnRleHQpO1xuICB9LFxuXG4gIGlkczogZnVuY3Rpb24gKGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgdGhpcy5fY2xlYW5QYXJhbXMoKTtcbiAgICB0aGlzLnBhcmFtcy5yZXR1cm5JZHNPbmx5ID0gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGZ1bmN0aW9uIChlcnJvciwgcmVzcG9uc2UpIHtcbiAgICAgIGNhbGxiYWNrLmNhbGwodGhpcywgZXJyb3IsIChyZXNwb25zZSAmJiByZXNwb25zZS5vYmplY3RJZHMpLCByZXNwb25zZSk7XG4gICAgfSwgY29udGV4dCk7XG4gIH0sXG5cbiAgLy8gb25seSB2YWxpZCBmb3IgRmVhdHVyZSBTZXJ2aWNlcyBydW5uaW5nIG9uIEFyY0dJUyBTZXJ2ZXIgMTAuMyBvciBBcmNHSVMgT25saW5lXG4gIGJvdW5kczogZnVuY3Rpb24gKGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgdGhpcy5fY2xlYW5QYXJhbXMoKTtcbiAgICB0aGlzLnBhcmFtcy5yZXR1cm5FeHRlbnRPbmx5ID0gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGZ1bmN0aW9uIChlcnJvciwgcmVzcG9uc2UpIHtcbiAgICAgIGNhbGxiYWNrLmNhbGwoY29udGV4dCwgZXJyb3IsIChyZXNwb25zZSAmJiByZXNwb25zZS5leHRlbnQgJiYgVXRpbC5leHRlbnRUb0JvdW5kcyhyZXNwb25zZS5leHRlbnQpKSwgcmVzcG9uc2UpO1xuICAgIH0sIGNvbnRleHQpO1xuICB9LFxuXG4gIC8vIG9ubHkgdmFsaWQgZm9yIGltYWdlIHNlcnZpY2VzXG4gIHBpeGVsU2l6ZTogZnVuY3Rpb24gKHBvaW50KSB7XG4gICAgcG9pbnQgPSBMLnBvaW50KHBvaW50KTtcbiAgICB0aGlzLnBhcmFtcy5waXhlbFNpemUgPSBbcG9pbnQueCwgcG9pbnQueV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLy8gb25seSB2YWxpZCBmb3IgbWFwIHNlcnZpY2VzXG4gIGxheWVyOiBmdW5jdGlvbiAobGF5ZXIpIHtcbiAgICB0aGlzLnBhdGggPSBsYXllciArICcvcXVlcnknO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIF90cmFwU1FMZXJyb3JzOiBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIGlmIChlcnJvci5jb2RlID09PSAnNDAwJykge1xuICAgICAgICBVdGlsLndhcm4oJ29uZSBjb21tb24gc3ludGF4IGVycm9yIGluIHF1ZXJ5IHJlcXVlc3RzIGlzIGVuY2FzaW5nIHN0cmluZyB2YWx1ZXMgaW4gZG91YmxlIHF1b3RlcyBpbnN0ZWFkIG9mIHNpbmdsZSBxdW90ZXMnKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgX2NsZWFuUGFyYW1zOiBmdW5jdGlvbiAoKSB7XG4gICAgZGVsZXRlIHRoaXMucGFyYW1zLnJldHVybklkc09ubHk7XG4gICAgZGVsZXRlIHRoaXMucGFyYW1zLnJldHVybkV4dGVudE9ubHk7XG4gICAgZGVsZXRlIHRoaXMucGFyYW1zLnJldHVybkNvdW50T25seTtcbiAgfSxcblxuICBfc2V0R2VvbWV0cnk6IGZ1bmN0aW9uIChnZW9tZXRyeSkge1xuICAgIHRoaXMucGFyYW1zLmluU3IgPSA0MzI2O1xuXG4gICAgLy8gY29udmVydCBib3VuZHMgdG8gZXh0ZW50IGFuZCBmaW5pc2hcbiAgICBpZiAoZ2VvbWV0cnkgaW5zdGFuY2VvZiBMLkxhdExuZ0JvdW5kcykge1xuICAgICAgLy8gc2V0IGdlb21ldHJ5ICsgZ2VvbWV0cnlUeXBlXG4gICAgICB0aGlzLnBhcmFtcy5nZW9tZXRyeSA9IFV0aWwuYm91bmRzVG9FeHRlbnQoZ2VvbWV0cnkpO1xuICAgICAgdGhpcy5wYXJhbXMuZ2VvbWV0cnlUeXBlID0gJ2VzcmlHZW9tZXRyeUVudmVsb3BlJztcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBjb252ZXJ0IEwuTWFya2VyID4gTC5MYXRMbmdcbiAgICBpZiAoZ2VvbWV0cnkuZ2V0TGF0TG5nKSB7XG4gICAgICBnZW9tZXRyeSA9IGdlb21ldHJ5LmdldExhdExuZygpO1xuICAgIH1cblxuICAgIC8vIGNvbnZlcnQgTC5MYXRMbmcgdG8gYSBnZW9qc29uIHBvaW50IGFuZCBjb250aW51ZTtcbiAgICBpZiAoZ2VvbWV0cnkgaW5zdGFuY2VvZiBMLkxhdExuZykge1xuICAgICAgZ2VvbWV0cnkgPSB7XG4gICAgICAgIHR5cGU6ICdQb2ludCcsXG4gICAgICAgIGNvb3JkaW5hdGVzOiBbZ2VvbWV0cnkubG5nLCBnZW9tZXRyeS5sYXRdXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIGhhbmRsZSBMLkdlb0pTT04sIHB1bGwgb3V0IHRoZSBmaXJzdCBnZW9tZXRyeVxuICAgIGlmIChnZW9tZXRyeSBpbnN0YW5jZW9mIEwuR2VvSlNPTikge1xuICAgICAgLy8gcmVhc3NpZ24gZ2VvbWV0cnkgdG8gdGhlIEdlb0pTT04gdmFsdWUgICh3ZSBhcmUgYXNzdW1pbmcgdGhhdCBvbmx5IG9uZSBmZWF0dXJlIGlzIHByZXNlbnQpXG4gICAgICBnZW9tZXRyeSA9IGdlb21ldHJ5LmdldExheWVycygpWzBdLmZlYXR1cmUuZ2VvbWV0cnk7XG4gICAgICB0aGlzLnBhcmFtcy5nZW9tZXRyeSA9IFV0aWwuZ2VvanNvblRvQXJjR0lTKGdlb21ldHJ5KTtcbiAgICAgIHRoaXMucGFyYW1zLmdlb21ldHJ5VHlwZSA9IFV0aWwuZ2VvanNvblR5cGVUb0FyY0dJUyhnZW9tZXRyeS50eXBlKTtcbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgTC5Qb2x5bGluZSBhbmQgTC5Qb2x5Z29uXG4gICAgaWYgKGdlb21ldHJ5LnRvR2VvSlNPTikge1xuICAgICAgZ2VvbWV0cnkgPSBnZW9tZXRyeS50b0dlb0pTT04oKTtcbiAgICB9XG5cbiAgICAvLyBoYW5kbGUgR2VvSlNPTiBmZWF0dXJlIGJ5IHB1bGxpbmcgb3V0IHRoZSBnZW9tZXRyeVxuICAgIGlmIChnZW9tZXRyeS50eXBlID09PSAnRmVhdHVyZScpIHtcbiAgICAgIC8vIGdldCB0aGUgZ2VvbWV0cnkgb2YgdGhlIGdlb2pzb24gZmVhdHVyZVxuICAgICAgZ2VvbWV0cnkgPSBnZW9tZXRyeS5nZW9tZXRyeTtcbiAgICB9XG5cbiAgICAvLyBjb25maXJtIHRoYXQgb3VyIEdlb0pTT04gaXMgYSBwb2ludCwgbGluZSBvciBwb2x5Z29uXG4gICAgaWYgKGdlb21ldHJ5LnR5cGUgPT09ICdQb2ludCcgfHwgZ2VvbWV0cnkudHlwZSA9PT0gJ0xpbmVTdHJpbmcnIHx8IGdlb21ldHJ5LnR5cGUgPT09ICdQb2x5Z29uJyB8fCBnZW9tZXRyeS50eXBlID09PSAnTXVsdGlQb2x5Z29uJykge1xuICAgICAgdGhpcy5wYXJhbXMuZ2VvbWV0cnkgPSBVdGlsLmdlb2pzb25Ub0FyY0dJUyhnZW9tZXRyeSk7XG4gICAgICB0aGlzLnBhcmFtcy5nZW9tZXRyeVR5cGUgPSBVdGlsLmdlb2pzb25UeXBlVG9BcmNHSVMoZ2VvbWV0cnkudHlwZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gd2FybiB0aGUgdXNlciBpZiB3ZSBoYXZuJ3QgZm91bmQgYW4gYXBwcm9wcmlhdGUgb2JqZWN0XG4gICAgVXRpbC53YXJuKCdpbnZhbGlkIGdlb21ldHJ5IHBhc3NlZCB0byBzcGF0aWFsIHF1ZXJ5LiBTaG91bGQgYmUgTC5MYXRMbmcsIEwuTGF0TG5nQm91bmRzLCBMLk1hcmtlciBvciBhIEdlb0pTT04gUG9pbnQsIExpbmUsIFBvbHlnb24gb3IgTXVsdGlQb2x5Z29uIG9iamVjdCcpO1xuXG4gICAgcmV0dXJuO1xuICB9XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIHF1ZXJ5IChvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgUXVlcnkob3B0aW9ucyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHF1ZXJ5O1xuIiwiaW1wb3J0IHsgVGFzayB9IGZyb20gJy4vVGFzayc7XG5pbXBvcnQgVXRpbCBmcm9tICcuLi9VdGlsJztcblxuZXhwb3J0IHZhciBGaW5kID0gVGFzay5leHRlbmQoe1xuICBzZXR0ZXJzOiB7XG4gICAgLy8gbWV0aG9kIG5hbWUgPiBwYXJhbSBuYW1lXG4gICAgJ2NvbnRhaW5zJzogJ2NvbnRhaW5zJyxcbiAgICAndGV4dCc6ICdzZWFyY2hUZXh0JyxcbiAgICAnZmllbGRzJzogJ3NlYXJjaEZpZWxkcycsIC8vIGRlbm90ZSBhbiBhcnJheSBvciBzaW5nbGUgc3RyaW5nXG4gICAgJ3NwYXRpYWxSZWZlcmVuY2UnOiAnc3InLFxuICAgICdzcic6ICdzcicsXG4gICAgJ2xheWVycyc6ICdsYXllcnMnLFxuICAgICdyZXR1cm5HZW9tZXRyeSc6ICdyZXR1cm5HZW9tZXRyeScsXG4gICAgJ21heEFsbG93YWJsZU9mZnNldCc6ICdtYXhBbGxvd2FibGVPZmZzZXQnLFxuICAgICdwcmVjaXNpb24nOiAnZ2VvbWV0cnlQcmVjaXNpb24nLFxuICAgICdkeW5hbWljTGF5ZXJzJzogJ2R5bmFtaWNMYXllcnMnLFxuICAgICdyZXR1cm5aJzogJ3JldHVyblonLFxuICAgICdyZXR1cm5NJzogJ3JldHVybk0nLFxuICAgICdnZGJWZXJzaW9uJzogJ2dkYlZlcnNpb24nLFxuICAgICd0b2tlbic6ICd0b2tlbidcbiAgfSxcblxuICBwYXRoOiAnZmluZCcsXG5cbiAgcGFyYW1zOiB7XG4gICAgc3I6IDQzMjYsXG4gICAgY29udGFpbnM6IHRydWUsXG4gICAgcmV0dXJuR2VvbWV0cnk6IHRydWUsXG4gICAgcmV0dXJuWjogdHJ1ZSxcbiAgICByZXR1cm5NOiBmYWxzZVxuICB9LFxuXG4gIGxheWVyRGVmczogZnVuY3Rpb24gKGlkLCB3aGVyZSkge1xuICAgIHRoaXMucGFyYW1zLmxheWVyRGVmcyA9ICh0aGlzLnBhcmFtcy5sYXllckRlZnMpID8gdGhpcy5wYXJhbXMubGF5ZXJEZWZzICsgJzsnIDogJyc7XG4gICAgdGhpcy5wYXJhbXMubGF5ZXJEZWZzICs9IChbaWQsIHdoZXJlXSkuam9pbignOicpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIHNpbXBsaWZ5OiBmdW5jdGlvbiAobWFwLCBmYWN0b3IpIHtcbiAgICB2YXIgbWFwV2lkdGggPSBNYXRoLmFicyhtYXAuZ2V0Qm91bmRzKCkuZ2V0V2VzdCgpIC0gbWFwLmdldEJvdW5kcygpLmdldEVhc3QoKSk7XG4gICAgdGhpcy5wYXJhbXMubWF4QWxsb3dhYmxlT2Zmc2V0ID0gKG1hcFdpZHRoIC8gbWFwLmdldFNpemUoKS55KSAqIGZhY3RvcjtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBydW46IGZ1bmN0aW9uIChjYWxsYmFjaywgY29udGV4dCkge1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoZnVuY3Rpb24gKGVycm9yLCByZXNwb25zZSkge1xuICAgICAgY2FsbGJhY2suY2FsbChjb250ZXh0LCBlcnJvciwgKHJlc3BvbnNlICYmIFV0aWwucmVzcG9uc2VUb0ZlYXR1cmVDb2xsZWN0aW9uKHJlc3BvbnNlKSksIHJlc3BvbnNlKTtcbiAgICB9LCBjb250ZXh0KTtcbiAgfVxufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kIChvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgRmluZChvcHRpb25zKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZmluZDtcbiIsImltcG9ydCB7IFRhc2sgfSBmcm9tICcuL1Rhc2snO1xuXG5leHBvcnQgdmFyIElkZW50aWZ5ID0gVGFzay5leHRlbmQoe1xuICBwYXRoOiAnaWRlbnRpZnknLFxuXG4gIGJldHdlZW46IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gICAgdGhpcy5wYXJhbXMudGltZSA9IFtzdGFydC52YWx1ZU9mKCksIGVuZC52YWx1ZU9mKCldO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGlkZW50aWZ5IChvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgSWRlbnRpZnkob3B0aW9ucyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGlkZW50aWZ5O1xuIiwiaW1wb3J0IEwgZnJvbSAnbGVhZmxldCc7XG5pbXBvcnQgeyBJZGVudGlmeSB9IGZyb20gJy4vSWRlbnRpZnknO1xuaW1wb3J0IFV0aWwgZnJvbSAnLi4vVXRpbCc7XG5cbmV4cG9ydCB2YXIgSWRlbnRpZnlGZWF0dXJlcyA9IElkZW50aWZ5LmV4dGVuZCh7XG4gIHNldHRlcnM6IHtcbiAgICAnbGF5ZXJzJzogJ2xheWVycycsXG4gICAgJ3ByZWNpc2lvbic6ICdnZW9tZXRyeVByZWNpc2lvbicsXG4gICAgJ3RvbGVyYW5jZSc6ICd0b2xlcmFuY2UnLFxuICAgICdyZXR1cm5HZW9tZXRyeSc6ICdyZXR1cm5HZW9tZXRyeSdcbiAgfSxcblxuICBwYXJhbXM6IHtcbiAgICBzcjogNDMyNixcbiAgICBsYXllcnM6ICdhbGwnLFxuICAgIHRvbGVyYW5jZTogMyxcbiAgICByZXR1cm5HZW9tZXRyeTogdHJ1ZVxuICB9LFxuXG4gIG9uOiBmdW5jdGlvbiAobWFwKSB7XG4gICAgdmFyIGV4dGVudCA9IFV0aWwuYm91bmRzVG9FeHRlbnQobWFwLmdldEJvdW5kcygpKTtcbiAgICB2YXIgc2l6ZSA9IG1hcC5nZXRTaXplKCk7XG4gICAgdGhpcy5wYXJhbXMuaW1hZ2VEaXNwbGF5ID0gW3NpemUueCwgc2l6ZS55LCA5Nl07XG4gICAgdGhpcy5wYXJhbXMubWFwRXh0ZW50ID0gW2V4dGVudC54bWluLCBleHRlbnQueW1pbiwgZXh0ZW50LnhtYXgsIGV4dGVudC55bWF4XTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBhdDogZnVuY3Rpb24gKGxhdGxuZykge1xuICAgIGxhdGxuZyA9IEwubGF0TG5nKGxhdGxuZyk7XG4gICAgdGhpcy5wYXJhbXMuZ2VvbWV0cnkgPSBbbGF0bG5nLmxuZywgbGF0bG5nLmxhdF07XG4gICAgdGhpcy5wYXJhbXMuZ2VvbWV0cnlUeXBlID0gJ2VzcmlHZW9tZXRyeVBvaW50JztcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBsYXllckRlZjogZnVuY3Rpb24gKGlkLCB3aGVyZSkge1xuICAgIHRoaXMucGFyYW1zLmxheWVyRGVmcyA9ICh0aGlzLnBhcmFtcy5sYXllckRlZnMpID8gdGhpcy5wYXJhbXMubGF5ZXJEZWZzICsgJzsnIDogJyc7XG4gICAgdGhpcy5wYXJhbXMubGF5ZXJEZWZzICs9IChbaWQsIHdoZXJlXSkuam9pbignOicpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIHNpbXBsaWZ5OiBmdW5jdGlvbiAobWFwLCBmYWN0b3IpIHtcbiAgICB2YXIgbWFwV2lkdGggPSBNYXRoLmFicyhtYXAuZ2V0Qm91bmRzKCkuZ2V0V2VzdCgpIC0gbWFwLmdldEJvdW5kcygpLmdldEVhc3QoKSk7XG4gICAgdGhpcy5wYXJhbXMubWF4QWxsb3dhYmxlT2Zmc2V0ID0gKG1hcFdpZHRoIC8gbWFwLmdldFNpemUoKS55KSAqICgxIC0gZmFjdG9yKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBydW46IGZ1bmN0aW9uIChjYWxsYmFjaywgY29udGV4dCkge1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QoZnVuY3Rpb24gKGVycm9yLCByZXNwb25zZSkge1xuICAgICAgLy8gaW1tZWRpYXRlbHkgaW52b2tlIHdpdGggYW4gZXJyb3JcbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICBjYWxsYmFjay5jYWxsKGNvbnRleHQsIGVycm9yLCB1bmRlZmluZWQsIHJlc3BvbnNlKTtcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICAvLyBvayBubyBlcnJvciBsZXRzIGp1c3QgYXNzdW1lIHdlIGhhdmUgZmVhdHVyZXMuLi5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBmZWF0dXJlQ29sbGVjdGlvbiA9IFV0aWwucmVzcG9uc2VUb0ZlYXR1cmVDb2xsZWN0aW9uKHJlc3BvbnNlKTtcbiAgICAgICAgcmVzcG9uc2UucmVzdWx0cyA9IHJlc3BvbnNlLnJlc3VsdHMucmV2ZXJzZSgpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZlYXR1cmVDb2xsZWN0aW9uLmZlYXR1cmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdmFyIGZlYXR1cmUgPSBmZWF0dXJlQ29sbGVjdGlvbi5mZWF0dXJlc1tpXTtcbiAgICAgICAgICBmZWF0dXJlLmxheWVySWQgPSByZXNwb25zZS5yZXN1bHRzW2ldLmxheWVySWQ7XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2suY2FsbChjb250ZXh0LCB1bmRlZmluZWQsIGZlYXR1cmVDb2xsZWN0aW9uLCByZXNwb25zZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gaWRlbnRpZnlGZWF0dXJlcyAob3B0aW9ucykge1xuICByZXR1cm4gbmV3IElkZW50aWZ5RmVhdHVyZXMob3B0aW9ucyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGlkZW50aWZ5RmVhdHVyZXM7XG4iLCJpbXBvcnQgTCBmcm9tICdsZWFmbGV0JztcbmltcG9ydCB7IElkZW50aWZ5IH0gZnJvbSAnLi9JZGVudGlmeSc7XG5pbXBvcnQgVXRpbCBmcm9tICcuLi9VdGlsJztcblxuZXhwb3J0IHZhciBJZGVudGlmeUltYWdlID0gSWRlbnRpZnkuZXh0ZW5kKHtcbiAgc2V0dGVyczoge1xuICAgICdzZXRNb3NhaWNSdWxlJzogJ21vc2FpY1J1bGUnLFxuICAgICdzZXRSZW5kZXJpbmdSdWxlJzogJ3JlbmRlcmluZ1J1bGUnLFxuICAgICdzZXRQaXhlbFNpemUnOiAncGl4ZWxTaXplJyxcbiAgICAncmV0dXJuQ2F0YWxvZ0l0ZW1zJzogJ3JldHVybkNhdGFsb2dJdGVtcycsXG4gICAgJ3JldHVybkdlb21ldHJ5JzogJ3JldHVybkdlb21ldHJ5J1xuICB9LFxuXG4gIHBhcmFtczoge1xuICAgIHJldHVybkdlb21ldHJ5OiBmYWxzZVxuICB9LFxuXG4gIGF0OiBmdW5jdGlvbiAobGF0bG5nKSB7XG4gICAgbGF0bG5nID0gTC5sYXRMbmcobGF0bG5nKTtcbiAgICB0aGlzLnBhcmFtcy5nZW9tZXRyeSA9IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgIHg6IGxhdGxuZy5sbmcsXG4gICAgICB5OiBsYXRsbmcubGF0LFxuICAgICAgc3BhdGlhbFJlZmVyZW5jZToge1xuICAgICAgICB3a2lkOiA0MzI2XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5wYXJhbXMuZ2VvbWV0cnlUeXBlID0gJ2VzcmlHZW9tZXRyeVBvaW50JztcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBnZXRNb3NhaWNSdWxlOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMucGFyYW1zLm1vc2FpY1J1bGU7XG4gIH0sXG5cbiAgZ2V0UmVuZGVyaW5nUnVsZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnBhcmFtcy5yZW5kZXJpbmdSdWxlO1xuICB9LFxuXG4gIGdldFBpeGVsU2l6ZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnBhcmFtcy5waXhlbFNpemU7XG4gIH0sXG5cbiAgcnVuOiBmdW5jdGlvbiAoY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KGZ1bmN0aW9uIChlcnJvciwgcmVzcG9uc2UpIHtcbiAgICAgIGNhbGxiYWNrLmNhbGwoY29udGV4dCwgZXJyb3IsIChyZXNwb25zZSAmJiB0aGlzLl9yZXNwb25zZVRvR2VvSlNPTihyZXNwb25zZSkpLCByZXNwb25zZSk7XG4gICAgfSwgdGhpcyk7XG4gIH0sXG5cbiAgLy8gZ2V0IHBpeGVsIGRhdGEgYW5kIHJldHVybiBhcyBnZW9KU09OIHBvaW50XG4gIC8vIHBvcHVsYXRlIGNhdGFsb2cgaXRlbXMgKGlmIGFueSlcbiAgLy8gbWVyZ2luZyBpbiBhbnkgY2F0YWxvZ0l0ZW1WaXNpYmlsaXRpZXMgYXMgYSBwcm9wZXJ5IG9mIGVhY2ggZmVhdHVyZVxuICBfcmVzcG9uc2VUb0dlb0pTT046IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgIHZhciBsb2NhdGlvbiA9IHJlc3BvbnNlLmxvY2F0aW9uO1xuICAgIHZhciBjYXRhbG9nSXRlbXMgPSByZXNwb25zZS5jYXRhbG9nSXRlbXM7XG4gICAgdmFyIGNhdGFsb2dJdGVtVmlzaWJpbGl0aWVzID0gcmVzcG9uc2UuY2F0YWxvZ0l0ZW1WaXNpYmlsaXRpZXM7XG4gICAgdmFyIGdlb0pTT04gPSB7XG4gICAgICAncGl4ZWwnOiB7XG4gICAgICAgICd0eXBlJzogJ0ZlYXR1cmUnLFxuICAgICAgICAnZ2VvbWV0cnknOiB7XG4gICAgICAgICAgJ3R5cGUnOiAnUG9pbnQnLFxuICAgICAgICAgICdjb29yZGluYXRlcyc6IFtsb2NhdGlvbi54LCBsb2NhdGlvbi55XVxuICAgICAgICB9LFxuICAgICAgICAnY3JzJzoge1xuICAgICAgICAgICd0eXBlJzogJ0VQU0cnLFxuICAgICAgICAgICdwcm9wZXJ0aWVzJzoge1xuICAgICAgICAgICAgJ2NvZGUnOiBsb2NhdGlvbi5zcGF0aWFsUmVmZXJlbmNlLndraWRcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgICdwcm9wZXJ0aWVzJzoge1xuICAgICAgICAgICdPQkpFQ1RJRCc6IHJlc3BvbnNlLm9iamVjdElkLFxuICAgICAgICAgICduYW1lJzogcmVzcG9uc2UubmFtZSxcbiAgICAgICAgICAndmFsdWUnOiByZXNwb25zZS52YWx1ZVxuICAgICAgICB9LFxuICAgICAgICAnaWQnOiByZXNwb25zZS5vYmplY3RJZFxuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAocmVzcG9uc2UucHJvcGVydGllcyAmJiByZXNwb25zZS5wcm9wZXJ0aWVzLlZhbHVlcykge1xuICAgICAgZ2VvSlNPTi5waXhlbC5wcm9wZXJ0aWVzLnZhbHVlcyA9IHJlc3BvbnNlLnByb3BlcnRpZXMuVmFsdWVzO1xuICAgIH1cblxuICAgIGlmIChjYXRhbG9nSXRlbXMgJiYgY2F0YWxvZ0l0ZW1zLmZlYXR1cmVzKSB7XG4gICAgICBnZW9KU09OLmNhdGFsb2dJdGVtcyA9IFV0aWwucmVzcG9uc2VUb0ZlYXR1cmVDb2xsZWN0aW9uKGNhdGFsb2dJdGVtcyk7XG4gICAgICBpZiAoY2F0YWxvZ0l0ZW1WaXNpYmlsaXRpZXMgJiYgY2F0YWxvZ0l0ZW1WaXNpYmlsaXRpZXMubGVuZ3RoID09PSBnZW9KU09OLmNhdGFsb2dJdGVtcy5mZWF0dXJlcy5sZW5ndGgpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IGNhdGFsb2dJdGVtVmlzaWJpbGl0aWVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgZ2VvSlNPTi5jYXRhbG9nSXRlbXMuZmVhdHVyZXNbaV0ucHJvcGVydGllcy5jYXRhbG9nSXRlbVZpc2liaWxpdHkgPSBjYXRhbG9nSXRlbVZpc2liaWxpdGllc1tpXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZ2VvSlNPTjtcbiAgfVxuXG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGlkZW50aWZ5SW1hZ2UgKHBhcmFtcykge1xuICByZXR1cm4gbmV3IElkZW50aWZ5SW1hZ2UocGFyYW1zKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgaWRlbnRpZnlJbWFnZTtcbiIsImltcG9ydCBMIGZyb20gJ2xlYWZsZXQnO1xuaW1wb3J0IHtjb3JzfSBmcm9tICcuLi9TdXBwb3J0JztcbmltcG9ydCB7Y2xlYW5Vcmx9IGZyb20gJy4uL1V0aWwnO1xuaW1wb3J0IFJlcXVlc3QgZnJvbSAnLi4vUmVxdWVzdCc7XG5cbmV4cG9ydCB2YXIgU2VydmljZSA9IEwuRXZlbnRlZC5leHRlbmQoe1xuXG4gIG9wdGlvbnM6IHtcbiAgICBwcm94eTogZmFsc2UsXG4gICAgdXNlQ29yczogY29ycyxcbiAgICB0aW1lb3V0OiAwXG4gIH0sXG5cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB0aGlzLl9yZXF1ZXN0UXVldWUgPSBbXTtcbiAgICB0aGlzLl9hdXRoZW50aWNhdGluZyA9IGZhbHNlO1xuICAgIEwuVXRpbC5zZXRPcHRpb25zKHRoaXMsIG9wdGlvbnMpO1xuICAgIHRoaXMub3B0aW9ucy51cmwgPSBjbGVhblVybCh0aGlzLm9wdGlvbnMudXJsKTtcbiAgfSxcblxuICBnZXQ6IGZ1bmN0aW9uIChwYXRoLCBwYXJhbXMsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHRoaXMuX3JlcXVlc3QoJ2dldCcsIHBhdGgsIHBhcmFtcywgY2FsbGJhY2ssIGNvbnRleHQpO1xuICB9LFxuXG4gIHBvc3Q6IGZ1bmN0aW9uIChwYXRoLCBwYXJhbXMsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHRoaXMuX3JlcXVlc3QoJ3Bvc3QnLCBwYXRoLCBwYXJhbXMsIGNhbGxiYWNrLCBjb250ZXh0KTtcbiAgfSxcblxuICByZXF1ZXN0OiBmdW5jdGlvbiAocGF0aCwgcGFyYW1zLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgIHJldHVybiB0aGlzLl9yZXF1ZXN0KCdyZXF1ZXN0JywgcGF0aCwgcGFyYW1zLCBjYWxsYmFjaywgY29udGV4dCk7XG4gIH0sXG5cbiAgbWV0YWRhdGE6IGZ1bmN0aW9uIChjYWxsYmFjaywgY29udGV4dCkge1xuICAgIHJldHVybiB0aGlzLl9yZXF1ZXN0KCdnZXQnLCAnJywge30sIGNhbGxiYWNrLCBjb250ZXh0KTtcbiAgfSxcblxuICBhdXRoZW50aWNhdGU6IGZ1bmN0aW9uICh0b2tlbikge1xuICAgIHRoaXMuX2F1dGhlbnRpY2F0aW5nID0gZmFsc2U7XG4gICAgdGhpcy5vcHRpb25zLnRva2VuID0gdG9rZW47XG4gICAgdGhpcy5fcnVuUXVldWUoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBnZXRUaW1lb3V0OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy50aW1lb3V0O1xuICB9LFxuXG4gIHNldFRpbWVvdXQ6IGZ1bmN0aW9uICh0aW1lb3V0KSB7XG4gICAgdGhpcy5vcHRpb25zLnRpbWVvdXQgPSB0aW1lb3V0O1xuICB9LFxuXG4gIF9yZXF1ZXN0OiBmdW5jdGlvbiAobWV0aG9kLCBwYXRoLCBwYXJhbXMsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgdGhpcy5maXJlKCdyZXF1ZXN0c3RhcnQnLCB7XG4gICAgICB1cmw6IHRoaXMub3B0aW9ucy51cmwgKyBwYXRoLFxuICAgICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgICBtZXRob2Q6IG1ldGhvZFxuICAgIH0sIHRydWUpO1xuXG4gICAgdmFyIHdyYXBwZWRDYWxsYmFjayA9IHRoaXMuX2NyZWF0ZVNlcnZpY2VDYWxsYmFjayhtZXRob2QsIHBhdGgsIHBhcmFtcywgY2FsbGJhY2ssIGNvbnRleHQpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy50b2tlbikge1xuICAgICAgcGFyYW1zLnRva2VuID0gdGhpcy5vcHRpb25zLnRva2VuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9hdXRoZW50aWNhdGluZykge1xuICAgICAgdGhpcy5fcmVxdWVzdFF1ZXVlLnB1c2goW21ldGhvZCwgcGF0aCwgcGFyYW1zLCBjYWxsYmFjaywgY29udGV4dF0pO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdXJsID0gKHRoaXMub3B0aW9ucy5wcm94eSkgPyB0aGlzLm9wdGlvbnMucHJveHkgKyAnPycgKyB0aGlzLm9wdGlvbnMudXJsICsgcGF0aCA6IHRoaXMub3B0aW9ucy51cmwgKyBwYXRoO1xuXG4gICAgICBpZiAoKG1ldGhvZCA9PT0gJ2dldCcgfHwgbWV0aG9kID09PSAncmVxdWVzdCcpICYmICF0aGlzLm9wdGlvbnMudXNlQ29ycykge1xuICAgICAgICByZXR1cm4gUmVxdWVzdC5nZXQuSlNPTlAodXJsLCBwYXJhbXMsIHdyYXBwZWRDYWxsYmFjaywgY29udGV4dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gUmVxdWVzdFttZXRob2RdKHVybCwgcGFyYW1zLCB3cmFwcGVkQ2FsbGJhY2ssIGNvbnRleHQpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBfY3JlYXRlU2VydmljZUNhbGxiYWNrOiBmdW5jdGlvbiAobWV0aG9kLCBwYXRoLCBwYXJhbXMsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIEwuVXRpbC5iaW5kKGZ1bmN0aW9uIChlcnJvciwgcmVzcG9uc2UpIHtcbiAgICAgIGlmIChlcnJvciAmJiAoZXJyb3IuY29kZSA9PT0gNDk5IHx8IGVycm9yLmNvZGUgPT09IDQ5OCkpIHtcbiAgICAgICAgdGhpcy5fYXV0aGVudGljYXRpbmcgPSB0cnVlO1xuXG4gICAgICAgIHRoaXMuX3JlcXVlc3RRdWV1ZS5wdXNoKFttZXRob2QsIHBhdGgsIHBhcmFtcywgY2FsbGJhY2ssIGNvbnRleHRdKTtcblxuICAgICAgICAvLyBmaXJlIGFuIGV2ZW50IGZvciB1c2VycyB0byBoYW5kbGUgYW5kIHJlLWF1dGhlbnRpY2F0ZVxuICAgICAgICB0aGlzLmZpcmUoJ2F1dGhlbnRpY2F0aW9ucmVxdWlyZWQnLCB7XG4gICAgICAgICAgYXV0aGVudGljYXRlOiBMLlV0aWwuYmluZCh0aGlzLmF1dGhlbnRpY2F0ZSwgdGhpcylcbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgLy8gaWYgdGhlIHVzZXIgaGFzIGFjY2VzcyB0byBhIGNhbGxiYWNrIHRoZXkgY2FuIGhhbmRsZSB0aGUgYXV0aCBlcnJvclxuICAgICAgICBlcnJvci5hdXRoZW50aWNhdGUgPSBMLlV0aWwuYmluZCh0aGlzLmF1dGhlbnRpY2F0ZSwgdGhpcyk7XG4gICAgICB9XG5cbiAgICAgIGNhbGxiYWNrLmNhbGwoY29udGV4dCwgZXJyb3IsIHJlc3BvbnNlKTtcblxuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIHRoaXMuZmlyZSgncmVxdWVzdGVycm9yJywge1xuICAgICAgICAgIHVybDogdGhpcy5vcHRpb25zLnVybCArIHBhdGgsXG4gICAgICAgICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgICBjb2RlOiBlcnJvci5jb2RlLFxuICAgICAgICAgIG1ldGhvZDogbWV0aG9kXG4gICAgICAgIH0sIHRydWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5maXJlKCdyZXF1ZXN0c3VjY2VzcycsIHtcbiAgICAgICAgICB1cmw6IHRoaXMub3B0aW9ucy51cmwgKyBwYXRoLFxuICAgICAgICAgIHBhcmFtczogcGFyYW1zLFxuICAgICAgICAgIHJlc3BvbnNlOiByZXNwb25zZSxcbiAgICAgICAgICBtZXRob2Q6IG1ldGhvZFxuICAgICAgICB9LCB0cnVlKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5maXJlKCdyZXF1ZXN0ZW5kJywge1xuICAgICAgICB1cmw6IHRoaXMub3B0aW9ucy51cmwgKyBwYXRoLFxuICAgICAgICBwYXJhbXM6IHBhcmFtcyxcbiAgICAgICAgbWV0aG9kOiBtZXRob2RcbiAgICAgIH0sIHRydWUpO1xuICAgIH0sIHRoaXMpO1xuICB9LFxuXG4gIF9ydW5RdWV1ZTogZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGkgPSB0aGlzLl9yZXF1ZXN0UXVldWUubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIHZhciByZXF1ZXN0ID0gdGhpcy5fcmVxdWVzdFF1ZXVlW2ldO1xuICAgICAgdmFyIG1ldGhvZCA9IHJlcXVlc3Quc2hpZnQoKTtcbiAgICAgIHRoaXNbbWV0aG9kXS5hcHBseSh0aGlzLCByZXF1ZXN0KTtcbiAgICB9XG4gICAgdGhpcy5fcmVxdWVzdFF1ZXVlID0gW107XG4gIH1cbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gc2VydmljZSAob3B0aW9ucykge1xuICByZXR1cm4gbmV3IFNlcnZpY2Uob3B0aW9ucyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHNlcnZpY2U7XG4iLCJpbXBvcnQgeyBTZXJ2aWNlIH0gZnJvbSAnLi9TZXJ2aWNlJztcbmltcG9ydCBpZGVudGlmeUZlYXR1cmVzIGZyb20gJy4uL1Rhc2tzL0lkZW50aWZ5RmVhdHVyZXMnO1xuaW1wb3J0IHF1ZXJ5IGZyb20gJy4uL1Rhc2tzL1F1ZXJ5JztcbmltcG9ydCBmaW5kIGZyb20gJy4uL1Rhc2tzL0ZpbmQnO1xuXG5leHBvcnQgdmFyIE1hcFNlcnZpY2UgPSBTZXJ2aWNlLmV4dGVuZCh7XG5cbiAgaWRlbnRpZnk6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gaWRlbnRpZnlGZWF0dXJlcyh0aGlzKTtcbiAgfSxcblxuICBmaW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGZpbmQodGhpcyk7XG4gIH0sXG5cbiAgcXVlcnk6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gcXVlcnkodGhpcyk7XG4gIH1cblxufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXBTZXJ2aWNlIChvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgTWFwU2VydmljZShvcHRpb25zKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgbWFwU2VydmljZTtcbiIsImltcG9ydCB7IFNlcnZpY2UgfSBmcm9tICcuL1NlcnZpY2UnO1xuaW1wb3J0IGlkZW50aWZ5SW1hZ2UgZnJvbSAnLi4vVGFza3MvSWRlbnRpZnlJbWFnZSc7XG5pbXBvcnQgcXVlcnkgZnJvbSAnLi4vVGFza3MvUXVlcnknO1xuXG5leHBvcnQgdmFyIEltYWdlU2VydmljZSA9IFNlcnZpY2UuZXh0ZW5kKHtcblxuICBxdWVyeTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBxdWVyeSh0aGlzKTtcbiAgfSxcblxuICBpZGVudGlmeTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBpZGVudGlmeUltYWdlKHRoaXMpO1xuICB9XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGltYWdlU2VydmljZSAob3B0aW9ucykge1xuICByZXR1cm4gbmV3IEltYWdlU2VydmljZShvcHRpb25zKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgaW1hZ2VTZXJ2aWNlO1xuIiwiaW1wb3J0IHsgU2VydmljZSB9IGZyb20gJy4vU2VydmljZSc7XG5pbXBvcnQgcXVlcnkgZnJvbSAnLi4vVGFza3MvUXVlcnknO1xuaW1wb3J0IHsgZ2VvanNvblRvQXJjR0lTIH0gZnJvbSAnLi4vVXRpbCc7XG5cbmV4cG9ydCB2YXIgRmVhdHVyZUxheWVyU2VydmljZSA9IFNlcnZpY2UuZXh0ZW5kKHtcblxuICBvcHRpb25zOiB7XG4gICAgaWRBdHRyaWJ1dGU6ICdPQkpFQ1RJRCdcbiAgfSxcblxuICBxdWVyeTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBxdWVyeSh0aGlzKTtcbiAgfSxcblxuICBhZGRGZWF0dXJlOiBmdW5jdGlvbiAoZmVhdHVyZSwgY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgICBkZWxldGUgZmVhdHVyZS5pZDtcblxuICAgIGZlYXR1cmUgPSBnZW9qc29uVG9BcmNHSVMoZmVhdHVyZSk7XG5cbiAgICByZXR1cm4gdGhpcy5wb3N0KCdhZGRGZWF0dXJlcycsIHtcbiAgICAgIGZlYXR1cmVzOiBbZmVhdHVyZV1cbiAgICB9LCBmdW5jdGlvbiAoZXJyb3IsIHJlc3BvbnNlKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gKHJlc3BvbnNlICYmIHJlc3BvbnNlLmFkZFJlc3VsdHMpID8gcmVzcG9uc2UuYWRkUmVzdWx0c1swXSA6IHVuZGVmaW5lZDtcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjay5jYWxsKGNvbnRleHQsIGVycm9yIHx8IHJlc3BvbnNlLmFkZFJlc3VsdHNbMF0uZXJyb3IsIHJlc3VsdCk7XG4gICAgICB9XG4gICAgfSwgY29udGV4dCk7XG4gIH0sXG5cbiAgdXBkYXRlRmVhdHVyZTogZnVuY3Rpb24gKGZlYXR1cmUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgZmVhdHVyZSA9IGdlb2pzb25Ub0FyY0dJUyhmZWF0dXJlLCB0aGlzLm9wdGlvbnMuaWRBdHRyaWJ1dGUpO1xuXG4gICAgcmV0dXJuIHRoaXMucG9zdCgndXBkYXRlRmVhdHVyZXMnLCB7XG4gICAgICBmZWF0dXJlczogW2ZlYXR1cmVdXG4gICAgfSwgZnVuY3Rpb24gKGVycm9yLCByZXNwb25zZSkge1xuICAgICAgdmFyIHJlc3VsdCA9IChyZXNwb25zZSAmJiByZXNwb25zZS51cGRhdGVSZXN1bHRzKSA/IHJlc3BvbnNlLnVwZGF0ZVJlc3VsdHNbMF0gOiB1bmRlZmluZWQ7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbChjb250ZXh0LCBlcnJvciB8fCByZXNwb25zZS51cGRhdGVSZXN1bHRzWzBdLmVycm9yLCByZXN1bHQpO1xuICAgICAgfVxuICAgIH0sIGNvbnRleHQpO1xuICB9LFxuXG4gIGRlbGV0ZUZlYXR1cmU6IGZ1bmN0aW9uIChpZCwgY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgICByZXR1cm4gdGhpcy5wb3N0KCdkZWxldGVGZWF0dXJlcycsIHtcbiAgICAgIG9iamVjdElkczogaWRcbiAgICB9LCBmdW5jdGlvbiAoZXJyb3IsIHJlc3BvbnNlKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gKHJlc3BvbnNlICYmIHJlc3BvbnNlLmRlbGV0ZVJlc3VsdHMpID8gcmVzcG9uc2UuZGVsZXRlUmVzdWx0c1swXSA6IHVuZGVmaW5lZDtcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjay5jYWxsKGNvbnRleHQsIGVycm9yIHx8IHJlc3BvbnNlLmRlbGV0ZVJlc3VsdHNbMF0uZXJyb3IsIHJlc3VsdCk7XG4gICAgICB9XG4gICAgfSwgY29udGV4dCk7XG4gIH0sXG5cbiAgZGVsZXRlRmVhdHVyZXM6IGZ1bmN0aW9uIChpZHMsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIHRoaXMucG9zdCgnZGVsZXRlRmVhdHVyZXMnLCB7XG4gICAgICBvYmplY3RJZHM6IGlkc1xuICAgIH0sIGZ1bmN0aW9uIChlcnJvciwgcmVzcG9uc2UpIHtcbiAgICAgIC8vIHBhc3MgYmFjayB0aGUgZW50aXJlIGFycmF5XG4gICAgICB2YXIgcmVzdWx0ID0gKHJlc3BvbnNlICYmIHJlc3BvbnNlLmRlbGV0ZVJlc3VsdHMpID8gcmVzcG9uc2UuZGVsZXRlUmVzdWx0cyA6IHVuZGVmaW5lZDtcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjay5jYWxsKGNvbnRleHQsIGVycm9yIHx8IHJlc3BvbnNlLmRlbGV0ZVJlc3VsdHNbMF0uZXJyb3IsIHJlc3VsdCk7XG4gICAgICB9XG4gICAgfSwgY29udGV4dCk7XG4gIH1cbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZmVhdHVyZUxheWVyU2VydmljZSAob3B0aW9ucykge1xuICByZXR1cm4gbmV3IEZlYXR1cmVMYXllclNlcnZpY2Uob3B0aW9ucyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZlYXR1cmVMYXllclNlcnZpY2U7XG4iLCJpbXBvcnQgTCBmcm9tICdsZWFmbGV0JztcbmltcG9ydCB7IHBvaW50ZXJFdmVudHMgfSBmcm9tICcuLi9TdXBwb3J0JztcbmltcG9ydCB7XG4gIHNldEVzcmlBdHRyaWJ1dGlvbixcbiAgX2dldEF0dHJpYnV0aW9uRGF0YSxcbiAgX3VwZGF0ZU1hcEF0dHJpYnV0aW9uXG59IGZyb20gJy4uL1V0aWwnO1xuXG52YXIgdGlsZVByb3RvY29sID0gKHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCAhPT0gJ2h0dHBzOicpID8gJ2h0dHA6JyA6ICdodHRwczonO1xuXG5leHBvcnQgdmFyIEJhc2VtYXBMYXllciA9IEwuVGlsZUxheWVyLmV4dGVuZCh7XG4gIHN0YXRpY3M6IHtcbiAgICBUSUxFUzoge1xuICAgICAgU3RyZWV0czoge1xuICAgICAgICB1cmxUZW1wbGF0ZTogdGlsZVByb3RvY29sICsgJy8ve3N9LmFyY2dpc29ubGluZS5jb20vQXJjR0lTL3Jlc3Qvc2VydmljZXMvV29ybGRfU3RyZWV0X01hcC9NYXBTZXJ2ZXIvdGlsZS97en0ve3l9L3t4fScsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBtaW5ab29tOiAxLFxuICAgICAgICAgIG1heFpvb206IDE5LFxuICAgICAgICAgIHN1YmRvbWFpbnM6IFsnc2VydmVyJywgJ3NlcnZpY2VzJ10sXG4gICAgICAgICAgYXR0cmlidXRpb246ICdVU0dTLCBOT0FBJyxcbiAgICAgICAgICBhdHRyaWJ1dGlvblVybDogJ2h0dHBzOi8vc3RhdGljLmFyY2dpcy5jb20vYXR0cmlidXRpb24vV29ybGRfU3RyZWV0X01hcCdcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFRvcG9ncmFwaGljOiB7XG4gICAgICAgIHVybFRlbXBsYXRlOiB0aWxlUHJvdG9jb2wgKyAnLy97c30uYXJjZ2lzb25saW5lLmNvbS9BcmNHSVMvcmVzdC9zZXJ2aWNlcy9Xb3JsZF9Ub3BvX01hcC9NYXBTZXJ2ZXIvdGlsZS97en0ve3l9L3t4fScsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBtaW5ab29tOiAxLFxuICAgICAgICAgIG1heFpvb206IDE5LFxuICAgICAgICAgIHN1YmRvbWFpbnM6IFsnc2VydmVyJywgJ3NlcnZpY2VzJ10sXG4gICAgICAgICAgYXR0cmlidXRpb246ICdVU0dTLCBOT0FBJyxcbiAgICAgICAgICBhdHRyaWJ1dGlvblVybDogJ2h0dHBzOi8vc3RhdGljLmFyY2dpcy5jb20vYXR0cmlidXRpb24vV29ybGRfVG9wb19NYXAnXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBPY2VhbnM6IHtcbiAgICAgICAgdXJsVGVtcGxhdGU6IHRpbGVQcm90b2NvbCArICcvL3tzfS5hcmNnaXNvbmxpbmUuY29tL2FyY2dpcy9yZXN0L3NlcnZpY2VzL09jZWFuL1dvcmxkX09jZWFuX0Jhc2UvTWFwU2VydmVyL3RpbGUve3p9L3t5fS97eH0nLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgbWluWm9vbTogMSxcbiAgICAgICAgICBtYXhab29tOiAxNixcbiAgICAgICAgICBzdWJkb21haW5zOiBbJ3NlcnZlcicsICdzZXJ2aWNlcyddLFxuICAgICAgICAgIGF0dHJpYnV0aW9uOiAnVVNHUywgTk9BQScsXG4gICAgICAgICAgYXR0cmlidXRpb25Vcmw6ICdodHRwczovL3N0YXRpYy5hcmNnaXMuY29tL2F0dHJpYnV0aW9uL09jZWFuX0Jhc2VtYXAnXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBPY2VhbnNMYWJlbHM6IHtcbiAgICAgICAgdXJsVGVtcGxhdGU6IHRpbGVQcm90b2NvbCArICcvL3tzfS5hcmNnaXNvbmxpbmUuY29tL2FyY2dpcy9yZXN0L3NlcnZpY2VzL09jZWFuL1dvcmxkX09jZWFuX1JlZmVyZW5jZS9NYXBTZXJ2ZXIvdGlsZS97en0ve3l9L3t4fScsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBtaW5ab29tOiAxLFxuICAgICAgICAgIG1heFpvb206IDE2LFxuICAgICAgICAgIHN1YmRvbWFpbnM6IFsnc2VydmVyJywgJ3NlcnZpY2VzJ10sXG4gICAgICAgICAgcGFuZTogKHBvaW50ZXJFdmVudHMpID8gJ2VzcmktbGFiZWxzJyA6ICd0aWxlUGFuZSdcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIE5hdGlvbmFsR2VvZ3JhcGhpYzoge1xuICAgICAgICB1cmxUZW1wbGF0ZTogdGlsZVByb3RvY29sICsgJy8ve3N9LmFyY2dpc29ubGluZS5jb20vQXJjR0lTL3Jlc3Qvc2VydmljZXMvTmF0R2VvX1dvcmxkX01hcC9NYXBTZXJ2ZXIvdGlsZS97en0ve3l9L3t4fScsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBtaW5ab29tOiAxLFxuICAgICAgICAgIG1heFpvb206IDE2LFxuICAgICAgICAgIHN1YmRvbWFpbnM6IFsnc2VydmVyJywgJ3NlcnZpY2VzJ10sXG4gICAgICAgICAgYXR0cmlidXRpb246ICdOYXRpb25hbCBHZW9ncmFwaGljLCBEZUxvcm1lLCBIRVJFLCBVTkVQLVdDTUMsIFVTR1MsIE5BU0EsIEVTQSwgTUVUSSwgTlJDQU4sIEdFQkNPLCBOT0FBLCBpbmNyZW1lbnQgUCBDb3JwLidcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIERhcmtHcmF5OiB7XG4gICAgICAgIHVybFRlbXBsYXRlOiB0aWxlUHJvdG9jb2wgKyAnLy97c30uYXJjZ2lzb25saW5lLmNvbS9BcmNHSVMvcmVzdC9zZXJ2aWNlcy9DYW52YXMvV29ybGRfRGFya19HcmF5X0Jhc2UvTWFwU2VydmVyL3RpbGUve3p9L3t5fS97eH0nLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgbWluWm9vbTogMSxcbiAgICAgICAgICBtYXhab29tOiAxNixcbiAgICAgICAgICBzdWJkb21haW5zOiBbJ3NlcnZlcicsICdzZXJ2aWNlcyddLFxuICAgICAgICAgIGF0dHJpYnV0aW9uOiAnSEVSRSwgRGVMb3JtZSwgTWFwbXlJbmRpYSwgJmNvcHk7IE9wZW5TdHJlZXRNYXAgY29udHJpYnV0b3JzJ1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgRGFya0dyYXlMYWJlbHM6IHtcbiAgICAgICAgdXJsVGVtcGxhdGU6IHRpbGVQcm90b2NvbCArICcvL3tzfS5hcmNnaXNvbmxpbmUuY29tL0FyY0dJUy9yZXN0L3NlcnZpY2VzL0NhbnZhcy9Xb3JsZF9EYXJrX0dyYXlfUmVmZXJlbmNlL01hcFNlcnZlci90aWxlL3t6fS97eX0ve3h9JyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIG1pblpvb206IDEsXG4gICAgICAgICAgbWF4Wm9vbTogMTYsXG4gICAgICAgICAgc3ViZG9tYWluczogWydzZXJ2ZXInLCAnc2VydmljZXMnXSxcbiAgICAgICAgICBwYW5lOiAocG9pbnRlckV2ZW50cykgPyAnZXNyaS1sYWJlbHMnIDogJ3RpbGVQYW5lJyxcbiAgICAgICAgICBhdHRyaWJ1dGlvbjogJydcblxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgR3JheToge1xuICAgICAgICB1cmxUZW1wbGF0ZTogdGlsZVByb3RvY29sICsgJy8ve3N9LmFyY2dpc29ubGluZS5jb20vQXJjR0lTL3Jlc3Qvc2VydmljZXMvQ2FudmFzL1dvcmxkX0xpZ2h0X0dyYXlfQmFzZS9NYXBTZXJ2ZXIvdGlsZS97en0ve3l9L3t4fScsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBtaW5ab29tOiAxLFxuICAgICAgICAgIG1heFpvb206IDE2LFxuICAgICAgICAgIHN1YmRvbWFpbnM6IFsnc2VydmVyJywgJ3NlcnZpY2VzJ10sXG4gICAgICAgICAgYXR0cmlidXRpb246ICdIRVJFLCBEZUxvcm1lLCBNYXBteUluZGlhLCAmY29weTsgT3BlblN0cmVldE1hcCBjb250cmlidXRvcnMnXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBHcmF5TGFiZWxzOiB7XG4gICAgICAgIHVybFRlbXBsYXRlOiB0aWxlUHJvdG9jb2wgKyAnLy97c30uYXJjZ2lzb25saW5lLmNvbS9BcmNHSVMvcmVzdC9zZXJ2aWNlcy9DYW52YXMvV29ybGRfTGlnaHRfR3JheV9SZWZlcmVuY2UvTWFwU2VydmVyL3RpbGUve3p9L3t5fS97eH0nLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgbWluWm9vbTogMSxcbiAgICAgICAgICBtYXhab29tOiAxNixcbiAgICAgICAgICBzdWJkb21haW5zOiBbJ3NlcnZlcicsICdzZXJ2aWNlcyddLFxuICAgICAgICAgIHBhbmU6IChwb2ludGVyRXZlbnRzKSA/ICdlc3JpLWxhYmVscycgOiAndGlsZVBhbmUnLFxuICAgICAgICAgIGF0dHJpYnV0aW9uOiAnJ1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgSW1hZ2VyeToge1xuICAgICAgICB1cmxUZW1wbGF0ZTogdGlsZVByb3RvY29sICsgJy8ve3N9LmFyY2dpc29ubGluZS5jb20vQXJjR0lTL3Jlc3Qvc2VydmljZXMvV29ybGRfSW1hZ2VyeS9NYXBTZXJ2ZXIvdGlsZS97en0ve3l9L3t4fScsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBtaW5ab29tOiAxLFxuICAgICAgICAgIG1heFpvb206IDE5LFxuICAgICAgICAgIHN1YmRvbWFpbnM6IFsnc2VydmVyJywgJ3NlcnZpY2VzJ10sXG4gICAgICAgICAgYXR0cmlidXRpb246ICdEaWdpdGFsR2xvYmUsIEdlb0V5ZSwgaS1jdWJlZCwgVVNEQSwgVVNHUywgQUVYLCBHZXRtYXBwaW5nLCBBZXJvZ3JpZCwgSUdOLCBJR1AsIHN3aXNzdG9wbywgYW5kIHRoZSBHSVMgVXNlciBDb21tdW5pdHknXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBJbWFnZXJ5TGFiZWxzOiB7XG4gICAgICAgIHVybFRlbXBsYXRlOiB0aWxlUHJvdG9jb2wgKyAnLy97c30uYXJjZ2lzb25saW5lLmNvbS9BcmNHSVMvcmVzdC9zZXJ2aWNlcy9SZWZlcmVuY2UvV29ybGRfQm91bmRhcmllc19hbmRfUGxhY2VzL01hcFNlcnZlci90aWxlL3t6fS97eX0ve3h9JyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIG1pblpvb206IDEsXG4gICAgICAgICAgbWF4Wm9vbTogMTksXG4gICAgICAgICAgc3ViZG9tYWluczogWydzZXJ2ZXInLCAnc2VydmljZXMnXSxcbiAgICAgICAgICBwYW5lOiAocG9pbnRlckV2ZW50cykgPyAnZXNyaS1sYWJlbHMnIDogJ3RpbGVQYW5lJyxcbiAgICAgICAgICBhdHRyaWJ1dGlvbjogJydcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIEltYWdlcnlUcmFuc3BvcnRhdGlvbjoge1xuICAgICAgICB1cmxUZW1wbGF0ZTogdGlsZVByb3RvY29sICsgJy8ve3N9LmFyY2dpc29ubGluZS5jb20vQXJjR0lTL3Jlc3Qvc2VydmljZXMvUmVmZXJlbmNlL1dvcmxkX1RyYW5zcG9ydGF0aW9uL01hcFNlcnZlci90aWxlL3t6fS97eX0ve3h9JyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIG1pblpvb206IDEsXG4gICAgICAgICAgbWF4Wm9vbTogMTksXG4gICAgICAgICAgc3ViZG9tYWluczogWydzZXJ2ZXInLCAnc2VydmljZXMnXSxcbiAgICAgICAgICBwYW5lOiAocG9pbnRlckV2ZW50cykgPyAnZXNyaS1sYWJlbHMnIDogJ3RpbGVQYW5lJ1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgU2hhZGVkUmVsaWVmOiB7XG4gICAgICAgIHVybFRlbXBsYXRlOiB0aWxlUHJvdG9jb2wgKyAnLy97c30uYXJjZ2lzb25saW5lLmNvbS9BcmNHSVMvcmVzdC9zZXJ2aWNlcy9Xb3JsZF9TaGFkZWRfUmVsaWVmL01hcFNlcnZlci90aWxlL3t6fS97eX0ve3h9JyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIG1pblpvb206IDEsXG4gICAgICAgICAgbWF4Wm9vbTogMTMsXG4gICAgICAgICAgc3ViZG9tYWluczogWydzZXJ2ZXInLCAnc2VydmljZXMnXSxcbiAgICAgICAgICBhdHRyaWJ1dGlvbjogJ1VTR1MnXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBTaGFkZWRSZWxpZWZMYWJlbHM6IHtcbiAgICAgICAgdXJsVGVtcGxhdGU6IHRpbGVQcm90b2NvbCArICcvL3tzfS5hcmNnaXNvbmxpbmUuY29tL0FyY0dJUy9yZXN0L3NlcnZpY2VzL1JlZmVyZW5jZS9Xb3JsZF9Cb3VuZGFyaWVzX2FuZF9QbGFjZXNfQWx0ZXJuYXRlL01hcFNlcnZlci90aWxlL3t6fS97eX0ve3h9JyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIG1pblpvb206IDEsXG4gICAgICAgICAgbWF4Wm9vbTogMTIsXG4gICAgICAgICAgc3ViZG9tYWluczogWydzZXJ2ZXInLCAnc2VydmljZXMnXSxcbiAgICAgICAgICBwYW5lOiAocG9pbnRlckV2ZW50cykgPyAnZXNyaS1sYWJlbHMnIDogJ3RpbGVQYW5lJyxcbiAgICAgICAgICBhdHRyaWJ1dGlvbjogJydcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFRlcnJhaW46IHtcbiAgICAgICAgdXJsVGVtcGxhdGU6IHRpbGVQcm90b2NvbCArICcvL3tzfS5hcmNnaXNvbmxpbmUuY29tL0FyY0dJUy9yZXN0L3NlcnZpY2VzL1dvcmxkX1RlcnJhaW5fQmFzZS9NYXBTZXJ2ZXIvdGlsZS97en0ve3l9L3t4fScsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBtaW5ab29tOiAxLFxuICAgICAgICAgIG1heFpvb206IDEzLFxuICAgICAgICAgIHN1YmRvbWFpbnM6IFsnc2VydmVyJywgJ3NlcnZpY2VzJ10sXG4gICAgICAgICAgYXR0cmlidXRpb246ICdVU0dTLCBOT0FBJ1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgVGVycmFpbkxhYmVsczoge1xuICAgICAgICB1cmxUZW1wbGF0ZTogdGlsZVByb3RvY29sICsgJy8ve3N9LmFyY2dpc29ubGluZS5jb20vQXJjR0lTL3Jlc3Qvc2VydmljZXMvUmVmZXJlbmNlL1dvcmxkX1JlZmVyZW5jZV9PdmVybGF5L01hcFNlcnZlci90aWxlL3t6fS97eX0ve3h9JyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIG1pblpvb206IDEsXG4gICAgICAgICAgbWF4Wm9vbTogMTMsXG4gICAgICAgICAgc3ViZG9tYWluczogWydzZXJ2ZXInLCAnc2VydmljZXMnXSxcbiAgICAgICAgICBwYW5lOiAocG9pbnRlckV2ZW50cykgPyAnZXNyaS1sYWJlbHMnIDogJ3RpbGVQYW5lJyxcbiAgICAgICAgICBhdHRyaWJ1dGlvbjogJydcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIFVTQVRvcG86IHtcbiAgICAgICAgdXJsVGVtcGxhdGU6IHRpbGVQcm90b2NvbCArICcvL3tzfS5hcmNnaXNvbmxpbmUuY29tL0FyY0dJUy9yZXN0L3NlcnZpY2VzL1VTQV9Ub3BvX01hcHMvTWFwU2VydmVyL3RpbGUve3p9L3t5fS97eH0nLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgbWluWm9vbTogMSxcbiAgICAgICAgICBtYXhab29tOiAxNSxcbiAgICAgICAgICBzdWJkb21haW5zOiBbJ3NlcnZlcicsICdzZXJ2aWNlcyddLFxuICAgICAgICAgIGF0dHJpYnV0aW9uOiAnVVNHUywgTmF0aW9uYWwgR2VvZ3JhcGhpYyBTb2NpZXR5LCBpLWN1YmVkJ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChrZXksIG9wdGlvbnMpIHtcbiAgICB2YXIgY29uZmlnO1xuXG4gICAgLy8gc2V0IHRoZSBjb25maWcgdmFyaWFibGUgd2l0aCB0aGUgYXBwcm9wcmlhdGUgY29uZmlnIG9iamVjdFxuICAgIGlmICh0eXBlb2Yga2V5ID09PSAnb2JqZWN0JyAmJiBrZXkudXJsVGVtcGxhdGUgJiYga2V5Lm9wdGlvbnMpIHtcbiAgICAgIGNvbmZpZyA9IGtleTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnICYmIEJhc2VtYXBMYXllci5USUxFU1trZXldKSB7XG4gICAgICBjb25maWcgPSBCYXNlbWFwTGF5ZXIuVElMRVNba2V5XTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdMLmVzcmkuQmFzZW1hcExheWVyOiBJbnZhbGlkIHBhcmFtZXRlci4gVXNlIG9uZSBvZiBcIlN0cmVldHNcIiwgXCJUb3BvZ3JhcGhpY1wiLCBcIk9jZWFuc1wiLCBcIk9jZWFuc0xhYmVsc1wiLCBcIk5hdGlvbmFsR2VvZ3JhcGhpY1wiLCBcIkdyYXlcIiwgXCJHcmF5TGFiZWxzXCIsIFwiRGFya0dyYXlcIiwgXCJEYXJrR3JheUxhYmVsc1wiLCBcIkltYWdlcnlcIiwgXCJJbWFnZXJ5TGFiZWxzXCIsIFwiSW1hZ2VyeVRyYW5zcG9ydGF0aW9uXCIsIFwiU2hhZGVkUmVsaWVmXCIsIFwiU2hhZGVkUmVsaWVmTGFiZWxzXCIsIFwiVGVycmFpblwiLCBcIlRlcnJhaW5MYWJlbHNcIiBvciBcIlVTQVRvcG9cIicpO1xuICAgIH1cblxuICAgIC8vIG1lcmdlIHBhc3NlZCBvcHRpb25zIGludG8gdGhlIGNvbmZpZyBvcHRpb25zXG4gICAgdmFyIHRpbGVPcHRpb25zID0gTC5VdGlsLmV4dGVuZChjb25maWcub3B0aW9ucywgb3B0aW9ucyk7XG5cbiAgICBMLlV0aWwuc2V0T3B0aW9ucyh0aGlzLCB0aWxlT3B0aW9ucyk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnRva2VuKSB7XG4gICAgICBjb25maWcudXJsVGVtcGxhdGUgKz0gKCc/dG9rZW49JyArIHRoaXMub3B0aW9ucy50b2tlbik7XG4gICAgfVxuXG4gICAgLy8gY2FsbCB0aGUgaW5pdGlhbGl6ZSBtZXRob2Qgb24gTC5UaWxlTGF5ZXIgdG8gc2V0IGV2ZXJ5dGhpbmcgdXBcbiAgICBMLlRpbGVMYXllci5wcm90b3R5cGUuaW5pdGlhbGl6ZS5jYWxsKHRoaXMsIGNvbmZpZy51cmxUZW1wbGF0ZSwgdGlsZU9wdGlvbnMpO1xuICB9LFxuXG4gIG9uQWRkOiBmdW5jdGlvbiAobWFwKSB7XG4gICAgLy8gaW5jbHVkZSAnUG93ZXJlZCBieSBFc3JpJyBpbiBtYXAgYXR0cmlidXRpb25cbiAgICBzZXRFc3JpQXR0cmlidXRpb24obWFwKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMucGFuZSA9PT0gJ2VzcmktbGFiZWxzJykge1xuICAgICAgdGhpcy5faW5pdFBhbmUoKTtcbiAgICB9XG4gICAgLy8gc29tZSBiYXNlbWFwcyBjYW4gc3VwcGx5IGR5bmFtaWMgYXR0cmlidXRpb25cbiAgICBpZiAodGhpcy5vcHRpb25zLmF0dHJpYnV0aW9uVXJsKSB7XG4gICAgICBfZ2V0QXR0cmlidXRpb25EYXRhKHRoaXMub3B0aW9ucy5hdHRyaWJ1dGlvblVybCwgbWFwKTtcbiAgICB9XG5cbiAgICBtYXAub24oJ21vdmVlbmQnLCBfdXBkYXRlTWFwQXR0cmlidXRpb24pO1xuXG4gICAgTC5UaWxlTGF5ZXIucHJvdG90eXBlLm9uQWRkLmNhbGwodGhpcywgbWFwKTtcbiAgfSxcblxuICBvblJlbW92ZTogZnVuY3Rpb24gKG1hcCkge1xuICAgIG1hcC5vZmYoJ21vdmVlbmQnLCBfdXBkYXRlTWFwQXR0cmlidXRpb24pO1xuICAgIEwuVGlsZUxheWVyLnByb3RvdHlwZS5vblJlbW92ZS5jYWxsKHRoaXMsIG1hcCk7XG4gIH0sXG5cbiAgX2luaXRQYW5lOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLl9tYXAuZ2V0UGFuZSh0aGlzLm9wdGlvbnMucGFuZSkpIHtcbiAgICAgIHZhciBwYW5lID0gdGhpcy5fbWFwLmNyZWF0ZVBhbmUodGhpcy5vcHRpb25zLnBhbmUpO1xuICAgICAgcGFuZS5zdHlsZS5wb2ludGVyRXZlbnRzID0gJ25vbmUnO1xuICAgICAgcGFuZS5zdHlsZS56SW5kZXggPSA1MDA7XG4gICAgfVxuICB9LFxuXG4gIGdldEF0dHJpYnV0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5hdHRyaWJ1dGlvbikge1xuICAgICAgdmFyIGF0dHJpYnV0aW9uID0gJzxzcGFuIGNsYXNzPVwiZXNyaS1keW5hbWljLWF0dHJpYnV0aW9uXCI+JyArIHRoaXMub3B0aW9ucy5hdHRyaWJ1dGlvbiArICc8L3NwYW4+JztcbiAgICB9XG4gICAgcmV0dXJuIGF0dHJpYnV0aW9uO1xuICB9XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGJhc2VtYXBMYXllciAoa2V5LCBvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgQmFzZW1hcExheWVyKGtleSwgb3B0aW9ucyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGJhc2VtYXBMYXllcjtcbiIsImltcG9ydCBMIGZyb20gJ2xlYWZsZXQnO1xuaW1wb3J0IHsgd2FybiwgY2xlYW5VcmwsIHNldEVzcmlBdHRyaWJ1dGlvbiB9IGZyb20gJy4uL1V0aWwnO1xuaW1wb3J0IG1hcFNlcnZpY2UgZnJvbSAnLi4vU2VydmljZXMvTWFwU2VydmljZSc7XG5cbmV4cG9ydCB2YXIgVGlsZWRNYXBMYXllciA9IEwuVGlsZUxheWVyLmV4dGVuZCh7XG4gIG9wdGlvbnM6IHtcbiAgICB6b29tT2Zmc2V0QWxsb3dhbmNlOiAwLjEsXG4gICAgZXJyb3JUaWxlVXJsOiAnaHR0cDovL2Rvd25sb2FkczIuZXNyaS5jb20vc3VwcG9ydC9UZWNoQXJ0aWNsZXMvYmxhbmsyNTYucG5nJ1xuICB9LFxuXG4gIHN0YXRpY3M6IHtcbiAgICBNZXJjYXRvclpvb21MZXZlbHM6IHtcbiAgICAgICcwJzogMTU2NTQzLjAzMzkyNzk5OTk5LFxuICAgICAgJzEnOiA3ODI3MS41MTY5NjM5OTk4OTMsXG4gICAgICAnMic6IDM5MTM1Ljc1ODQ4MjAwMDA5OSxcbiAgICAgICczJzogMTk1NjcuODc5MjQwOTk5OTAxLFxuICAgICAgJzQnOiA5NzgzLjkzOTYyMDQ5OTk1OTMsXG4gICAgICAnNSc6IDQ4OTEuOTY5ODEwMjQ5OTc5NyxcbiAgICAgICc2JzogMjQ0NS45ODQ5MDUxMjQ5ODk4LFxuICAgICAgJzcnOiAxMjIyLjk5MjQ1MjU2MjQ4OTksXG4gICAgICAnOCc6IDYxMS40OTYyMjYyODEzODAwMixcbiAgICAgICc5JzogMzA1Ljc0ODExMzE0MDU1ODAyLFxuICAgICAgJzEwJzogMTUyLjg3NDA1NjU3MDQxMSxcbiAgICAgICcxMSc6IDc2LjQzNzAyODI4NTA3MzE5NyxcbiAgICAgICcxMic6IDM4LjIxODUxNDE0MjUzNjU5OCxcbiAgICAgICcxMyc6IDE5LjEwOTI1NzA3MTI2ODI5OSxcbiAgICAgICcxNCc6IDkuNTU0NjI4NTM1NjM0MTQ5NixcbiAgICAgICcxNSc6IDQuNzc3MzE0MjY3OTQ5MzY5OSxcbiAgICAgICcxNic6IDIuMzg4NjU3MTMzOTc0NjgsXG4gICAgICAnMTcnOiAxLjE5NDMyODU2Njg1NTA1MDEsXG4gICAgICAnMTgnOiAwLjU5NzE2NDI4MzU1OTgxNjk5LFxuICAgICAgJzE5JzogMC4yOTg1ODIxNDE2NDc2MTY5OCxcbiAgICAgICcyMCc6IDAuMTQ5MjkxMDcwODIzODEsXG4gICAgICAnMjEnOiAwLjA3NDY0NTUzNTQxMTkxLFxuICAgICAgJzIyJzogMC4wMzczMjI3Njc3MDU5NTI1LFxuICAgICAgJzIzJzogMC4wMTg2NjEzODM4NTI5NzYzXG4gICAgfVxuICB9LFxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgb3B0aW9ucy51cmwgPSBjbGVhblVybChvcHRpb25zLnVybCk7XG4gICAgb3B0aW9ucyA9IEwuVXRpbC5zZXRPcHRpb25zKHRoaXMsIG9wdGlvbnMpO1xuXG4gICAgLy8gc2V0IHRoZSB1cmxzXG4gICAgdGhpcy50aWxlVXJsID0gb3B0aW9ucy51cmwgKyAndGlsZS97en0ve3l9L3t4fSc7XG4gICAgdGhpcy5zZXJ2aWNlID0gbWFwU2VydmljZShvcHRpb25zKTtcbiAgICB0aGlzLnNlcnZpY2UuYWRkRXZlbnRQYXJlbnQodGhpcyk7XG5cbiAgICB2YXIgYXJjZ2lzb25saW5lID0gbmV3IFJlZ0V4cCgvdGlsZXMuYXJjZ2lzKG9ubGluZSk/XFwuY29tL2cpO1xuICAgIGlmIChhcmNnaXNvbmxpbmUudGVzdChvcHRpb25zLnVybCkpIHtcbiAgICAgIHRoaXMudGlsZVVybCA9IHRoaXMudGlsZVVybC5yZXBsYWNlKCc6Ly90aWxlcycsICc6Ly90aWxlc3tzfScpO1xuICAgICAgb3B0aW9ucy5zdWJkb21haW5zID0gWycxJywgJzInLCAnMycsICc0J107XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy50b2tlbikge1xuICAgICAgdGhpcy50aWxlVXJsICs9ICgnP3Rva2VuPScgKyB0aGlzLm9wdGlvbnMudG9rZW4pO1xuICAgIH1cblxuICAgIC8vIGluaXQgbGF5ZXIgYnkgY2FsbGluZyBUaWxlTGF5ZXJzIGluaXRpYWxpemUgbWV0aG9kXG4gICAgTC5UaWxlTGF5ZXIucHJvdG90eXBlLmluaXRpYWxpemUuY2FsbCh0aGlzLCB0aGlzLnRpbGVVcmwsIG9wdGlvbnMpO1xuICB9LFxuXG4gIGdldFRpbGVVcmw6IGZ1bmN0aW9uICh0aWxlUG9pbnQpIHtcbiAgICByZXR1cm4gTC5VdGlsLnRlbXBsYXRlKHRoaXMudGlsZVVybCwgTC5leHRlbmQoe1xuICAgICAgczogdGhpcy5fZ2V0U3ViZG9tYWluKHRpbGVQb2ludCksXG4gICAgICB6OiAodGhpcy5fbG9kTWFwICYmIHRoaXMuX2xvZE1hcFt0aWxlUG9pbnQuel0pID8gdGhpcy5fbG9kTWFwW3RpbGVQb2ludC56XSA6IHRpbGVQb2ludC56LCAvLyB0cnkgbG9kIG1hcCBmaXJzdCwgdGhlbiBqdXN0IGRlZnVhbHQgdG8gem9vbSBsZXZlbFxuICAgICAgeDogdGlsZVBvaW50LngsXG4gICAgICB5OiB0aWxlUG9pbnQueVxuICAgIH0sIHRoaXMub3B0aW9ucykpO1xuICB9LFxuXG4gIGNyZWF0ZVRpbGU6IGZ1bmN0aW9uIChjb29yZHMsIGRvbmUpIHtcbiAgICB2YXIgdGlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuXG4gICAgTC5Eb21FdmVudC5vbih0aWxlLCAnbG9hZCcsIEwuYmluZCh0aGlzLl90aWxlT25Mb2FkLCB0aGlzLCBkb25lLCB0aWxlKSk7XG4gICAgTC5Eb21FdmVudC5vbih0aWxlLCAnZXJyb3InLCBMLmJpbmQodGhpcy5fdGlsZU9uRXJyb3IsIHRoaXMsIGRvbmUsIHRpbGUpKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY3Jvc3NPcmlnaW4pIHtcbiAgICAgIHRpbGUuY3Jvc3NPcmlnaW4gPSAnJztcbiAgICB9XG5cbiAgICAvKlxuICAgICBBbHQgdGFnIGlzIHNldCB0byBlbXB0eSBzdHJpbmcgdG8ga2VlcCBzY3JlZW4gcmVhZGVycyBmcm9tIHJlYWRpbmcgVVJMIGFuZCBmb3IgY29tcGxpYW5jZSByZWFzb25zXG4gICAgIGh0dHA6Ly93d3cudzMub3JnL1RSL1dDQUcyMC1URUNIUy9INjdcbiAgICAqL1xuICAgIHRpbGUuYWx0ID0gJyc7XG5cbiAgICAvLyBpZiB0aGVyZSBpcyBubyBsb2QgbWFwIG9yIGFuIGxvZCBtYXAgd2l0aCBhIHByb3BlciB6b29tIGxvYWQgdGhlIHRpbGVcbiAgICAvLyBvdGhlcndpc2Ugd2FpdCBmb3IgdGhlIGxvZCBtYXAgdG8gYmVjb21lIGF2YWlsYWJsZVxuICAgIGlmICghdGhpcy5fbG9kTWFwIHx8ICh0aGlzLl9sb2RNYXAgJiYgdGhpcy5fbG9kTWFwW2Nvb3Jkcy56XSkpIHtcbiAgICAgIHRpbGUuc3JjID0gdGhpcy5nZXRUaWxlVXJsKGNvb3Jkcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub25jZSgnbG9kbWFwJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB0aWxlLnNyYyA9IHRoaXMuZ2V0VGlsZVVybChjb29yZHMpO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRpbGU7XG4gIH0sXG5cbiAgb25BZGQ6IGZ1bmN0aW9uIChtYXApIHtcbiAgICAvLyBpbmNsdWRlICdQb3dlcmVkIGJ5IEVzcmknIGluIG1hcCBhdHRyaWJ1dGlvblxuICAgIHNldEVzcmlBdHRyaWJ1dGlvbihtYXApO1xuXG4gICAgaWYgKG1hcC5vcHRpb25zLmNycyA9PT0gTC5DUlMuRVBTRzM4NTcgJiYgIXRoaXMuX2xvZE1hcCkge1xuICAgICAgdGhpcy5fbG9kTWFwID0ge307XG4gICAgICB0aGlzLm1ldGFkYXRhKGZ1bmN0aW9uIChlcnJvciwgbWV0YWRhdGEpIHtcbiAgICAgICAgaWYgKCFlcnJvciAmJiBtZXRhZGF0YS5zcGF0aWFsUmVmZXJlbmNlKSB7XG4gICAgICAgICAgdmFyIHNyID0gbWV0YWRhdGEuc3BhdGlhbFJlZmVyZW5jZS5sYXRlc3RXa2lkIHx8IG1ldGFkYXRhLnNwYXRpYWxSZWZlcmVuY2Uud2tpZDtcbiAgICAgICAgICBpZiAoIXRoaXMub3B0aW9ucy5hdHRyaWJ1dGlvbiAmJiBtYXAuYXR0cmlidXRpb25Db250cm9sICYmIG1ldGFkYXRhLmNvcHlyaWdodFRleHQpIHtcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucy5hdHRyaWJ1dGlvbiA9IG1ldGFkYXRhLmNvcHlyaWdodFRleHQ7XG4gICAgICAgICAgICBtYXAuYXR0cmlidXRpb25Db250cm9sLmFkZEF0dHJpYnV0aW9uKHRoaXMuZ2V0QXR0cmlidXRpb24oKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzciA9PT0gMTAyMTAwIHx8IHNyID09PSAzODU3KSB7XG4gICAgICAgICAgICAvLyBjcmVhdGUgdGhlIHpvb20gbGV2ZWwgZGF0YVxuICAgICAgICAgICAgdmFyIGFyY2dpc0xPRHMgPSBtZXRhZGF0YS50aWxlSW5mby5sb2RzO1xuICAgICAgICAgICAgdmFyIGNvcnJlY3RSZXNvbHV0aW9ucyA9IFRpbGVkTWFwTGF5ZXIuTWVyY2F0b3Jab29tTGV2ZWxzO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyY2dpc0xPRHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgdmFyIGFyY2dpc0xPRCA9IGFyY2dpc0xPRHNbaV07XG4gICAgICAgICAgICAgIGZvciAodmFyIGNpIGluIGNvcnJlY3RSZXNvbHV0aW9ucykge1xuICAgICAgICAgICAgICAgIHZhciBjb3JyZWN0UmVzID0gY29ycmVjdFJlc29sdXRpb25zW2NpXTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl93aXRoaW5QZXJjZW50YWdlKGFyY2dpc0xPRC5yZXNvbHV0aW9uLCBjb3JyZWN0UmVzLCB0aGlzLm9wdGlvbnMuem9vbU9mZnNldEFsbG93YW5jZSkpIHtcbiAgICAgICAgICAgICAgICAgIHRoaXMuX2xvZE1hcFtjaV0gPSBhcmNnaXNMT0QubGV2ZWw7XG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy5maXJlKCdsb2RtYXAnKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2FybignTC5lc3JpLlRpbGVkTWFwTGF5ZXIgaXMgdXNpbmcgYSBub24tbWVyY2F0b3Igc3BhdGlhbCByZWZlcmVuY2UuIFN1cHBvcnQgbWF5IGJlIGF2YWlsYWJsZSB0aHJvdWdoIFByb2o0TGVhZmxldCBodHRwOi8vZXNyaS5naXRodWIuaW8vZXNyaS1sZWFmbGV0L2V4YW1wbGVzL25vbi1tZXJjYXRvci1wcm9qZWN0aW9uLmh0bWwnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIHRoaXMpO1xuICAgIH1cblxuICAgIEwuVGlsZUxheWVyLnByb3RvdHlwZS5vbkFkZC5jYWxsKHRoaXMsIG1hcCk7XG4gIH0sXG5cbiAgbWV0YWRhdGE6IGZ1bmN0aW9uIChjYWxsYmFjaywgY29udGV4dCkge1xuICAgIHRoaXMuc2VydmljZS5tZXRhZGF0YShjYWxsYmFjaywgY29udGV4dCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgaWRlbnRpZnk6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5zZXJ2aWNlLmlkZW50aWZ5KCk7XG4gIH0sXG5cbiAgZmluZDogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnNlcnZpY2UuZmluZCgpO1xuICB9LFxuXG4gIHF1ZXJ5OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VydmljZS5xdWVyeSgpO1xuICB9LFxuXG4gIGF1dGhlbnRpY2F0ZTogZnVuY3Rpb24gKHRva2VuKSB7XG4gICAgdmFyIHRva2VuUXMgPSAnP3Rva2VuPScgKyB0b2tlbjtcbiAgICB0aGlzLnRpbGVVcmwgPSAodGhpcy5vcHRpb25zLnRva2VuKSA/IHRoaXMudGlsZVVybC5yZXBsYWNlKC9cXD90b2tlbj0oLispL2csIHRva2VuUXMpIDogdGhpcy50aWxlVXJsICsgdG9rZW5RcztcbiAgICB0aGlzLm9wdGlvbnMudG9rZW4gPSB0b2tlbjtcbiAgICB0aGlzLnNlcnZpY2UuYXV0aGVudGljYXRlKHRva2VuKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBfd2l0aGluUGVyY2VudGFnZTogZnVuY3Rpb24gKGEsIGIsIHBlcmNlbnRhZ2UpIHtcbiAgICB2YXIgZGlmZiA9IE1hdGguYWJzKChhIC8gYikgLSAxKTtcbiAgICByZXR1cm4gZGlmZiA8IHBlcmNlbnRhZ2U7XG4gIH1cbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gdGlsZWRNYXBMYXllciAodXJsLCBvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgVGlsZWRNYXBMYXllcih1cmwsIG9wdGlvbnMpO1xufVxuXG5leHBvcnQgZGVmYXVsdCB0aWxlZE1hcExheWVyO1xuIiwiaW1wb3J0IEwgZnJvbSAnbGVhZmxldCc7XG5pbXBvcnQgeyBjb3JzIH0gZnJvbSAnLi4vU3VwcG9ydCc7XG5pbXBvcnQgeyBzZXRFc3JpQXR0cmlidXRpb24gfSBmcm9tICcuLi9VdGlsJztcblxudmFyIE92ZXJsYXkgPSBMLkltYWdlT3ZlcmxheS5leHRlbmQoe1xuICBvbkFkZDogZnVuY3Rpb24gKG1hcCkge1xuICAgIHRoaXMuX3RvcExlZnQgPSBtYXAuZ2V0UGl4ZWxCb3VuZHMoKS5taW47XG4gICAgTC5JbWFnZU92ZXJsYXkucHJvdG90eXBlLm9uQWRkLmNhbGwodGhpcywgbWFwKTtcbiAgfSxcbiAgX3Jlc2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuX21hcC5vcHRpb25zLmNycyA9PT0gTC5DUlMuRVBTRzM4NTcpIHtcbiAgICAgIEwuSW1hZ2VPdmVybGF5LnByb3RvdHlwZS5fcmVzZXQuY2FsbCh0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgTC5Eb21VdGlsLnNldFBvc2l0aW9uKHRoaXMuX2ltYWdlLCB0aGlzLl90b3BMZWZ0LnN1YnRyYWN0KHRoaXMuX21hcC5nZXRQaXhlbE9yaWdpbigpKSk7XG4gICAgfVxuICB9XG59KTtcblxuZXhwb3J0IHZhciBSYXN0ZXJMYXllciA9IEwuTGF5ZXIuZXh0ZW5kKHtcblxuICBvcHRpb25zOiB7XG4gICAgb3BhY2l0eTogMSxcbiAgICBwb3NpdGlvbjogJ2Zyb250JyxcbiAgICBmOiAnaW1hZ2UnLFxuICAgIHVzZUNvcnM6IGNvcnMsXG4gICAgYXR0cmlidXRpb246IG51bGwsXG4gICAgaW50ZXJhY3RpdmU6IGZhbHNlLFxuICAgIGFsdDogJydcbiAgfSxcblxuICBvbkFkZDogZnVuY3Rpb24gKG1hcCkge1xuICAgIC8vIGluY2x1ZGUgJ1Bvd2VyZWQgYnkgRXNyaScgaW4gbWFwIGF0dHJpYnV0aW9uXG4gICAgc2V0RXNyaUF0dHJpYnV0aW9uKG1hcCk7XG5cbiAgICB0aGlzLl91cGRhdGUgPSBMLlV0aWwudGhyb3R0bGUodGhpcy5fdXBkYXRlLCB0aGlzLm9wdGlvbnMudXBkYXRlSW50ZXJ2YWwsIHRoaXMpO1xuXG4gICAgbWFwLm9uKCdtb3ZlZW5kJywgdGhpcy5fdXBkYXRlLCB0aGlzKTtcblxuICAgIC8vIGlmIHdlIGhhZCBhbiBpbWFnZSBsb2FkZWQgYW5kIGl0IG1hdGNoZXMgdGhlXG4gICAgLy8gY3VycmVudCBib3VuZHMgc2hvdyB0aGUgaW1hZ2Ugb3RoZXJ3aXNlIHJlbW92ZSBpdFxuICAgIGlmICh0aGlzLl9jdXJyZW50SW1hZ2UgJiYgdGhpcy5fY3VycmVudEltYWdlLl9ib3VuZHMuZXF1YWxzKHRoaXMuX21hcC5nZXRCb3VuZHMoKSkpIHtcbiAgICAgIG1hcC5hZGRMYXllcih0aGlzLl9jdXJyZW50SW1hZ2UpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5fY3VycmVudEltYWdlKSB7XG4gICAgICB0aGlzLl9tYXAucmVtb3ZlTGF5ZXIodGhpcy5fY3VycmVudEltYWdlKTtcbiAgICAgIHRoaXMuX2N1cnJlbnRJbWFnZSA9IG51bGw7XG4gICAgfVxuXG4gICAgdGhpcy5fdXBkYXRlKCk7XG5cbiAgICBpZiAodGhpcy5fcG9wdXApIHtcbiAgICAgIHRoaXMuX21hcC5vbignY2xpY2snLCB0aGlzLl9nZXRQb3B1cERhdGEsIHRoaXMpO1xuICAgICAgdGhpcy5fbWFwLm9uKCdkYmxjbGljaycsIHRoaXMuX3Jlc2V0UG9wdXBTdGF0ZSwgdGhpcyk7XG4gICAgfVxuXG4gICAgLy8gYWRkIGNvcHlyaWdodCB0ZXh0IGxpc3RlZCBpbiBzZXJ2aWNlIG1ldGFkYXRhXG4gICAgdGhpcy5tZXRhZGF0YShmdW5jdGlvbiAoZXJyLCBtZXRhZGF0YSkge1xuICAgICAgaWYgKCFlcnIgJiYgIXRoaXMub3B0aW9ucy5hdHRyaWJ1dGlvbiAmJiBtYXAuYXR0cmlidXRpb25Db250cm9sICYmIG1ldGFkYXRhLmNvcHlyaWdodFRleHQpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zLmF0dHJpYnV0aW9uID0gbWV0YWRhdGEuY29weXJpZ2h0VGV4dDtcbiAgICAgICAgbWFwLmF0dHJpYnV0aW9uQ29udHJvbC5hZGRBdHRyaWJ1dGlvbih0aGlzLmdldEF0dHJpYnV0aW9uKCkpO1xuICAgICAgfVxuICAgIH0sIHRoaXMpO1xuICB9LFxuXG4gIG9uUmVtb3ZlOiBmdW5jdGlvbiAobWFwKSB7XG4gICAgaWYgKHRoaXMuX2N1cnJlbnRJbWFnZSkge1xuICAgICAgdGhpcy5fbWFwLnJlbW92ZUxheWVyKHRoaXMuX2N1cnJlbnRJbWFnZSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3BvcHVwKSB7XG4gICAgICB0aGlzLl9tYXAub2ZmKCdjbGljaycsIHRoaXMuX2dldFBvcHVwRGF0YSwgdGhpcyk7XG4gICAgICB0aGlzLl9tYXAub2ZmKCdkYmxjbGljaycsIHRoaXMuX3Jlc2V0UG9wdXBTdGF0ZSwgdGhpcyk7XG4gICAgfVxuXG4gICAgdGhpcy5fbWFwLm9mZignbW92ZWVuZCcsIHRoaXMuX3VwZGF0ZSwgdGhpcyk7XG4gIH0sXG5cbiAgYmluZFBvcHVwOiBmdW5jdGlvbiAoZm4sIHBvcHVwT3B0aW9ucykge1xuICAgIHRoaXMuX3Nob3VsZFJlbmRlclBvcHVwID0gZmFsc2U7XG4gICAgdGhpcy5fbGFzdENsaWNrID0gZmFsc2U7XG4gICAgdGhpcy5fcG9wdXAgPSBMLnBvcHVwKHBvcHVwT3B0aW9ucyk7XG4gICAgdGhpcy5fcG9wdXBGdW5jdGlvbiA9IGZuO1xuICAgIGlmICh0aGlzLl9tYXApIHtcbiAgICAgIHRoaXMuX21hcC5vbignY2xpY2snLCB0aGlzLl9nZXRQb3B1cERhdGEsIHRoaXMpO1xuICAgICAgdGhpcy5fbWFwLm9uKCdkYmxjbGljaycsIHRoaXMuX3Jlc2V0UG9wdXBTdGF0ZSwgdGhpcyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIHVuYmluZFBvcHVwOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuX21hcCkge1xuICAgICAgdGhpcy5fbWFwLmNsb3NlUG9wdXAodGhpcy5fcG9wdXApO1xuICAgICAgdGhpcy5fbWFwLm9mZignY2xpY2snLCB0aGlzLl9nZXRQb3B1cERhdGEsIHRoaXMpO1xuICAgICAgdGhpcy5fbWFwLm9mZignZGJsY2xpY2snLCB0aGlzLl9yZXNldFBvcHVwU3RhdGUsIHRoaXMpO1xuICAgIH1cbiAgICB0aGlzLl9wb3B1cCA9IGZhbHNlO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIGJyaW5nVG9Gcm9udDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMub3B0aW9ucy5wb3NpdGlvbiA9ICdmcm9udCc7XG4gICAgaWYgKHRoaXMuX2N1cnJlbnRJbWFnZSkge1xuICAgICAgdGhpcy5fY3VycmVudEltYWdlLmJyaW5nVG9Gcm9udCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBicmluZ1RvQmFjazogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMub3B0aW9ucy5wb3NpdGlvbiA9ICdiYWNrJztcbiAgICBpZiAodGhpcy5fY3VycmVudEltYWdlKSB7XG4gICAgICB0aGlzLl9jdXJyZW50SW1hZ2UuYnJpbmdUb0JhY2soKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgZ2V0QXR0cmlidXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLmF0dHJpYnV0aW9uO1xuICB9LFxuXG4gIGdldE9wYWNpdHk6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLm9wYWNpdHk7XG4gIH0sXG5cbiAgc2V0T3BhY2l0eTogZnVuY3Rpb24gKG9wYWNpdHkpIHtcbiAgICB0aGlzLm9wdGlvbnMub3BhY2l0eSA9IG9wYWNpdHk7XG4gICAgdGhpcy5fY3VycmVudEltYWdlLnNldE9wYWNpdHkob3BhY2l0eSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgc2V0WkluZGV4OiBmdW5jdGlvbiAoekluZGV4KSB7XG4gICAgdGhpcy5vcHRpb25zLnpJbmRleCA9IHpJbmRleDtcbiAgICB0aGlzLl91cGRhdGVaSW5kZXgoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBnZXRUaW1lUmFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW3RoaXMub3B0aW9ucy5mcm9tLCB0aGlzLm9wdGlvbnMudG9dO1xuICB9LFxuXG4gIHNldFRpbWVSYW5nZTogZnVuY3Rpb24gKGZyb20sIHRvKSB7XG4gICAgdGhpcy5vcHRpb25zLmZyb20gPSBmcm9tO1xuICAgIHRoaXMub3B0aW9ucy50byA9IHRvO1xuICAgIHRoaXMuX3VwZGF0ZSgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIG1ldGFkYXRhOiBmdW5jdGlvbiAoY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgICB0aGlzLnNlcnZpY2UubWV0YWRhdGEoY2FsbGJhY2ssIGNvbnRleHQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIGF1dGhlbnRpY2F0ZTogZnVuY3Rpb24gKHRva2VuKSB7XG4gICAgdGhpcy5zZXJ2aWNlLmF1dGhlbnRpY2F0ZSh0b2tlbik7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgX3JlbmRlckltYWdlOiBmdW5jdGlvbiAodXJsLCBib3VuZHMsIGNvbnRlbnRUeXBlKSB7XG4gICAgaWYgKHRoaXMuX21hcCkge1xuICAgICAgLy8gaWYgbm8gb3V0cHV0IGRpcmVjdG9yeSBoYXMgYmVlbiBzcGVjaWZpZWQgZm9yIGEgc2VydmljZSwgTUlNRSBkYXRhIHdpbGwgYmUgcmV0dXJuZWRcbiAgICAgIGlmIChjb250ZW50VHlwZSkge1xuICAgICAgICB1cmwgPSAnZGF0YTonICsgY29udGVudFR5cGUgKyAnO2Jhc2U2NCwnICsgdXJsO1xuICAgICAgfVxuICAgICAgLy8gY3JlYXRlIGEgbmV3IGltYWdlIG92ZXJsYXkgYW5kIGFkZCBpdCB0byB0aGUgbWFwXG4gICAgICAvLyB0byBzdGFydCBsb2FkaW5nIHRoZSBpbWFnZVxuICAgICAgLy8gb3BhY2l0eSBpcyAwIHdoaWxlIHRoZSBpbWFnZSBpcyBsb2FkaW5nXG4gICAgICB2YXIgaW1hZ2UgPSBuZXcgT3ZlcmxheSh1cmwsIGJvdW5kcywge1xuICAgICAgICBvcGFjaXR5OiAwLFxuICAgICAgICBjcm9zc09yaWdpbjogdGhpcy5vcHRpb25zLnVzZUNvcnMsXG4gICAgICAgIGFsdDogdGhpcy5vcHRpb25zLmFsdCxcbiAgICAgICAgcGFuZTogdGhpcy5vcHRpb25zLnBhbmUgfHwgdGhpcy5nZXRQYW5lKCksXG4gICAgICAgIGludGVyYWN0aXZlOiB0aGlzLm9wdGlvbnMuaW50ZXJhY3RpdmVcbiAgICAgIH0pLmFkZFRvKHRoaXMuX21hcCk7XG5cbiAgICAgIC8vIG9uY2UgdGhlIGltYWdlIGxvYWRzXG4gICAgICBpbWFnZS5vbmNlKCdsb2FkJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgaWYgKHRoaXMuX21hcCkge1xuICAgICAgICAgIHZhciBuZXdJbWFnZSA9IGUudGFyZ2V0O1xuICAgICAgICAgIHZhciBvbGRJbWFnZSA9IHRoaXMuX2N1cnJlbnRJbWFnZTtcblxuICAgICAgICAgIC8vIGlmIHRoZSBib3VuZHMgb2YgdGhpcyBpbWFnZSBtYXRjaGVzIHRoZSBib3VuZHMgdGhhdFxuICAgICAgICAgIC8vIF9yZW5kZXJJbWFnZSB3YXMgY2FsbGVkIHdpdGggYW5kIHdlIGhhdmUgYSBtYXAgd2l0aCB0aGUgc2FtZSBib3VuZHNcbiAgICAgICAgICAvLyBoaWRlIHRoZSBvbGQgaW1hZ2UgaWYgdGhlcmUgaXMgb25lIGFuZCBzZXQgdGhlIG9wYWNpdHlcbiAgICAgICAgICAvLyBvZiB0aGUgbmV3IGltYWdlIG90aGVyd2lzZSByZW1vdmUgdGhlIG5ldyBpbWFnZVxuICAgICAgICAgIGlmIChuZXdJbWFnZS5fYm91bmRzLmVxdWFscyhib3VuZHMpICYmIG5ld0ltYWdlLl9ib3VuZHMuZXF1YWxzKHRoaXMuX21hcC5nZXRCb3VuZHMoKSkpIHtcbiAgICAgICAgICAgIHRoaXMuX2N1cnJlbnRJbWFnZSA9IG5ld0ltYWdlO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLnBvc2l0aW9uID09PSAnZnJvbnQnKSB7XG4gICAgICAgICAgICAgIHRoaXMuYnJpbmdUb0Zyb250KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aGlzLmJyaW5nVG9CYWNrKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aGlzLl9tYXAgJiYgdGhpcy5fY3VycmVudEltYWdlLl9tYXApIHtcbiAgICAgICAgICAgICAgdGhpcy5fY3VycmVudEltYWdlLnNldE9wYWNpdHkodGhpcy5vcHRpb25zLm9wYWNpdHkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhpcy5fY3VycmVudEltYWdlLl9tYXAucmVtb3ZlTGF5ZXIodGhpcy5fY3VycmVudEltYWdlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG9sZEltYWdlICYmIHRoaXMuX21hcCkge1xuICAgICAgICAgICAgICB0aGlzLl9tYXAucmVtb3ZlTGF5ZXIob2xkSW1hZ2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAob2xkSW1hZ2UgJiYgb2xkSW1hZ2UuX21hcCkge1xuICAgICAgICAgICAgICBvbGRJbWFnZS5fbWFwLnJlbW92ZUxheWVyKG9sZEltYWdlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy56SW5kZXggIT09IHVuZGVmaW5lZCAmJiB0aGlzLm9wdGlvbnMuekluZGV4ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZVpJbmRleCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9tYXAucmVtb3ZlTGF5ZXIobmV3SW1hZ2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZmlyZSgnbG9hZCcsIHtcbiAgICAgICAgICBib3VuZHM6IGJvdW5kc1xuICAgICAgICB9KTtcbiAgICAgIH0sIHRoaXMpO1xuXG4gICAgICB0aGlzLmZpcmUoJ2xvYWRpbmcnLCB7XG4gICAgICAgIGJvdW5kczogYm91bmRzXG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgX3VwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgIGlmICghdGhpcy5fbWFwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHpvb20gPSB0aGlzLl9tYXAuZ2V0Wm9vbSgpO1xuICAgIHZhciBib3VuZHMgPSB0aGlzLl9tYXAuZ2V0Qm91bmRzKCk7XG5cbiAgICBpZiAodGhpcy5fYW5pbWF0aW5nWm9vbSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9tYXAuX3BhblRyYW5zaXRpb24gJiYgdGhpcy5fbWFwLl9wYW5UcmFuc2l0aW9uLl9pblByb2dyZXNzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHpvb20gPiB0aGlzLm9wdGlvbnMubWF4Wm9vbSB8fCB6b29tIDwgdGhpcy5vcHRpb25zLm1pblpvb20pIHtcbiAgICAgIHRoaXMuX2N1cnJlbnRJbWFnZS5fbWFwLnJlbW92ZUxheWVyKHRoaXMuX2N1cnJlbnRJbWFnZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHBhcmFtcyA9IHRoaXMuX2J1aWxkRXhwb3J0UGFyYW1zKCk7XG5cbiAgICB0aGlzLl9yZXF1ZXN0RXhwb3J0KHBhcmFtcywgYm91bmRzKTtcbiAgfSxcblxuICBfcmVuZGVyUG9wdXA6IGZ1bmN0aW9uIChsYXRsbmcsIGVycm9yLCByZXN1bHRzLCByZXNwb25zZSkge1xuICAgIGxhdGxuZyA9IEwubGF0TG5nKGxhdGxuZyk7XG4gICAgaWYgKHRoaXMuX3Nob3VsZFJlbmRlclBvcHVwICYmIHRoaXMuX2xhc3RDbGljay5lcXVhbHMobGF0bG5nKSkge1xuICAgICAgLy8gYWRkIHRoZSBwb3B1cCB0byB0aGUgbWFwIHdoZXJlIHRoZSBtb3VzZSB3YXMgY2xpY2tlZCBhdFxuICAgICAgdmFyIGNvbnRlbnQgPSB0aGlzLl9wb3B1cEZ1bmN0aW9uKGVycm9yLCByZXN1bHRzLCByZXNwb25zZSk7XG4gICAgICBpZiAoY29udGVudCkge1xuICAgICAgICB0aGlzLl9wb3B1cC5zZXRMYXRMbmcobGF0bG5nKS5zZXRDb250ZW50KGNvbnRlbnQpLm9wZW5Pbih0aGlzLl9tYXApO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBfcmVzZXRQb3B1cFN0YXRlOiBmdW5jdGlvbiAoZSkge1xuICAgIHRoaXMuX3Nob3VsZFJlbmRlclBvcHVwID0gZmFsc2U7XG4gICAgdGhpcy5fbGFzdENsaWNrID0gZS5sYXRsbmc7XG4gIH0sXG5cbiAgX3VwZGF0ZVpJbmRleDogZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLl9jdXJyZW50SW1hZ2UgJiYgdGhpcy5fY3VycmVudEltYWdlLl9pbWFnZSAmJiB0aGlzLm9wdGlvbnMuekluZGV4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuX2N1cnJlbnRJbWFnZS5faW1hZ2Uuc3R5bGUuekluZGV4ID0gdGhpcy5vcHRpb25zLnpJbmRleDtcbiAgICB9XG4gIH1cbn0pO1xuIiwiaW1wb3J0IEwgZnJvbSAnbGVhZmxldCc7XG5pbXBvcnQgeyBSYXN0ZXJMYXllciB9IGZyb20gJy4vUmFzdGVyTGF5ZXInO1xuaW1wb3J0IHsgY2xlYW5VcmwgfSBmcm9tICcuLi9VdGlsJztcbmltcG9ydCBpbWFnZVNlcnZpY2UgZnJvbSAnLi4vU2VydmljZXMvSW1hZ2VTZXJ2aWNlJztcblxuZXhwb3J0IHZhciBJbWFnZU1hcExheWVyID0gUmFzdGVyTGF5ZXIuZXh0ZW5kKHtcblxuICBvcHRpb25zOiB7XG4gICAgdXBkYXRlSW50ZXJ2YWw6IDE1MCxcbiAgICBmb3JtYXQ6ICdqcGdwbmcnLFxuICAgIHRyYW5zcGFyZW50OiB0cnVlLFxuICAgIGY6ICdqc29uJ1xuICB9LFxuXG4gIHF1ZXJ5OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VydmljZS5xdWVyeSgpO1xuICB9LFxuXG4gIGlkZW50aWZ5OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VydmljZS5pZGVudGlmeSgpO1xuICB9LFxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgb3B0aW9ucy51cmwgPSBjbGVhblVybChvcHRpb25zLnVybCk7XG4gICAgdGhpcy5zZXJ2aWNlID0gaW1hZ2VTZXJ2aWNlKG9wdGlvbnMpO1xuICAgIHRoaXMuc2VydmljZS5hZGRFdmVudFBhcmVudCh0aGlzKTtcblxuICAgIEwuVXRpbC5zZXRPcHRpb25zKHRoaXMsIG9wdGlvbnMpO1xuICB9LFxuXG4gIHNldFBpeGVsVHlwZTogZnVuY3Rpb24gKHBpeGVsVHlwZSkge1xuICAgIHRoaXMub3B0aW9ucy5waXhlbFR5cGUgPSBwaXhlbFR5cGU7XG4gICAgdGhpcy5fdXBkYXRlKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgZ2V0UGl4ZWxUeXBlOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy5waXhlbFR5cGU7XG4gIH0sXG5cbiAgc2V0QmFuZElkczogZnVuY3Rpb24gKGJhbmRJZHMpIHtcbiAgICBpZiAoTC5VdGlsLmlzQXJyYXkoYmFuZElkcykpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5iYW5kSWRzID0gYmFuZElkcy5qb2luKCcsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3B0aW9ucy5iYW5kSWRzID0gYmFuZElkcy50b1N0cmluZygpO1xuICAgIH1cbiAgICB0aGlzLl91cGRhdGUoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBnZXRCYW5kSWRzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy5iYW5kSWRzO1xuICB9LFxuXG4gIHNldE5vRGF0YTogZnVuY3Rpb24gKG5vRGF0YSwgbm9EYXRhSW50ZXJwcmV0YXRpb24pIHtcbiAgICBpZiAoTC5VdGlsLmlzQXJyYXkobm9EYXRhKSkge1xuICAgICAgdGhpcy5vcHRpb25zLm5vRGF0YSA9IG5vRGF0YS5qb2luKCcsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub3B0aW9ucy5ub0RhdGEgPSBub0RhdGEudG9TdHJpbmcoKTtcbiAgICB9XG4gICAgaWYgKG5vRGF0YUludGVycHJldGF0aW9uKSB7XG4gICAgICB0aGlzLm9wdGlvbnMubm9EYXRhSW50ZXJwcmV0YXRpb24gPSBub0RhdGFJbnRlcnByZXRhdGlvbjtcbiAgICB9XG4gICAgdGhpcy5fdXBkYXRlKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgZ2V0Tm9EYXRhOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy5ub0RhdGE7XG4gIH0sXG5cbiAgZ2V0Tm9EYXRhSW50ZXJwcmV0YXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLm5vRGF0YUludGVycHJldGF0aW9uO1xuICB9LFxuXG4gIHNldFJlbmRlcmluZ1J1bGU6IGZ1bmN0aW9uIChyZW5kZXJpbmdSdWxlKSB7XG4gICAgdGhpcy5vcHRpb25zLnJlbmRlcmluZ1J1bGUgPSByZW5kZXJpbmdSdWxlO1xuICAgIHRoaXMuX3VwZGF0ZSgpO1xuICB9LFxuXG4gIGdldFJlbmRlcmluZ1J1bGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLnJlbmRlcmluZ1J1bGU7XG4gIH0sXG5cbiAgc2V0TW9zYWljUnVsZTogZnVuY3Rpb24gKG1vc2FpY1J1bGUpIHtcbiAgICB0aGlzLm9wdGlvbnMubW9zYWljUnVsZSA9IG1vc2FpY1J1bGU7XG4gICAgdGhpcy5fdXBkYXRlKCk7XG4gIH0sXG5cbiAgZ2V0TW9zYWljUnVsZTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnMubW9zYWljUnVsZTtcbiAgfSxcblxuICBfZ2V0UG9wdXBEYXRhOiBmdW5jdGlvbiAoZSkge1xuICAgIHZhciBjYWxsYmFjayA9IEwuVXRpbC5iaW5kKGZ1bmN0aW9uIChlcnJvciwgcmVzdWx0cywgcmVzcG9uc2UpIHtcbiAgICAgIGlmIChlcnJvcikgeyByZXR1cm47IH0gLy8gd2UgcmVhbGx5IGNhbid0IGRvIGFueXRoaW5nIGhlcmUgYnV0IGF1dGhlbnRpY2F0ZSBvciByZXF1ZXN0ZXJyb3Igd2lsbCBmaXJlXG4gICAgICBzZXRUaW1lb3V0KEwuVXRpbC5iaW5kKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fcmVuZGVyUG9wdXAoZS5sYXRsbmcsIGVycm9yLCByZXN1bHRzLCByZXNwb25zZSk7XG4gICAgICB9LCB0aGlzKSwgMzAwKTtcbiAgICB9LCB0aGlzKTtcblxuICAgIHZhciBpZGVudGlmeVJlcXVlc3QgPSB0aGlzLmlkZW50aWZ5KCkuYXQoZS5sYXRsbmcpO1xuXG4gICAgLy8gc2V0IG1vc2FpYyBydWxlIGZvciBpZGVudGlmeSB0YXNrIGlmIGl0IGlzIHNldCBmb3IgbGF5ZXJcbiAgICBpZiAodGhpcy5vcHRpb25zLm1vc2FpY1J1bGUpIHtcbiAgICAgIGlkZW50aWZ5UmVxdWVzdC5zZXRNb3NhaWNSdWxlKHRoaXMub3B0aW9ucy5tb3NhaWNSdWxlKTtcbiAgICAgIC8vIEBUT0RPOiBmb3JjZSByZXR1cm4gY2F0YWxvZyBpdGVtcyB0b28/XG4gICAgfVxuXG4gICAgLy8gQFRPRE86IHNldCByZW5kZXJpbmcgcnVsZT8gTm90IHN1cmUsXG4gICAgLy8gc29tZXRpbWVzIHlvdSB3YW50IHJhdyBwaXhlbCB2YWx1ZXNcbiAgICAvLyBpZiAodGhpcy5vcHRpb25zLnJlbmRlcmluZ1J1bGUpIHtcbiAgICAvLyAgIGlkZW50aWZ5UmVxdWVzdC5zZXRSZW5kZXJpbmdSdWxlKHRoaXMub3B0aW9ucy5yZW5kZXJpbmdSdWxlKTtcbiAgICAvLyB9XG5cbiAgICBpZGVudGlmeVJlcXVlc3QucnVuKGNhbGxiYWNrKTtcblxuICAgIC8vIHNldCB0aGUgZmxhZ3MgdG8gc2hvdyB0aGUgcG9wdXBcbiAgICB0aGlzLl9zaG91bGRSZW5kZXJQb3B1cCA9IHRydWU7XG4gICAgdGhpcy5fbGFzdENsaWNrID0gZS5sYXRsbmc7XG4gIH0sXG5cbiAgX2J1aWxkRXhwb3J0UGFyYW1zOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGJvdW5kcyA9IHRoaXMuX21hcC5nZXRCb3VuZHMoKTtcbiAgICB2YXIgc2l6ZSA9IHRoaXMuX21hcC5nZXRTaXplKCk7XG4gICAgdmFyIG5lID0gdGhpcy5fbWFwLm9wdGlvbnMuY3JzLnByb2plY3QoYm91bmRzLl9ub3J0aEVhc3QpO1xuICAgIHZhciBzdyA9IHRoaXMuX21hcC5vcHRpb25zLmNycy5wcm9qZWN0KGJvdW5kcy5fc291dGhXZXN0KTtcblxuICAgIC8vIGVuc3VyZSB0aGF0IHdlIGRvbid0IGFzayBBcmNHSVMgU2VydmVyIGZvciBhIHRhbGxlciBpbWFnZSB0aGFuIHdlIGhhdmUgYWN0dWFsIG1hcCBkaXNwbGF5aW5nXG4gICAgdmFyIHRvcCA9IHRoaXMuX21hcC5sYXRMbmdUb0xheWVyUG9pbnQoYm91bmRzLl9ub3J0aEVhc3QpO1xuICAgIHZhciBib3R0b20gPSB0aGlzLl9tYXAubGF0TG5nVG9MYXllclBvaW50KGJvdW5kcy5fc291dGhXZXN0KTtcblxuICAgIGlmICh0b3AueSA+IDAgfHwgYm90dG9tLnkgPCBzaXplLnkpIHtcbiAgICAgIHNpemUueSA9IGJvdHRvbS55IC0gdG9wLnk7XG4gICAgfVxuXG4gICAgdmFyIHNyID0gcGFyc2VJbnQodGhpcy5fbWFwLm9wdGlvbnMuY3JzLmNvZGUuc3BsaXQoJzonKVsxXSwgMTApO1xuXG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIGJib3g6IFtzdy54LCBzdy55LCBuZS54LCBuZS55XS5qb2luKCcsJyksXG4gICAgICBzaXplOiBzaXplLnggKyAnLCcgKyBzaXplLnksXG4gICAgICBmb3JtYXQ6IHRoaXMub3B0aW9ucy5mb3JtYXQsXG4gICAgICB0cmFuc3BhcmVudDogdGhpcy5vcHRpb25zLnRyYW5zcGFyZW50LFxuICAgICAgYmJveFNSOiBzcixcbiAgICAgIGltYWdlU1I6IHNyXG4gICAgfTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZnJvbSAmJiB0aGlzLm9wdGlvbnMudG8pIHtcbiAgICAgIHBhcmFtcy50aW1lID0gdGhpcy5vcHRpb25zLmZyb20udmFsdWVPZigpICsgJywnICsgdGhpcy5vcHRpb25zLnRvLnZhbHVlT2YoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnBpeGVsVHlwZSkge1xuICAgICAgcGFyYW1zLnBpeGVsVHlwZSA9IHRoaXMub3B0aW9ucy5waXhlbFR5cGU7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uKSB7XG4gICAgICBwYXJhbXMuaW50ZXJwb2xhdGlvbiA9IHRoaXMub3B0aW9ucy5pbnRlcnBvbGF0aW9uO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY29tcHJlc3Npb25RdWFsaXR5KSB7XG4gICAgICBwYXJhbXMuY29tcHJlc3Npb25RdWFsaXR5ID0gdGhpcy5vcHRpb25zLmNvbXByZXNzaW9uUXVhbGl0eTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmJhbmRJZHMpIHtcbiAgICAgIHBhcmFtcy5iYW5kSWRzID0gdGhpcy5vcHRpb25zLmJhbmRJZHM7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5ub0RhdGEpIHtcbiAgICAgIHBhcmFtcy5ub0RhdGEgPSB0aGlzLm9wdGlvbnMubm9EYXRhO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMubm9EYXRhSW50ZXJwcmV0YXRpb24pIHtcbiAgICAgIHBhcmFtcy5ub0RhdGFJbnRlcnByZXRhdGlvbiA9IHRoaXMub3B0aW9ucy5ub0RhdGFJbnRlcnByZXRhdGlvbjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zZXJ2aWNlLm9wdGlvbnMudG9rZW4pIHtcbiAgICAgIHBhcmFtcy50b2tlbiA9IHRoaXMuc2VydmljZS5vcHRpb25zLnRva2VuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMucmVuZGVyaW5nUnVsZSkge1xuICAgICAgcGFyYW1zLnJlbmRlcmluZ1J1bGUgPSBKU09OLnN0cmluZ2lmeSh0aGlzLm9wdGlvbnMucmVuZGVyaW5nUnVsZSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5tb3NhaWNSdWxlKSB7XG4gICAgICBwYXJhbXMubW9zYWljUnVsZSA9IEpTT04uc3RyaW5naWZ5KHRoaXMub3B0aW9ucy5tb3NhaWNSdWxlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyYW1zO1xuICB9LFxuXG4gIF9yZXF1ZXN0RXhwb3J0OiBmdW5jdGlvbiAocGFyYW1zLCBib3VuZHMpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLmYgPT09ICdqc29uJykge1xuICAgICAgdGhpcy5zZXJ2aWNlLnJlcXVlc3QoJ2V4cG9ydEltYWdlJywgcGFyYW1zLCBmdW5jdGlvbiAoZXJyb3IsIHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChlcnJvcikgeyByZXR1cm47IH0gLy8gd2UgcmVhbGx5IGNhbid0IGRvIGFueXRoaW5nIGhlcmUgYnV0IGF1dGhlbnRpY2F0ZSBvciByZXF1ZXN0ZXJyb3Igd2lsbCBmaXJlXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMudG9rZW4pIHtcbiAgICAgICAgICByZXNwb25zZS5ocmVmICs9ICgnP3Rva2VuPScgKyB0aGlzLm9wdGlvbnMudG9rZW4pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3JlbmRlckltYWdlKHJlc3BvbnNlLmhyZWYsIGJvdW5kcyk7XG4gICAgICB9LCB0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFyYW1zLmYgPSAnaW1hZ2UnO1xuICAgICAgdGhpcy5fcmVuZGVySW1hZ2UodGhpcy5vcHRpb25zLnVybCArICdleHBvcnRJbWFnZScgKyBMLlV0aWwuZ2V0UGFyYW1TdHJpbmcocGFyYW1zKSwgYm91bmRzKTtcbiAgICB9XG4gIH1cbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gaW1hZ2VNYXBMYXllciAodXJsLCBvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgSW1hZ2VNYXBMYXllcih1cmwsIG9wdGlvbnMpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBpbWFnZU1hcExheWVyO1xuIiwiaW1wb3J0IEwgZnJvbSAnbGVhZmxldCc7XG5pbXBvcnQgeyBSYXN0ZXJMYXllciB9IGZyb20gJy4vUmFzdGVyTGF5ZXInO1xuaW1wb3J0IHsgY2xlYW5VcmwgfSBmcm9tICcuLi9VdGlsJztcbmltcG9ydCBtYXBTZXJ2aWNlIGZyb20gJy4uL1NlcnZpY2VzL01hcFNlcnZpY2UnO1xuXG5leHBvcnQgdmFyIER5bmFtaWNNYXBMYXllciA9IFJhc3RlckxheWVyLmV4dGVuZCh7XG5cbiAgb3B0aW9uczoge1xuICAgIHVwZGF0ZUludGVydmFsOiAxNTAsXG4gICAgbGF5ZXJzOiBmYWxzZSxcbiAgICBsYXllckRlZnM6IGZhbHNlLFxuICAgIHRpbWVPcHRpb25zOiBmYWxzZSxcbiAgICBmb3JtYXQ6ICdwbmcyNCcsXG4gICAgdHJhbnNwYXJlbnQ6IHRydWUsXG4gICAgZjogJ2pzb24nXG4gIH0sXG5cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBvcHRpb25zLnVybCA9IGNsZWFuVXJsKG9wdGlvbnMudXJsKTtcbiAgICB0aGlzLnNlcnZpY2UgPSBtYXBTZXJ2aWNlKG9wdGlvbnMpO1xuICAgIHRoaXMuc2VydmljZS5hZGRFdmVudFBhcmVudCh0aGlzKTtcblxuICAgIGlmICgob3B0aW9ucy5wcm94eSB8fCBvcHRpb25zLnRva2VuKSAmJiBvcHRpb25zLmYgIT09ICdqc29uJykge1xuICAgICAgb3B0aW9ucy5mID0gJ2pzb24nO1xuICAgIH1cbiAgICBMLlV0aWwuc2V0T3B0aW9ucyh0aGlzLCBvcHRpb25zKTtcbiAgfSxcblxuICBnZXREeW5hbWljTGF5ZXJzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy5keW5hbWljTGF5ZXJzO1xuICB9LFxuXG4gIHNldER5bmFtaWNMYXllcnM6IGZ1bmN0aW9uIChkeW5hbWljTGF5ZXJzKSB7XG4gICAgdGhpcy5vcHRpb25zLmR5bmFtaWNMYXllcnMgPSBkeW5hbWljTGF5ZXJzO1xuICAgIHRoaXMuX3VwZGF0ZSgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIGdldExheWVyczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnMubGF5ZXJzO1xuICB9LFxuXG4gIHNldExheWVyczogZnVuY3Rpb24gKGxheWVycykge1xuICAgIHRoaXMub3B0aW9ucy5sYXllcnMgPSBsYXllcnM7XG4gICAgdGhpcy5fdXBkYXRlKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgZ2V0TGF5ZXJEZWZzOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy5sYXllckRlZnM7XG4gIH0sXG5cbiAgc2V0TGF5ZXJEZWZzOiBmdW5jdGlvbiAobGF5ZXJEZWZzKSB7XG4gICAgdGhpcy5vcHRpb25zLmxheWVyRGVmcyA9IGxheWVyRGVmcztcbiAgICB0aGlzLl91cGRhdGUoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBnZXRUaW1lT3B0aW9uczogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnMudGltZU9wdGlvbnM7XG4gIH0sXG5cbiAgc2V0VGltZU9wdGlvbnM6IGZ1bmN0aW9uICh0aW1lT3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucy50aW1lT3B0aW9ucyA9IHRpbWVPcHRpb25zO1xuICAgIHRoaXMuX3VwZGF0ZSgpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIHF1ZXJ5OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VydmljZS5xdWVyeSgpO1xuICB9LFxuXG4gIGlkZW50aWZ5OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc2VydmljZS5pZGVudGlmeSgpO1xuICB9LFxuXG4gIGZpbmQ6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5zZXJ2aWNlLmZpbmQoKTtcbiAgfSxcblxuICBfZ2V0UG9wdXBEYXRhOiBmdW5jdGlvbiAoZSkge1xuICAgIHZhciBjYWxsYmFjayA9IEwuVXRpbC5iaW5kKGZ1bmN0aW9uIChlcnJvciwgZmVhdHVyZUNvbGxlY3Rpb24sIHJlc3BvbnNlKSB7XG4gICAgICBpZiAoZXJyb3IpIHsgcmV0dXJuOyB9IC8vIHdlIHJlYWxseSBjYW4ndCBkbyBhbnl0aGluZyBoZXJlIGJ1dCBhdXRoZW50aWNhdGUgb3IgcmVxdWVzdGVycm9yIHdpbGwgZmlyZVxuICAgICAgc2V0VGltZW91dChMLlV0aWwuYmluZChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3JlbmRlclBvcHVwKGUubGF0bG5nLCBlcnJvciwgZmVhdHVyZUNvbGxlY3Rpb24sIHJlc3BvbnNlKTtcbiAgICAgIH0sIHRoaXMpLCAzMDApO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgdmFyIGlkZW50aWZ5UmVxdWVzdCA9IHRoaXMuaWRlbnRpZnkoKS5vbih0aGlzLl9tYXApLmF0KGUubGF0bG5nKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMubGF5ZXJzKSB7XG4gICAgICBpZGVudGlmeVJlcXVlc3QubGF5ZXJzKCd2aXNpYmxlOicgKyB0aGlzLm9wdGlvbnMubGF5ZXJzLmpvaW4oJywnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlkZW50aWZ5UmVxdWVzdC5sYXllcnMoJ3Zpc2libGUnKTtcbiAgICB9XG5cbiAgICBpZGVudGlmeVJlcXVlc3QucnVuKGNhbGxiYWNrKTtcblxuICAgIC8vIHNldCB0aGUgZmxhZ3MgdG8gc2hvdyB0aGUgcG9wdXBcbiAgICB0aGlzLl9zaG91bGRSZW5kZXJQb3B1cCA9IHRydWU7XG4gICAgdGhpcy5fbGFzdENsaWNrID0gZS5sYXRsbmc7XG4gIH0sXG5cbiAgX2J1aWxkRXhwb3J0UGFyYW1zOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGJvdW5kcyA9IHRoaXMuX21hcC5nZXRCb3VuZHMoKTtcbiAgICB2YXIgc2l6ZSA9IHRoaXMuX21hcC5nZXRTaXplKCk7XG4gICAgdmFyIG5lID0gdGhpcy5fbWFwLm9wdGlvbnMuY3JzLnByb2plY3QoYm91bmRzLmdldE5vcnRoRWFzdCgpKTtcbiAgICB2YXIgc3cgPSB0aGlzLl9tYXAub3B0aW9ucy5jcnMucHJvamVjdChib3VuZHMuZ2V0U291dGhXZXN0KCkpO1xuICAgIHZhciBzciA9IHBhcnNlSW50KHRoaXMuX21hcC5vcHRpb25zLmNycy5jb2RlLnNwbGl0KCc6JylbMV0sIDEwKTtcblxuICAgIC8vIGVuc3VyZSB0aGF0IHdlIGRvbid0IGFzayBBcmNHSVMgU2VydmVyIGZvciBhIHRhbGxlciBpbWFnZSB0aGFuIHdlIGhhdmUgYWN0dWFsIG1hcCBkaXNwbGF5aW5nXG4gICAgdmFyIHRvcCA9IHRoaXMuX21hcC5sYXRMbmdUb0xheWVyUG9pbnQoYm91bmRzLl9ub3J0aEVhc3QpO1xuICAgIHZhciBib3R0b20gPSB0aGlzLl9tYXAubGF0TG5nVG9MYXllclBvaW50KGJvdW5kcy5fc291dGhXZXN0KTtcblxuICAgIGlmICh0b3AueSA+IDAgfHwgYm90dG9tLnkgPCBzaXplLnkpIHtcbiAgICAgIHNpemUueSA9IGJvdHRvbS55IC0gdG9wLnk7XG4gICAgfVxuXG4gICAgdmFyIHBhcmFtcyA9IHtcbiAgICAgIGJib3g6IFtzdy54LCBzdy55LCBuZS54LCBuZS55XS5qb2luKCcsJyksXG4gICAgICBzaXplOiBzaXplLnggKyAnLCcgKyBzaXplLnksXG4gICAgICBkcGk6IDk2LFxuICAgICAgZm9ybWF0OiB0aGlzLm9wdGlvbnMuZm9ybWF0LFxuICAgICAgdHJhbnNwYXJlbnQ6IHRoaXMub3B0aW9ucy50cmFuc3BhcmVudCxcbiAgICAgIGJib3hTUjogc3IsXG4gICAgICBpbWFnZVNSOiBzclxuICAgIH07XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmR5bmFtaWNMYXllcnMpIHtcbiAgICAgIHBhcmFtcy5keW5hbWljTGF5ZXJzID0gdGhpcy5vcHRpb25zLmR5bmFtaWNMYXllcnM7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5sYXllcnMpIHtcbiAgICAgIHBhcmFtcy5sYXllcnMgPSAnc2hvdzonICsgdGhpcy5vcHRpb25zLmxheWVycy5qb2luKCcsJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5sYXllckRlZnMpIHtcbiAgICAgIHBhcmFtcy5sYXllckRlZnMgPSBKU09OLnN0cmluZ2lmeSh0aGlzLm9wdGlvbnMubGF5ZXJEZWZzKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnRpbWVPcHRpb25zKSB7XG4gICAgICBwYXJhbXMudGltZU9wdGlvbnMgPSBKU09OLnN0cmluZ2lmeSh0aGlzLm9wdGlvbnMudGltZU9wdGlvbnMpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZnJvbSAmJiB0aGlzLm9wdGlvbnMudG8pIHtcbiAgICAgIHBhcmFtcy50aW1lID0gdGhpcy5vcHRpb25zLmZyb20udmFsdWVPZigpICsgJywnICsgdGhpcy5vcHRpb25zLnRvLnZhbHVlT2YoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zZXJ2aWNlLm9wdGlvbnMudG9rZW4pIHtcbiAgICAgIHBhcmFtcy50b2tlbiA9IHRoaXMuc2VydmljZS5vcHRpb25zLnRva2VuO1xuICAgIH1cblxuICAgIHJldHVybiBwYXJhbXM7XG4gIH0sXG5cbiAgX3JlcXVlc3RFeHBvcnQ6IGZ1bmN0aW9uIChwYXJhbXMsIGJvdW5kcykge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZiA9PT0gJ2pzb24nKSB7XG4gICAgICB0aGlzLnNlcnZpY2UucmVxdWVzdCgnZXhwb3J0JywgcGFyYW1zLCBmdW5jdGlvbiAoZXJyb3IsIHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChlcnJvcikgeyByZXR1cm47IH0gLy8gd2UgcmVhbGx5IGNhbid0IGRvIGFueXRoaW5nIGhlcmUgYnV0IGF1dGhlbnRpY2F0ZSBvciByZXF1ZXN0ZXJyb3Igd2lsbCBmaXJlXG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMudG9rZW4pIHtcbiAgICAgICAgICByZXNwb25zZS5ocmVmICs9ICgnP3Rva2VuPScgKyB0aGlzLm9wdGlvbnMudG9rZW4pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXNwb25zZS5ocmVmKSB7XG4gICAgICAgICAgdGhpcy5fcmVuZGVySW1hZ2UocmVzcG9uc2UuaHJlZiwgYm91bmRzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLl9yZW5kZXJJbWFnZShyZXNwb25zZS5pbWFnZURhdGEsIGJvdW5kcywgcmVzcG9uc2UuY29udGVudFR5cGUpO1xuICAgICAgICB9XG4gICAgICB9LCB0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFyYW1zLmYgPSAnaW1hZ2UnO1xuICAgICAgdGhpcy5fcmVuZGVySW1hZ2UodGhpcy5vcHRpb25zLnVybCArICdleHBvcnQnICsgTC5VdGlsLmdldFBhcmFtU3RyaW5nKHBhcmFtcyksIGJvdW5kcyk7XG4gICAgfVxuICB9XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGR5bmFtaWNNYXBMYXllciAodXJsLCBvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgRHluYW1pY01hcExheWVyKHVybCwgb3B0aW9ucyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGR5bmFtaWNNYXBMYXllcjtcbiIsImltcG9ydCBMIGZyb20gJ2xlYWZsZXQnO1xuXG52YXIgVmlydHVhbEdyaWQgPSBMLkxheWVyLmV4dGVuZCh7XG5cbiAgb3B0aW9uczoge1xuICAgIGNlbGxTaXplOiA1MTIsXG4gICAgdXBkYXRlSW50ZXJ2YWw6IDE1MFxuICB9LFxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IEwuc2V0T3B0aW9ucyh0aGlzLCBvcHRpb25zKTtcbiAgICB0aGlzLl96b29taW5nID0gZmFsc2U7XG4gIH0sXG5cbiAgb25BZGQ6IGZ1bmN0aW9uIChtYXApIHtcbiAgICB0aGlzLl9tYXAgPSBtYXA7XG4gICAgdGhpcy5fdXBkYXRlID0gTC5VdGlsLnRocm90dGxlKHRoaXMuX3VwZGF0ZSwgdGhpcy5vcHRpb25zLnVwZGF0ZUludGVydmFsLCB0aGlzKTtcbiAgICB0aGlzLl9yZXNldCgpO1xuICAgIHRoaXMuX3VwZGF0ZSgpO1xuICB9LFxuXG4gIG9uUmVtb3ZlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fbWFwLnJlbW92ZUV2ZW50TGlzdGVuZXIodGhpcy5nZXRFdmVudHMoKSwgdGhpcyk7XG4gICAgdGhpcy5fcmVtb3ZlQ2VsbHMoKTtcbiAgfSxcblxuICBnZXRFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgZXZlbnRzID0ge1xuICAgICAgbW92ZWVuZDogdGhpcy5fdXBkYXRlLFxuICAgICAgem9vbXN0YXJ0OiB0aGlzLl96b29tc3RhcnQsXG4gICAgICB6b29tZW5kOiB0aGlzLl9yZXNldFxuICAgIH07XG5cbiAgICByZXR1cm4gZXZlbnRzO1xuICB9LFxuXG4gIGFkZFRvOiBmdW5jdGlvbiAobWFwKSB7XG4gICAgbWFwLmFkZExheWVyKHRoaXMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIHJlbW92ZUZyb206IGZ1bmN0aW9uIChtYXApIHtcbiAgICBtYXAucmVtb3ZlTGF5ZXIodGhpcyk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgX3pvb21zdGFydDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3pvb21pbmcgPSB0cnVlO1xuICB9LFxuXG4gIF9yZXNldDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3JlbW92ZUNlbGxzKCk7XG5cbiAgICB0aGlzLl9jZWxscyA9IHt9O1xuICAgIHRoaXMuX2FjdGl2ZUNlbGxzID0ge307XG4gICAgdGhpcy5fY2VsbHNUb0xvYWQgPSAwO1xuICAgIHRoaXMuX2NlbGxzVG90YWwgPSAwO1xuICAgIHRoaXMuX2NlbGxOdW1Cb3VuZHMgPSB0aGlzLl9nZXRDZWxsTnVtQm91bmRzKCk7XG5cbiAgICB0aGlzLl9yZXNldFdyYXAoKTtcbiAgICB0aGlzLl96b29taW5nID0gZmFsc2U7XG4gIH0sXG5cbiAgX3Jlc2V0V3JhcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBtYXAgPSB0aGlzLl9tYXA7XG4gICAgdmFyIGNycyA9IG1hcC5vcHRpb25zLmNycztcblxuICAgIGlmIChjcnMuaW5maW5pdGUpIHsgcmV0dXJuOyB9XG5cbiAgICB2YXIgY2VsbFNpemUgPSB0aGlzLl9nZXRDZWxsU2l6ZSgpO1xuXG4gICAgaWYgKGNycy53cmFwTG5nKSB7XG4gICAgICB0aGlzLl93cmFwTG5nID0gW1xuICAgICAgICBNYXRoLmZsb29yKG1hcC5wcm9qZWN0KFswLCBjcnMud3JhcExuZ1swXV0pLnggLyBjZWxsU2l6ZSksXG4gICAgICAgIE1hdGguY2VpbChtYXAucHJvamVjdChbMCwgY3JzLndyYXBMbmdbMV1dKS54IC8gY2VsbFNpemUpXG4gICAgICBdO1xuICAgIH1cblxuICAgIGlmIChjcnMud3JhcExhdCkge1xuICAgICAgdGhpcy5fd3JhcExhdCA9IFtcbiAgICAgICAgTWF0aC5mbG9vcihtYXAucHJvamVjdChbY3JzLndyYXBMYXRbMF0sIDBdKS55IC8gY2VsbFNpemUpLFxuICAgICAgICBNYXRoLmNlaWwobWFwLnByb2plY3QoW2Nycy53cmFwTGF0WzFdLCAwXSkueSAvIGNlbGxTaXplKVxuICAgICAgXTtcbiAgICB9XG4gIH0sXG5cbiAgX2dldENlbGxTaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMub3B0aW9ucy5jZWxsU2l6ZTtcbiAgfSxcblxuICBfdXBkYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKCF0aGlzLl9tYXApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgYm91bmRzID0gdGhpcy5fbWFwLmdldFBpeGVsQm91bmRzKCk7XG4gICAgdmFyIGNlbGxTaXplID0gdGhpcy5fZ2V0Q2VsbFNpemUoKTtcblxuICAgIC8vIGNlbGwgY29vcmRpbmF0ZXMgcmFuZ2UgZm9yIHRoZSBjdXJyZW50IHZpZXdcbiAgICB2YXIgY2VsbEJvdW5kcyA9IEwuYm91bmRzKFxuICAgICAgYm91bmRzLm1pbi5kaXZpZGVCeShjZWxsU2l6ZSkuZmxvb3IoKSxcbiAgICAgIGJvdW5kcy5tYXguZGl2aWRlQnkoY2VsbFNpemUpLmZsb29yKCkpO1xuXG4gICAgdGhpcy5fcmVtb3ZlT3RoZXJDZWxscyhjZWxsQm91bmRzKTtcbiAgICB0aGlzLl9hZGRDZWxscyhjZWxsQm91bmRzKTtcblxuICAgIHRoaXMuZmlyZSgnY2VsbHN1cGRhdGVkJyk7XG4gIH0sXG5cbiAgX2FkZENlbGxzOiBmdW5jdGlvbiAoYm91bmRzKSB7XG4gICAgdmFyIHF1ZXVlID0gW107XG4gICAgdmFyIGNlbnRlciA9IGJvdW5kcy5nZXRDZW50ZXIoKTtcbiAgICB2YXIgem9vbSA9IHRoaXMuX21hcC5nZXRab29tKCk7XG5cbiAgICB2YXIgaiwgaSwgY29vcmRzO1xuICAgIC8vIGNyZWF0ZSBhIHF1ZXVlIG9mIGNvb3JkaW5hdGVzIHRvIGxvYWQgY2VsbHMgZnJvbVxuICAgIGZvciAoaiA9IGJvdW5kcy5taW4ueTsgaiA8PSBib3VuZHMubWF4Lnk7IGorKykge1xuICAgICAgZm9yIChpID0gYm91bmRzLm1pbi54OyBpIDw9IGJvdW5kcy5tYXgueDsgaSsrKSB7XG4gICAgICAgIGNvb3JkcyA9IEwucG9pbnQoaSwgaik7XG4gICAgICAgIGNvb3Jkcy56ID0gem9vbTtcblxuICAgICAgICBpZiAodGhpcy5faXNWYWxpZENlbGwoY29vcmRzKSkge1xuICAgICAgICAgIHF1ZXVlLnB1c2goY29vcmRzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBjZWxsc1RvTG9hZCA9IHF1ZXVlLmxlbmd0aDtcblxuICAgIGlmIChjZWxsc1RvTG9hZCA9PT0gMCkgeyByZXR1cm47IH1cblxuICAgIHRoaXMuX2NlbGxzVG9Mb2FkICs9IGNlbGxzVG9Mb2FkO1xuICAgIHRoaXMuX2NlbGxzVG90YWwgKz0gY2VsbHNUb0xvYWQ7XG5cbiAgICAvLyBzb3J0IGNlbGwgcXVldWUgdG8gbG9hZCBjZWxscyBpbiBvcmRlciBvZiB0aGVpciBkaXN0YW5jZSB0byBjZW50ZXJcbiAgICBxdWV1ZS5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICByZXR1cm4gYS5kaXN0YW5jZVRvKGNlbnRlcikgLSBiLmRpc3RhbmNlVG8oY2VudGVyKTtcbiAgICB9KTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCBjZWxsc1RvTG9hZDsgaSsrKSB7XG4gICAgICB0aGlzLl9hZGRDZWxsKHF1ZXVlW2ldKTtcbiAgICB9XG4gIH0sXG5cbiAgX2lzVmFsaWRDZWxsOiBmdW5jdGlvbiAoY29vcmRzKSB7XG4gICAgdmFyIGNycyA9IHRoaXMuX21hcC5vcHRpb25zLmNycztcblxuICAgIGlmICghY3JzLmluZmluaXRlKSB7XG4gICAgICAvLyBkb24ndCBsb2FkIGNlbGwgaWYgaXQncyBvdXQgb2YgYm91bmRzIGFuZCBub3Qgd3JhcHBlZFxuICAgICAgdmFyIGJvdW5kcyA9IHRoaXMuX2NlbGxOdW1Cb3VuZHM7XG4gICAgICBpZiAoXG4gICAgICAgICghY3JzLndyYXBMbmcgJiYgKGNvb3Jkcy54IDwgYm91bmRzLm1pbi54IHx8IGNvb3Jkcy54ID4gYm91bmRzLm1heC54KSkgfHxcbiAgICAgICAgKCFjcnMud3JhcExhdCAmJiAoY29vcmRzLnkgPCBib3VuZHMubWluLnkgfHwgY29vcmRzLnkgPiBib3VuZHMubWF4LnkpKVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5ib3VuZHMpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIGRvbid0IGxvYWQgY2VsbCBpZiBpdCBkb2Vzbid0IGludGVyc2VjdCB0aGUgYm91bmRzIGluIG9wdGlvbnNcbiAgICB2YXIgY2VsbEJvdW5kcyA9IHRoaXMuX2NlbGxDb29yZHNUb0JvdW5kcyhjb29yZHMpO1xuICAgIHJldHVybiBMLmxhdExuZ0JvdW5kcyh0aGlzLm9wdGlvbnMuYm91bmRzKS5pbnRlcnNlY3RzKGNlbGxCb3VuZHMpO1xuICB9LFxuXG4gIC8vIGNvbnZlcnRzIGNlbGwgY29vcmRpbmF0ZXMgdG8gaXRzIGdlb2dyYXBoaWNhbCBib3VuZHNcbiAgX2NlbGxDb29yZHNUb0JvdW5kczogZnVuY3Rpb24gKGNvb3Jkcykge1xuICAgIHZhciBtYXAgPSB0aGlzLl9tYXA7XG4gICAgdmFyIGNlbGxTaXplID0gdGhpcy5vcHRpb25zLmNlbGxTaXplO1xuICAgIHZhciBud1BvaW50ID0gY29vcmRzLm11bHRpcGx5QnkoY2VsbFNpemUpO1xuICAgIHZhciBzZVBvaW50ID0gbndQb2ludC5hZGQoW2NlbGxTaXplLCBjZWxsU2l6ZV0pO1xuICAgIHZhciBudyA9IG1hcC53cmFwTGF0TG5nKG1hcC51bnByb2plY3QobndQb2ludCwgY29vcmRzLnopKTtcbiAgICB2YXIgc2UgPSBtYXAud3JhcExhdExuZyhtYXAudW5wcm9qZWN0KHNlUG9pbnQsIGNvb3Jkcy56KSk7XG5cbiAgICByZXR1cm4gTC5sYXRMbmdCb3VuZHMobncsIHNlKTtcbiAgfSxcblxuICAvLyBjb252ZXJ0cyBjZWxsIGNvb3JkaW5hdGVzIHRvIGtleSBmb3IgdGhlIGNlbGwgY2FjaGVcbiAgX2NlbGxDb29yZHNUb0tleTogZnVuY3Rpb24gKGNvb3Jkcykge1xuICAgIHJldHVybiBjb29yZHMueCArICc6JyArIGNvb3Jkcy55O1xuICB9LFxuXG4gIC8vIGNvbnZlcnRzIGNlbGwgY2FjaGUga2V5IHRvIGNvb3JkaWFudGVzXG4gIF9rZXlUb0NlbGxDb29yZHM6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICB2YXIga0FyciA9IGtleS5zcGxpdCgnOicpO1xuICAgIHZhciB4ID0gcGFyc2VJbnQoa0FyclswXSwgMTApO1xuICAgIHZhciB5ID0gcGFyc2VJbnQoa0FyclsxXSwgMTApO1xuXG4gICAgcmV0dXJuIEwucG9pbnQoeCwgeSk7XG4gIH0sXG5cbiAgLy8gcmVtb3ZlIGFueSBwcmVzZW50IGNlbGxzIHRoYXQgYXJlIG9mZiB0aGUgc3BlY2lmaWVkIGJvdW5kc1xuICBfcmVtb3ZlT3RoZXJDZWxsczogZnVuY3Rpb24gKGJvdW5kcykge1xuICAgIGZvciAodmFyIGtleSBpbiB0aGlzLl9jZWxscykge1xuICAgICAgaWYgKCFib3VuZHMuY29udGFpbnModGhpcy5fa2V5VG9DZWxsQ29vcmRzKGtleSkpKSB7XG4gICAgICAgIHRoaXMuX3JlbW92ZUNlbGwoa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgX3JlbW92ZUNlbGw6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICB2YXIgY2VsbCA9IHRoaXMuX2FjdGl2ZUNlbGxzW2tleV07XG5cbiAgICBpZiAoY2VsbCkge1xuICAgICAgZGVsZXRlIHRoaXMuX2FjdGl2ZUNlbGxzW2tleV07XG5cbiAgICAgIGlmICh0aGlzLmNlbGxMZWF2ZSkge1xuICAgICAgICB0aGlzLmNlbGxMZWF2ZShjZWxsLmJvdW5kcywgY2VsbC5jb29yZHMpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmZpcmUoJ2NlbGxsZWF2ZScsIHtcbiAgICAgICAgYm91bmRzOiBjZWxsLmJvdW5kcyxcbiAgICAgICAgY29vcmRzOiBjZWxsLmNvb3Jkc1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIF9yZW1vdmVDZWxsczogZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGtleSBpbiB0aGlzLl9jZWxscykge1xuICAgICAgdmFyIGJvdW5kcyA9IHRoaXMuX2NlbGxzW2tleV0uYm91bmRzO1xuICAgICAgdmFyIGNvb3JkcyA9IHRoaXMuX2NlbGxzW2tleV0uY29vcmRzO1xuXG4gICAgICBpZiAodGhpcy5jZWxsTGVhdmUpIHtcbiAgICAgICAgdGhpcy5jZWxsTGVhdmUoYm91bmRzLCBjb29yZHMpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmZpcmUoJ2NlbGxsZWF2ZScsIHtcbiAgICAgICAgYm91bmRzOiBib3VuZHMsXG4gICAgICAgIGNvb3JkczogY29vcmRzXG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgX2FkZENlbGw6IGZ1bmN0aW9uIChjb29yZHMpIHtcbiAgICAvLyB3cmFwIGNlbGwgY29vcmRzIGlmIG5lY2Vzc2FyeSAoZGVwZW5kaW5nIG9uIENSUylcbiAgICB0aGlzLl93cmFwQ29vcmRzKGNvb3Jkcyk7XG5cbiAgICAvLyBnZW5lcmF0ZSB0aGUgY2VsbCBrZXlcbiAgICB2YXIga2V5ID0gdGhpcy5fY2VsbENvb3Jkc1RvS2V5KGNvb3Jkcyk7XG5cbiAgICAvLyBnZXQgdGhlIGNlbGwgZnJvbSB0aGUgY2FjaGVcbiAgICB2YXIgY2VsbCA9IHRoaXMuX2NlbGxzW2tleV07XG4gICAgLy8gaWYgdGhpcyBjZWxsIHNob3VsZCBiZSBzaG93biBhcyBpc250IGFjdGl2ZSB5ZXQgKGVudGVyKVxuXG4gICAgaWYgKGNlbGwgJiYgIXRoaXMuX2FjdGl2ZUNlbGxzW2tleV0pIHtcbiAgICAgIGlmICh0aGlzLmNlbGxFbnRlcikge1xuICAgICAgICB0aGlzLmNlbGxFbnRlcihjZWxsLmJvdW5kcywgY29vcmRzKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5maXJlKCdjZWxsZW50ZXInLCB7XG4gICAgICAgIGJvdW5kczogY2VsbC5ib3VuZHMsXG4gICAgICAgIGNvb3JkczogY29vcmRzXG4gICAgICB9KTtcblxuICAgICAgdGhpcy5fYWN0aXZlQ2VsbHNba2V5XSA9IGNlbGw7XG4gICAgfVxuXG4gICAgLy8gaWYgd2UgZG9udCBoYXZlIHRoaXMgY2VsbCBpbiB0aGUgY2FjaGUgeWV0IChjcmVhdGUpXG4gICAgaWYgKCFjZWxsKSB7XG4gICAgICBjZWxsID0ge1xuICAgICAgICBjb29yZHM6IGNvb3JkcyxcbiAgICAgICAgYm91bmRzOiB0aGlzLl9jZWxsQ29vcmRzVG9Cb3VuZHMoY29vcmRzKVxuICAgICAgfTtcblxuICAgICAgdGhpcy5fY2VsbHNba2V5XSA9IGNlbGw7XG4gICAgICB0aGlzLl9hY3RpdmVDZWxsc1trZXldID0gY2VsbDtcblxuICAgICAgaWYgKHRoaXMuY3JlYXRlQ2VsbCkge1xuICAgICAgICB0aGlzLmNyZWF0ZUNlbGwoY2VsbC5ib3VuZHMsIGNvb3Jkcyk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuZmlyZSgnY2VsbGNyZWF0ZScsIHtcbiAgICAgICAgYm91bmRzOiBjZWxsLmJvdW5kcyxcbiAgICAgICAgY29vcmRzOiBjb29yZHNcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBfd3JhcENvb3JkczogZnVuY3Rpb24gKGNvb3Jkcykge1xuICAgIGNvb3Jkcy54ID0gdGhpcy5fd3JhcExuZyA/IEwuVXRpbC53cmFwTnVtKGNvb3Jkcy54LCB0aGlzLl93cmFwTG5nKSA6IGNvb3Jkcy54O1xuICAgIGNvb3Jkcy55ID0gdGhpcy5fd3JhcExhdCA/IEwuVXRpbC53cmFwTnVtKGNvb3Jkcy55LCB0aGlzLl93cmFwTGF0KSA6IGNvb3Jkcy55O1xuICB9LFxuXG4gIC8vIGdldCB0aGUgZ2xvYmFsIGNlbGwgY29vcmRpbmF0ZXMgcmFuZ2UgZm9yIHRoZSBjdXJyZW50IHpvb21cbiAgX2dldENlbGxOdW1Cb3VuZHM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYm91bmRzID0gdGhpcy5fbWFwLmdldFBpeGVsV29ybGRCb3VuZHMoKTtcbiAgICB2YXIgc2l6ZSA9IHRoaXMuX2dldENlbGxTaXplKCk7XG5cbiAgICByZXR1cm4gYm91bmRzID8gTC5ib3VuZHMoXG4gICAgICAgIGJvdW5kcy5taW4uZGl2aWRlQnkoc2l6ZSkuZmxvb3IoKSxcbiAgICAgICAgYm91bmRzLm1heC5kaXZpZGVCeShzaXplKS5jZWlsKCkuc3VidHJhY3QoWzEsIDFdKSkgOiBudWxsO1xuICB9XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgVmlydHVhbEdyaWQ7XG4iLCJmdW5jdGlvbiBCaW5hcnlTZWFyY2hJbmRleCAodmFsdWVzKSB7XG4gIHRoaXMudmFsdWVzID0gW10uY29uY2F0KHZhbHVlcyB8fCBbXSk7XG59XG5cbkJpbmFyeVNlYXJjaEluZGV4LnByb3RvdHlwZS5xdWVyeSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICB2YXIgaW5kZXggPSB0aGlzLmdldEluZGV4KHZhbHVlKTtcbiAgcmV0dXJuIHRoaXMudmFsdWVzW2luZGV4XTtcbn07XG5cbkJpbmFyeVNlYXJjaEluZGV4LnByb3RvdHlwZS5nZXRJbmRleCA9IGZ1bmN0aW9uIGdldEluZGV4ICh2YWx1ZSkge1xuICBpZiAodGhpcy5kaXJ0eSkge1xuICAgIHRoaXMuc29ydCgpO1xuICB9XG5cbiAgdmFyIG1pbkluZGV4ID0gMDtcbiAgdmFyIG1heEluZGV4ID0gdGhpcy52YWx1ZXMubGVuZ3RoIC0gMTtcbiAgdmFyIGN1cnJlbnRJbmRleDtcbiAgdmFyIGN1cnJlbnRFbGVtZW50O1xuXG4gIHdoaWxlIChtaW5JbmRleCA8PSBtYXhJbmRleCkge1xuICAgIGN1cnJlbnRJbmRleCA9IChtaW5JbmRleCArIG1heEluZGV4KSAvIDIgfCAwO1xuICAgIGN1cnJlbnRFbGVtZW50ID0gdGhpcy52YWx1ZXNbTWF0aC5yb3VuZChjdXJyZW50SW5kZXgpXTtcbiAgICBpZiAoK2N1cnJlbnRFbGVtZW50LnZhbHVlIDwgK3ZhbHVlKSB7XG4gICAgICBtaW5JbmRleCA9IGN1cnJlbnRJbmRleCArIDE7XG4gICAgfSBlbHNlIGlmICgrY3VycmVudEVsZW1lbnQudmFsdWUgPiArdmFsdWUpIHtcbiAgICAgIG1heEluZGV4ID0gY3VycmVudEluZGV4IC0gMTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN1cnJlbnRJbmRleDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gTWF0aC5hYnMofm1heEluZGV4KTtcbn07XG5cbkJpbmFyeVNlYXJjaEluZGV4LnByb3RvdHlwZS5iZXR3ZWVuID0gZnVuY3Rpb24gYmV0d2VlbiAoc3RhcnQsIGVuZCkge1xuICB2YXIgc3RhcnRJbmRleCA9IHRoaXMuZ2V0SW5kZXgoc3RhcnQpO1xuICB2YXIgZW5kSW5kZXggPSB0aGlzLmdldEluZGV4KGVuZCk7XG5cbiAgaWYgKHN0YXJ0SW5kZXggPT09IDAgJiYgZW5kSW5kZXggPT09IDApIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICB3aGlsZSAodGhpcy52YWx1ZXNbc3RhcnRJbmRleCAtIDFdICYmIHRoaXMudmFsdWVzW3N0YXJ0SW5kZXggLSAxXS52YWx1ZSA9PT0gc3RhcnQpIHtcbiAgICBzdGFydEluZGV4LS07XG4gIH1cblxuICB3aGlsZSAodGhpcy52YWx1ZXNbZW5kSW5kZXggKyAxXSAmJiB0aGlzLnZhbHVlc1tlbmRJbmRleCArIDFdLnZhbHVlID09PSBlbmQpIHtcbiAgICBlbmRJbmRleCsrO1xuICB9XG5cbiAgaWYgKHRoaXMudmFsdWVzW2VuZEluZGV4XSAmJiB0aGlzLnZhbHVlc1tlbmRJbmRleF0udmFsdWUgPT09IGVuZCAmJiB0aGlzLnZhbHVlc1tlbmRJbmRleCArIDFdKSB7XG4gICAgZW5kSW5kZXgrKztcbiAgfVxuXG4gIHJldHVybiB0aGlzLnZhbHVlcy5zbGljZShzdGFydEluZGV4LCBlbmRJbmRleCk7XG59O1xuXG5CaW5hcnlTZWFyY2hJbmRleC5wcm90b3R5cGUuaW5zZXJ0ID0gZnVuY3Rpb24gaW5zZXJ0IChpdGVtKSB7XG4gIHRoaXMudmFsdWVzLnNwbGljZSh0aGlzLmdldEluZGV4KGl0ZW0udmFsdWUpLCAwLCBpdGVtKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5CaW5hcnlTZWFyY2hJbmRleC5wcm90b3R5cGUuYnVsa0FkZCA9IGZ1bmN0aW9uIGJ1bGtBZGQgKGl0ZW1zLCBzb3J0KSB7XG4gIHRoaXMudmFsdWVzID0gdGhpcy52YWx1ZXMuY29uY2F0KFtdLmNvbmNhdChpdGVtcyB8fCBbXSkpO1xuXG4gIGlmIChzb3J0KSB7XG4gICAgdGhpcy5zb3J0KCk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5kaXJ0eSA9IHRydWU7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkJpbmFyeVNlYXJjaEluZGV4LnByb3RvdHlwZS5zb3J0ID0gZnVuY3Rpb24gc29ydCAoKSB7XG4gIHRoaXMudmFsdWVzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICByZXR1cm4gK2IudmFsdWUgLSArYS52YWx1ZTtcbiAgfSkucmV2ZXJzZSgpO1xuICB0aGlzLmRpcnR5ID0gZmFsc2U7XG4gIHJldHVybiB0aGlzO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgQmluYXJ5U2VhcmNoSW5kZXg7XG4iLCJpbXBvcnQgTCBmcm9tICdsZWFmbGV0JztcbmltcG9ydCBmZWF0dXJlTGF5ZXJTZXJ2aWNlIGZyb20gJy4uLy4uL1NlcnZpY2VzL0ZlYXR1cmVMYXllclNlcnZpY2UnO1xuaW1wb3J0IHsgY2xlYW5VcmwsIHdhcm4sIHNldEVzcmlBdHRyaWJ1dGlvbiB9IGZyb20gJy4uLy4uL1V0aWwnO1xuaW1wb3J0IFZpcnR1YWxHcmlkIGZyb20gJ2xlYWZsZXQtdmlydHVhbC1ncmlkJztcbmltcG9ydCBCaW5hcnlTZWFyY2hJbmRleCBmcm9tICd0aW55LWJpbmFyeS1zZWFyY2gnO1xuXG5leHBvcnQgdmFyIEZlYXR1cmVNYW5hZ2VyID0gVmlydHVhbEdyaWQuZXh0ZW5kKHtcbiAgLyoqXG4gICAqIE9wdGlvbnNcbiAgICovXG5cbiAgb3B0aW9uczoge1xuICAgIGF0dHJpYnV0aW9uOiBudWxsLFxuICAgIHdoZXJlOiAnMT0xJyxcbiAgICBmaWVsZHM6IFsnKiddLFxuICAgIGZyb206IGZhbHNlLFxuICAgIHRvOiBmYWxzZSxcbiAgICB0aW1lRmllbGQ6IGZhbHNlLFxuICAgIHRpbWVGaWx0ZXJNb2RlOiAnc2VydmVyJyxcbiAgICBzaW1wbGlmeUZhY3RvcjogMCxcbiAgICBwcmVjaXNpb246IDZcbiAgfSxcblxuICAvKipcbiAgICogQ29uc3RydWN0b3JcbiAgICovXG5cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBWaXJ0dWFsR3JpZC5wcm90b3R5cGUuaW5pdGlhbGl6ZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXG4gICAgb3B0aW9ucy51cmwgPSBjbGVhblVybChvcHRpb25zLnVybCk7XG4gICAgb3B0aW9ucyA9IEwuc2V0T3B0aW9ucyh0aGlzLCBvcHRpb25zKTtcblxuICAgIHRoaXMuc2VydmljZSA9IGZlYXR1cmVMYXllclNlcnZpY2Uob3B0aW9ucyk7XG4gICAgdGhpcy5zZXJ2aWNlLmFkZEV2ZW50UGFyZW50KHRoaXMpO1xuXG4gICAgLy8gdXNlIGNhc2UgaW5zZW5zaXRpdmUgcmVnZXggdG8gbG9vayBmb3IgY29tbW9uIGZpZWxkbmFtZXMgdXNlZCBmb3IgaW5kZXhpbmdcbiAgICBpZiAodGhpcy5vcHRpb25zLmZpZWxkc1swXSAhPT0gJyonKSB7XG4gICAgICB2YXIgb2lkQ2hlY2sgPSBmYWxzZTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5vcHRpb25zLmZpZWxkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLmZpZWxkc1tpXS5tYXRjaCgvXihPQkpFQ1RJRHxGSUR8T0lEfElEKSQvaSkpIHtcbiAgICAgICAgICBvaWRDaGVjayA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChvaWRDaGVjayA9PT0gZmFsc2UpIHtcbiAgICAgICAgd2Fybignbm8ga25vd24gZXNyaUZpZWxkVHlwZU9JRCBmaWVsZCBkZXRlY3RlZCBpbiBmaWVsZHMgQXJyYXkuICBQbGVhc2UgYWRkIGFuIGF0dHJpYnV0ZSBmaWVsZCBjb250YWluaW5nIHVuaXF1ZSBJRHMgdG8gZW5zdXJlIHRoZSBsYXllciBjYW4gYmUgZHJhd24gY29ycmVjdGx5LicpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMudGltZUZpZWxkLnN0YXJ0ICYmIHRoaXMub3B0aW9ucy50aW1lRmllbGQuZW5kKSB7XG4gICAgICB0aGlzLl9zdGFydFRpbWVJbmRleCA9IG5ldyBCaW5hcnlTZWFyY2hJbmRleCgpO1xuICAgICAgdGhpcy5fZW5kVGltZUluZGV4ID0gbmV3IEJpbmFyeVNlYXJjaEluZGV4KCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMudGltZUZpZWxkKSB7XG4gICAgICB0aGlzLl90aW1lSW5kZXggPSBuZXcgQmluYXJ5U2VhcmNoSW5kZXgoKTtcbiAgICB9XG5cbiAgICB0aGlzLl9jYWNoZSA9IHt9O1xuICAgIHRoaXMuX2N1cnJlbnRTbmFwc2hvdCA9IFtdOyAvLyBjYWNoZSBvZiB3aGF0IGxheWVycyBzaG91bGQgYmUgYWN0aXZlXG4gICAgdGhpcy5fYWN0aXZlUmVxdWVzdHMgPSAwO1xuICB9LFxuXG4gIC8qKlxuICAgKiBMYXllciBJbnRlcmZhY2VcbiAgICovXG5cbiAgb25BZGQ6IGZ1bmN0aW9uIChtYXApIHtcbiAgICAvLyBpbmNsdWRlICdQb3dlcmVkIGJ5IEVzcmknIGluIG1hcCBhdHRyaWJ1dGlvblxuICAgIHNldEVzcmlBdHRyaWJ1dGlvbihtYXApO1xuXG4gICAgdGhpcy5zZXJ2aWNlLm1ldGFkYXRhKGZ1bmN0aW9uIChlcnIsIG1ldGFkYXRhKSB7XG4gICAgICBpZiAoIWVycikge1xuICAgICAgICB2YXIgc3VwcG9ydGVkRm9ybWF0cyA9IG1ldGFkYXRhLnN1cHBvcnRlZFF1ZXJ5Rm9ybWF0cztcbiAgICAgICAgLy8gY2hlY2sgdG8gc2VlIHdoZXRoZXIgc2VydmljZSBjYW4gZW1pdCBHZW9KU09OIG5hdGl2ZWx5XG4gICAgICAgIGlmIChzdXBwb3J0ZWRGb3JtYXRzICYmIHN1cHBvcnRlZEZvcm1hdHMuaW5kZXhPZignZ2VvSlNPTicpICE9PSAtMSkge1xuICAgICAgICAgIHRoaXMuc2VydmljZS5vcHRpb25zLmlzTW9kZXJuID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBhZGQgY29weXJpZ2h0IHRleHQgbGlzdGVkIGluIHNlcnZpY2UgbWV0YWRhdGFcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuYXR0cmlidXRpb24gJiYgbWFwLmF0dHJpYnV0aW9uQ29udHJvbCAmJiBtZXRhZGF0YS5jb3B5cmlnaHRUZXh0KSB7XG4gICAgICAgICAgdGhpcy5vcHRpb25zLmF0dHJpYnV0aW9uID0gbWV0YWRhdGEuY29weXJpZ2h0VGV4dDtcbiAgICAgICAgICBtYXAuYXR0cmlidXRpb25Db250cm9sLmFkZEF0dHJpYnV0aW9uKHRoaXMuZ2V0QXR0cmlidXRpb24oKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LCB0aGlzKTtcblxuICAgIG1hcC5vbignem9vbWVuZCcsIHRoaXMuX2hhbmRsZVpvb21DaGFuZ2UsIHRoaXMpO1xuXG4gICAgcmV0dXJuIFZpcnR1YWxHcmlkLnByb3RvdHlwZS5vbkFkZC5jYWxsKHRoaXMsIG1hcCk7XG4gIH0sXG5cbiAgb25SZW1vdmU6IGZ1bmN0aW9uIChtYXApIHtcbiAgICBtYXAub2ZmKCd6b29tZW5kJywgdGhpcy5faGFuZGxlWm9vbUNoYW5nZSwgdGhpcyk7XG5cbiAgICByZXR1cm4gVmlydHVhbEdyaWQucHJvdG90eXBlLm9uUmVtb3ZlLmNhbGwodGhpcywgbWFwKTtcbiAgfSxcblxuICBnZXRBdHRyaWJ1dGlvbjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm9wdGlvbnMuYXR0cmlidXRpb247XG4gIH0sXG5cbiAgLyoqXG4gICAqIEZlYXR1cmUgTWFuYWdlbWVudFxuICAgKi9cblxuICBjcmVhdGVDZWxsOiBmdW5jdGlvbiAoYm91bmRzLCBjb29yZHMpIHtcbiAgICB0aGlzLl9yZXF1ZXN0RmVhdHVyZXMoYm91bmRzLCBjb29yZHMpO1xuICB9LFxuXG4gIF9yZXF1ZXN0RmVhdHVyZXM6IGZ1bmN0aW9uIChib3VuZHMsIGNvb3JkcywgY2FsbGJhY2spIHtcbiAgICB0aGlzLl9hY3RpdmVSZXF1ZXN0cysrO1xuXG4gICAgLy8gb3VyIGZpcnN0IGFjdGl2ZSByZXF1ZXN0IGZpcmVzIGxvYWRpbmdcbiAgICBpZiAodGhpcy5fYWN0aXZlUmVxdWVzdHMgPT09IDEpIHtcbiAgICAgIHRoaXMuZmlyZSgnbG9hZGluZycsIHtcbiAgICAgICAgYm91bmRzOiBib3VuZHNcbiAgICAgIH0sIHRydWUpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9idWlsZFF1ZXJ5KGJvdW5kcykucnVuKGZ1bmN0aW9uIChlcnJvciwgZmVhdHVyZUNvbGxlY3Rpb24sIHJlc3BvbnNlKSB7XG4gICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UuZXhjZWVkZWRUcmFuc2ZlckxpbWl0KSB7XG4gICAgICAgIHRoaXMuZmlyZSgnZHJhd2xpbWl0ZXhjZWVkZWQnKTtcbiAgICAgIH1cblxuICAgICAgLy8gbm8gZXJyb3IsIGZlYXR1cmVzXG4gICAgICBpZiAoIWVycm9yICYmIGZlYXR1cmVDb2xsZWN0aW9uICYmIGZlYXR1cmVDb2xsZWN0aW9uLmZlYXR1cmVzLmxlbmd0aCkge1xuICAgICAgICAvLyBzY2hlZHVsZSBhZGRpbmcgZmVhdHVyZXMgdW50aWwgdGhlIG5leHQgYW5pbWF0aW9uIGZyYW1lXG4gICAgICAgIEwuVXRpbC5yZXF1ZXN0QW5pbUZyYW1lKEwuVXRpbC5iaW5kKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB0aGlzLl9hZGRGZWF0dXJlcyhmZWF0dXJlQ29sbGVjdGlvbi5mZWF0dXJlcywgY29vcmRzKTtcbiAgICAgICAgICB0aGlzLl9wb3N0UHJvY2Vzc0ZlYXR1cmVzKGJvdW5kcyk7XG4gICAgICAgIH0sIHRoaXMpKTtcbiAgICAgIH1cblxuICAgICAgLy8gbm8gZXJyb3IsIG5vIGZlYXR1cmVzXG4gICAgICBpZiAoIWVycm9yICYmIGZlYXR1cmVDb2xsZWN0aW9uICYmICFmZWF0dXJlQ29sbGVjdGlvbi5mZWF0dXJlcy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5fcG9zdFByb2Nlc3NGZWF0dXJlcyhib3VuZHMpO1xuICAgICAgfVxuXG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgdGhpcy5fcG9zdFByb2Nlc3NGZWF0dXJlcyhib3VuZHMpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbCh0aGlzLCBlcnJvciwgZmVhdHVyZUNvbGxlY3Rpb24pO1xuICAgICAgfVxuICAgIH0sIHRoaXMpO1xuICB9LFxuXG4gIF9wb3N0UHJvY2Vzc0ZlYXR1cmVzOiBmdW5jdGlvbiAoYm91bmRzKSB7XG4gICAgLy8gZGVpbmNyaW1lbnQgdGhlIHJlcXVlc3QgY291bnRlciBub3cgdGhhdCB3ZSBoYXZlIHByb2Nlc3NlZCBmZWF0dXJlc1xuICAgIHRoaXMuX2FjdGl2ZVJlcXVlc3RzLS07XG5cbiAgICAvLyBpZiB0aGVyZSBhcmUgbm8gbW9yZSBhY3RpdmUgcmVxdWVzdHMgZmlyZSBhIGxvYWQgZXZlbnQgZm9yIHRoaXMgdmlld1xuICAgIGlmICh0aGlzLl9hY3RpdmVSZXF1ZXN0cyA8PSAwKSB7XG4gICAgICB0aGlzLmZpcmUoJ2xvYWQnLCB7XG4gICAgICAgIGJvdW5kczogYm91bmRzXG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG5cbiAgX2NhY2hlS2V5OiBmdW5jdGlvbiAoY29vcmRzKSB7XG4gICAgcmV0dXJuIGNvb3Jkcy56ICsgJzonICsgY29vcmRzLnggKyAnOicgKyBjb29yZHMueTtcbiAgfSxcblxuICBfYWRkRmVhdHVyZXM6IGZ1bmN0aW9uIChmZWF0dXJlcywgY29vcmRzKSB7XG4gICAgdmFyIGtleSA9IHRoaXMuX2NhY2hlS2V5KGNvb3Jkcyk7XG4gICAgdGhpcy5fY2FjaGVba2V5XSA9IHRoaXMuX2NhY2hlW2tleV0gfHwgW107XG5cbiAgICBmb3IgKHZhciBpID0gZmVhdHVyZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIHZhciBpZCA9IGZlYXR1cmVzW2ldLmlkO1xuICAgICAgdGhpcy5fY3VycmVudFNuYXBzaG90LnB1c2goaWQpO1xuICAgICAgdGhpcy5fY2FjaGVba2V5XS5wdXNoKGlkKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnRpbWVGaWVsZCkge1xuICAgICAgdGhpcy5fYnVpbGRUaW1lSW5kZXhlcyhmZWF0dXJlcyk7XG4gICAgfVxuXG4gICAgLy8gbmVlZCB0byBQUiByZW1vdmFsIG9mIHRoZSBsb2dpYyBiZWxvdyB0b28uLi5cbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vcGF0cmlja2FybHQvbGVhZmxldC12aXJ0dWFsLWdyaWQvYmxvYi9tYXN0ZXIvc3JjL3ZpcnR1YWwtZ3JpZC5qcyNMMTAwLUwxMDJcblxuICAgIHRoaXMuY3JlYXRlTGF5ZXJzKGZlYXR1cmVzKTtcbiAgfSxcblxuICBfYnVpbGRRdWVyeTogZnVuY3Rpb24gKGJvdW5kcykge1xuICAgIHZhciBxdWVyeSA9IHRoaXMuc2VydmljZS5xdWVyeSgpXG4gICAgICAuaW50ZXJzZWN0cyhib3VuZHMpXG4gICAgICAud2hlcmUodGhpcy5vcHRpb25zLndoZXJlKVxuICAgICAgLmZpZWxkcyh0aGlzLm9wdGlvbnMuZmllbGRzKVxuICAgICAgLnByZWNpc2lvbih0aGlzLm9wdGlvbnMucHJlY2lzaW9uKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuc2ltcGxpZnlGYWN0b3IpIHtcbiAgICAgIHF1ZXJ5LnNpbXBsaWZ5KHRoaXMuX21hcCwgdGhpcy5vcHRpb25zLnNpbXBsaWZ5RmFjdG9yKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnRpbWVGaWx0ZXJNb2RlID09PSAnc2VydmVyJyAmJiB0aGlzLm9wdGlvbnMuZnJvbSAmJiB0aGlzLm9wdGlvbnMudG8pIHtcbiAgICAgIHF1ZXJ5LmJldHdlZW4odGhpcy5vcHRpb25zLmZyb20sIHRoaXMub3B0aW9ucy50byk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHF1ZXJ5O1xuICB9LFxuXG4gIC8qKlxuICAgKiBXaGVyZSBNZXRob2RzXG4gICAqL1xuXG4gIHNldFdoZXJlOiBmdW5jdGlvbiAod2hlcmUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgdGhpcy5vcHRpb25zLndoZXJlID0gKHdoZXJlICYmIHdoZXJlLmxlbmd0aCkgPyB3aGVyZSA6ICcxPTEnO1xuXG4gICAgdmFyIG9sZFNuYXBzaG90ID0gW107XG4gICAgdmFyIG5ld1NuYXBzaG90ID0gW107XG4gICAgdmFyIHBlbmRpbmdSZXF1ZXN0cyA9IDA7XG4gICAgdmFyIHJlcXVlc3RFcnJvciA9IG51bGw7XG4gICAgdmFyIHJlcXVlc3RDYWxsYmFjayA9IEwuVXRpbC5iaW5kKGZ1bmN0aW9uIChlcnJvciwgZmVhdHVyZUNvbGxlY3Rpb24pIHtcbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICByZXF1ZXN0RXJyb3IgPSBlcnJvcjtcbiAgICAgIH1cblxuICAgICAgaWYgKGZlYXR1cmVDb2xsZWN0aW9uKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSBmZWF0dXJlQ29sbGVjdGlvbi5mZWF0dXJlcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgIG5ld1NuYXBzaG90LnB1c2goZmVhdHVyZUNvbGxlY3Rpb24uZmVhdHVyZXNbaV0uaWQpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHBlbmRpbmdSZXF1ZXN0cy0tO1xuXG4gICAgICBpZiAocGVuZGluZ1JlcXVlc3RzIDw9IDApIHtcbiAgICAgICAgdGhpcy5fY3VycmVudFNuYXBzaG90ID0gbmV3U25hcHNob3Q7XG4gICAgICAgIC8vIHNjaGVkdWxlIGFkZGluZyBmZWF0dXJlcyBmb3IgdGhlIG5leHQgYW5pbWF0aW9uIGZyYW1lXG4gICAgICAgIEwuVXRpbC5yZXF1ZXN0QW5pbUZyYW1lKEwuVXRpbC5iaW5kKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB0aGlzLnJlbW92ZUxheWVycyhvbGRTbmFwc2hvdCk7XG4gICAgICAgICAgdGhpcy5hZGRMYXllcnMobmV3U25hcHNob3QpO1xuICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgY2FsbGJhY2suY2FsbChjb250ZXh0LCByZXF1ZXN0RXJyb3IpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSwgdGhpcykpO1xuICAgICAgfVxuICAgIH0sIHRoaXMpO1xuXG4gICAgZm9yICh2YXIgaSA9IHRoaXMuX2N1cnJlbnRTbmFwc2hvdC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgb2xkU25hcHNob3QucHVzaCh0aGlzLl9jdXJyZW50U25hcHNob3RbaV0pO1xuICAgIH1cblxuICAgIGZvciAodmFyIGtleSBpbiB0aGlzLl9hY3RpdmVDZWxscykge1xuICAgICAgcGVuZGluZ1JlcXVlc3RzKys7XG4gICAgICB2YXIgY29vcmRzID0gdGhpcy5fa2V5VG9DZWxsQ29vcmRzKGtleSk7XG4gICAgICB2YXIgYm91bmRzID0gdGhpcy5fY2VsbENvb3Jkc1RvQm91bmRzKGNvb3Jkcyk7XG4gICAgICB0aGlzLl9yZXF1ZXN0RmVhdHVyZXMoYm91bmRzLCBrZXksIHJlcXVlc3RDYWxsYmFjayk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgZ2V0V2hlcmU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5vcHRpb25zLndoZXJlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBUaW1lIFJhbmdlIE1ldGhvZHNcbiAgICovXG5cbiAgZ2V0VGltZVJhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFt0aGlzLm9wdGlvbnMuZnJvbSwgdGhpcy5vcHRpb25zLnRvXTtcbiAgfSxcblxuICBzZXRUaW1lUmFuZ2U6IGZ1bmN0aW9uIChmcm9tLCB0bywgY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgICB2YXIgb2xkRnJvbSA9IHRoaXMub3B0aW9ucy5mcm9tO1xuICAgIHZhciBvbGRUbyA9IHRoaXMub3B0aW9ucy50bztcbiAgICB2YXIgcGVuZGluZ1JlcXVlc3RzID0gMDtcbiAgICB2YXIgcmVxdWVzdEVycm9yID0gbnVsbDtcbiAgICB2YXIgcmVxdWVzdENhbGxiYWNrID0gTC5VdGlsLmJpbmQoZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgcmVxdWVzdEVycm9yID0gZXJyb3I7XG4gICAgICB9XG4gICAgICB0aGlzLl9maWx0ZXJFeGlzdGluZ0ZlYXR1cmVzKG9sZEZyb20sIG9sZFRvLCBmcm9tLCB0byk7XG5cbiAgICAgIHBlbmRpbmdSZXF1ZXN0cy0tO1xuXG4gICAgICBpZiAoY2FsbGJhY2sgJiYgcGVuZGluZ1JlcXVlc3RzIDw9IDApIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbChjb250ZXh0LCByZXF1ZXN0RXJyb3IpO1xuICAgICAgfVxuICAgIH0sIHRoaXMpO1xuXG4gICAgdGhpcy5vcHRpb25zLmZyb20gPSBmcm9tO1xuICAgIHRoaXMub3B0aW9ucy50byA9IHRvO1xuXG4gICAgdGhpcy5fZmlsdGVyRXhpc3RpbmdGZWF0dXJlcyhvbGRGcm9tLCBvbGRUbywgZnJvbSwgdG8pO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy50aW1lRmlsdGVyTW9kZSA9PT0gJ3NlcnZlcicpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiB0aGlzLl9hY3RpdmVDZWxscykge1xuICAgICAgICBwZW5kaW5nUmVxdWVzdHMrKztcbiAgICAgICAgdmFyIGNvb3JkcyA9IHRoaXMuX2tleVRvQ2VsbENvb3JkcyhrZXkpO1xuICAgICAgICB2YXIgYm91bmRzID0gdGhpcy5fY2VsbENvb3Jkc1RvQm91bmRzKGNvb3Jkcyk7XG4gICAgICAgIHRoaXMuX3JlcXVlc3RGZWF0dXJlcyhib3VuZHMsIGtleSwgcmVxdWVzdENhbGxiYWNrKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICByZWZyZXNoOiBmdW5jdGlvbiAoKSB7XG4gICAgZm9yICh2YXIga2V5IGluIHRoaXMuX2FjdGl2ZUNlbGxzKSB7XG4gICAgICB2YXIgY29vcmRzID0gdGhpcy5fa2V5VG9DZWxsQ29vcmRzKGtleSk7XG4gICAgICB2YXIgYm91bmRzID0gdGhpcy5fY2VsbENvb3Jkc1RvQm91bmRzKGNvb3Jkcyk7XG4gICAgICB0aGlzLl9yZXF1ZXN0RmVhdHVyZXMoYm91bmRzLCBrZXkpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnJlZHJhdykge1xuICAgICAgdGhpcy5vbmNlKCdsb2FkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmVhY2hGZWF0dXJlKGZ1bmN0aW9uIChsYXllcikge1xuICAgICAgICAgIHRoaXMuX3JlZHJhdyhsYXllci5mZWF0dXJlLmlkKTtcbiAgICAgICAgfSwgdGhpcyk7XG4gICAgICB9LCB0aGlzKTtcbiAgICB9XG4gIH0sXG5cbiAgX2ZpbHRlckV4aXN0aW5nRmVhdHVyZXM6IGZ1bmN0aW9uIChvbGRGcm9tLCBvbGRUbywgbmV3RnJvbSwgbmV3VG8pIHtcbiAgICB2YXIgbGF5ZXJzVG9SZW1vdmUgPSAob2xkRnJvbSAmJiBvbGRUbykgPyB0aGlzLl9nZXRGZWF0dXJlc0luVGltZVJhbmdlKG9sZEZyb20sIG9sZFRvKSA6IHRoaXMuX2N1cnJlbnRTbmFwc2hvdDtcbiAgICB2YXIgbGF5ZXJzVG9BZGQgPSB0aGlzLl9nZXRGZWF0dXJlc0luVGltZVJhbmdlKG5ld0Zyb20sIG5ld1RvKTtcblxuICAgIGlmIChsYXllcnNUb0FkZC5pbmRleE9mKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxheWVyc1RvQWRkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBzaG91bGRSZW1vdmVMYXllciA9IGxheWVyc1RvUmVtb3ZlLmluZGV4T2YobGF5ZXJzVG9BZGRbaV0pO1xuICAgICAgICBpZiAoc2hvdWxkUmVtb3ZlTGF5ZXIgPj0gMCkge1xuICAgICAgICAgIGxheWVyc1RvUmVtb3ZlLnNwbGljZShzaG91bGRSZW1vdmVMYXllciwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBzY2hlZHVsZSBhZGRpbmcgZmVhdHVyZXMgdW50aWwgdGhlIG5leHQgYW5pbWF0aW9uIGZyYW1lXG4gICAgTC5VdGlsLnJlcXVlc3RBbmltRnJhbWUoTC5VdGlsLmJpbmQoZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5yZW1vdmVMYXllcnMobGF5ZXJzVG9SZW1vdmUpO1xuICAgICAgdGhpcy5hZGRMYXllcnMobGF5ZXJzVG9BZGQpO1xuICAgIH0sIHRoaXMpKTtcbiAgfSxcblxuICBfZ2V0RmVhdHVyZXNJblRpbWVSYW5nZTogZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgICB2YXIgaWRzID0gW107XG4gICAgdmFyIHNlYXJjaDtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMudGltZUZpZWxkLnN0YXJ0ICYmIHRoaXMub3B0aW9ucy50aW1lRmllbGQuZW5kKSB7XG4gICAgICB2YXIgc3RhcnRUaW1lcyA9IHRoaXMuX3N0YXJ0VGltZUluZGV4LmJldHdlZW4oc3RhcnQsIGVuZCk7XG4gICAgICB2YXIgZW5kVGltZXMgPSB0aGlzLl9lbmRUaW1lSW5kZXguYmV0d2VlbihzdGFydCwgZW5kKTtcbiAgICAgIHNlYXJjaCA9IHN0YXJ0VGltZXMuY29uY2F0KGVuZFRpbWVzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2VhcmNoID0gdGhpcy5fdGltZUluZGV4LmJldHdlZW4oc3RhcnQsIGVuZCk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IHNlYXJjaC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgaWRzLnB1c2goc2VhcmNoW2ldLmlkKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaWRzO1xuICB9LFxuXG4gIF9idWlsZFRpbWVJbmRleGVzOiBmdW5jdGlvbiAoZ2VvanNvbikge1xuICAgIHZhciBpO1xuICAgIHZhciBmZWF0dXJlO1xuICAgIGlmICh0aGlzLm9wdGlvbnMudGltZUZpZWxkLnN0YXJ0ICYmIHRoaXMub3B0aW9ucy50aW1lRmllbGQuZW5kKSB7XG4gICAgICB2YXIgc3RhcnRUaW1lRW50cmllcyA9IFtdO1xuICAgICAgdmFyIGVuZFRpbWVFbnRyaWVzID0gW107XG4gICAgICBmb3IgKGkgPSBnZW9qc29uLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGZlYXR1cmUgPSBnZW9qc29uW2ldO1xuICAgICAgICBzdGFydFRpbWVFbnRyaWVzLnB1c2goe1xuICAgICAgICAgIGlkOiBmZWF0dXJlLmlkLFxuICAgICAgICAgIHZhbHVlOiBuZXcgRGF0ZShmZWF0dXJlLnByb3BlcnRpZXNbdGhpcy5vcHRpb25zLnRpbWVGaWVsZC5zdGFydF0pXG4gICAgICAgIH0pO1xuICAgICAgICBlbmRUaW1lRW50cmllcy5wdXNoKHtcbiAgICAgICAgICBpZDogZmVhdHVyZS5pZCxcbiAgICAgICAgICB2YWx1ZTogbmV3IERhdGUoZmVhdHVyZS5wcm9wZXJ0aWVzW3RoaXMub3B0aW9ucy50aW1lRmllbGQuZW5kXSlcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICB0aGlzLl9zdGFydFRpbWVJbmRleC5idWxrQWRkKHN0YXJ0VGltZUVudHJpZXMpO1xuICAgICAgdGhpcy5fZW5kVGltZUluZGV4LmJ1bGtBZGQoZW5kVGltZUVudHJpZXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdGltZUVudHJpZXMgPSBbXTtcbiAgICAgIGZvciAoaSA9IGdlb2pzb24ubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgZmVhdHVyZSA9IGdlb2pzb25baV07XG4gICAgICAgIHRpbWVFbnRyaWVzLnB1c2goe1xuICAgICAgICAgIGlkOiBmZWF0dXJlLmlkLFxuICAgICAgICAgIHZhbHVlOiBuZXcgRGF0ZShmZWF0dXJlLnByb3BlcnRpZXNbdGhpcy5vcHRpb25zLnRpbWVGaWVsZF0pXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl90aW1lSW5kZXguYnVsa0FkZCh0aW1lRW50cmllcyk7XG4gICAgfVxuICB9LFxuXG4gIF9mZWF0dXJlV2l0aGluVGltZVJhbmdlOiBmdW5jdGlvbiAoZmVhdHVyZSkge1xuICAgIGlmICghdGhpcy5vcHRpb25zLmZyb20gfHwgIXRoaXMub3B0aW9ucy50bykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgdmFyIGZyb20gPSArdGhpcy5vcHRpb25zLmZyb20udmFsdWVPZigpO1xuICAgIHZhciB0byA9ICt0aGlzLm9wdGlvbnMudG8udmFsdWVPZigpO1xuXG4gICAgaWYgKHR5cGVvZiB0aGlzLm9wdGlvbnMudGltZUZpZWxkID09PSAnc3RyaW5nJykge1xuICAgICAgdmFyIGRhdGUgPSArZmVhdHVyZS5wcm9wZXJ0aWVzW3RoaXMub3B0aW9ucy50aW1lRmllbGRdO1xuICAgICAgcmV0dXJuIChkYXRlID49IGZyb20pICYmIChkYXRlIDw9IHRvKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnRpbWVGaWVsZC5zdGFydCAmJiB0aGlzLm9wdGlvbnMudGltZUZpZWxkLmVuZCkge1xuICAgICAgdmFyIHN0YXJ0RGF0ZSA9ICtmZWF0dXJlLnByb3BlcnRpZXNbdGhpcy5vcHRpb25zLnRpbWVGaWVsZC5zdGFydF07XG4gICAgICB2YXIgZW5kRGF0ZSA9ICtmZWF0dXJlLnByb3BlcnRpZXNbdGhpcy5vcHRpb25zLnRpbWVGaWVsZC5lbmRdO1xuICAgICAgcmV0dXJuICgoc3RhcnREYXRlID49IGZyb20pICYmIChzdGFydERhdGUgPD0gdG8pKSB8fCAoKGVuZERhdGUgPj0gZnJvbSkgJiYgKGVuZERhdGUgPD0gdG8pKTtcbiAgICB9XG4gIH0sXG5cbiAgX3Zpc2libGVab29tOiBmdW5jdGlvbiAoKSB7XG4gICAgLy8gY2hlY2sgdG8gc2VlIHdoZXRoZXIgdGhlIGN1cnJlbnQgem9vbSBsZXZlbCBvZiB0aGUgbWFwIGlzIHdpdGhpbiB0aGUgb3B0aW9uYWwgbGltaXQgZGVmaW5lZCBmb3IgdGhlIEZlYXR1cmVMYXllclxuICAgIGlmICghdGhpcy5fbWFwKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHZhciB6b29tID0gdGhpcy5fbWFwLmdldFpvb20oKTtcbiAgICBpZiAoem9vbSA+IHRoaXMub3B0aW9ucy5tYXhab29tIHx8IHpvb20gPCB0aGlzLm9wdGlvbnMubWluWm9vbSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSB7IHJldHVybiB0cnVlOyB9XG4gIH0sXG5cbiAgX2hhbmRsZVpvb21DaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoIXRoaXMuX3Zpc2libGVab29tKCkpIHtcbiAgICAgIHRoaXMucmVtb3ZlTGF5ZXJzKHRoaXMuX2N1cnJlbnRTbmFwc2hvdCk7XG4gICAgICB0aGlzLl9jdXJyZW50U25hcHNob3QgPSBbXTtcbiAgICB9IGVsc2Uge1xuICAgICAgLypcbiAgICAgIGZvciBldmVyeSBjZWxsIGluIHRoaXMuX2FjdGl2ZUNlbGxzXG4gICAgICAgIDEuIEdldCB0aGUgY2FjaGUga2V5IGZvciB0aGUgY29vcmRzIG9mIHRoZSBjZWxsXG4gICAgICAgIDIuIElmIHRoaXMuX2NhY2hlW2tleV0gZXhpc3RzIGl0IHdpbGwgYmUgYW4gYXJyYXkgb2YgZmVhdHVyZSBJRHMuXG4gICAgICAgIDMuIENhbGwgdGhpcy5hZGRMYXllcnModGhpcy5fY2FjaGVba2V5XSkgdG8gaW5zdHJ1Y3QgdGhlIGZlYXR1cmUgbGF5ZXIgdG8gYWRkIHRoZSBsYXllcnMgYmFjay5cbiAgICAgICovXG4gICAgICBmb3IgKHZhciBpIGluIHRoaXMuX2FjdGl2ZUNlbGxzKSB7XG4gICAgICAgIHZhciBjb29yZHMgPSB0aGlzLl9hY3RpdmVDZWxsc1tpXS5jb29yZHM7XG4gICAgICAgIHZhciBrZXkgPSB0aGlzLl9jYWNoZUtleShjb29yZHMpO1xuICAgICAgICBpZiAodGhpcy5fY2FjaGVba2V5XSkge1xuICAgICAgICAgIHRoaXMuYWRkTGF5ZXJzKHRoaXMuX2NhY2hlW2tleV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBTZXJ2aWNlIE1ldGhvZHNcbiAgICovXG5cbiAgYXV0aGVudGljYXRlOiBmdW5jdGlvbiAodG9rZW4pIHtcbiAgICB0aGlzLnNlcnZpY2UuYXV0aGVudGljYXRlKHRva2VuKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBtZXRhZGF0YTogZnVuY3Rpb24gKGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgdGhpcy5zZXJ2aWNlLm1ldGFkYXRhKGNhbGxiYWNrLCBjb250ZXh0KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBxdWVyeTogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLnNlcnZpY2UucXVlcnkoKTtcbiAgfSxcblxuICBfZ2V0TWV0YWRhdGE6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgIGlmICh0aGlzLl9tZXRhZGF0YSkge1xuICAgICAgdmFyIGVycm9yO1xuICAgICAgY2FsbGJhY2soZXJyb3IsIHRoaXMuX21ldGFkYXRhKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5tZXRhZGF0YShMLlV0aWwuYmluZChmdW5jdGlvbiAoZXJyb3IsIHJlc3BvbnNlKSB7XG4gICAgICAgIHRoaXMuX21ldGFkYXRhID0gcmVzcG9uc2U7XG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCB0aGlzLl9tZXRhZGF0YSk7XG4gICAgICB9LCB0aGlzKSk7XG4gICAgfVxuICB9LFxuXG4gIGFkZEZlYXR1cmU6IGZ1bmN0aW9uIChmZWF0dXJlLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgIHRoaXMuX2dldE1ldGFkYXRhKEwuVXRpbC5iaW5kKGZ1bmN0aW9uIChlcnJvciwgbWV0YWRhdGEpIHtcbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICBpZiAoY2FsbGJhY2spIHsgY2FsbGJhY2suY2FsbCh0aGlzLCBlcnJvciwgbnVsbCk7IH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNlcnZpY2UuYWRkRmVhdHVyZShmZWF0dXJlLCBMLlV0aWwuYmluZChmdW5jdGlvbiAoZXJyb3IsIHJlc3BvbnNlKSB7XG4gICAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgICAvLyBhc3NpZ24gSUQgZnJvbSByZXN1bHQgdG8gYXBwcm9wcmlhdGUgb2JqZWN0aWQgZmllbGQgZnJvbSBzZXJ2aWNlIG1ldGFkYXRhXG4gICAgICAgICAgZmVhdHVyZS5wcm9wZXJ0aWVzW21ldGFkYXRhLm9iamVjdElkRmllbGRdID0gcmVzcG9uc2Uub2JqZWN0SWQ7XG5cbiAgICAgICAgICAvLyB3ZSBhbHNvIG5lZWQgdG8gdXBkYXRlIHRoZSBnZW9qc29uIGlkIGZvciBjcmVhdGVMYXllcnMoKSB0byBmdW5jdGlvblxuICAgICAgICAgIGZlYXR1cmUuaWQgPSByZXNwb25zZS5vYmplY3RJZDtcbiAgICAgICAgICB0aGlzLmNyZWF0ZUxheWVycyhbZmVhdHVyZV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgY2FsbGJhY2suY2FsbChjb250ZXh0LCBlcnJvciwgcmVzcG9uc2UpO1xuICAgICAgICB9XG4gICAgICB9LCB0aGlzKSk7XG4gICAgfSwgdGhpcykpO1xuICB9LFxuXG4gIHVwZGF0ZUZlYXR1cmU6IGZ1bmN0aW9uIChmZWF0dXJlLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgIHRoaXMuc2VydmljZS51cGRhdGVGZWF0dXJlKGZlYXR1cmUsIGZ1bmN0aW9uIChlcnJvciwgcmVzcG9uc2UpIHtcbiAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVMYXllcnMoW2ZlYXR1cmUuaWRdLCB0cnVlKTtcbiAgICAgICAgdGhpcy5jcmVhdGVMYXllcnMoW2ZlYXR1cmVdKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrLmNhbGwoY29udGV4dCwgZXJyb3IsIHJlc3BvbnNlKTtcbiAgICAgIH1cbiAgICB9LCB0aGlzKTtcbiAgfSxcblxuICBkZWxldGVGZWF0dXJlOiBmdW5jdGlvbiAoaWQsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgdGhpcy5zZXJ2aWNlLmRlbGV0ZUZlYXR1cmUoaWQsIGZ1bmN0aW9uIChlcnJvciwgcmVzcG9uc2UpIHtcbiAgICAgIGlmICghZXJyb3IgJiYgcmVzcG9uc2Uub2JqZWN0SWQpIHtcbiAgICAgICAgdGhpcy5yZW1vdmVMYXllcnMoW3Jlc3BvbnNlLm9iamVjdElkXSwgdHJ1ZSk7XG4gICAgICB9XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbChjb250ZXh0LCBlcnJvciwgcmVzcG9uc2UpO1xuICAgICAgfVxuICAgIH0sIHRoaXMpO1xuICB9LFxuXG4gIGRlbGV0ZUZlYXR1cmVzOiBmdW5jdGlvbiAoaWRzLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgIHJldHVybiB0aGlzLnNlcnZpY2UuZGVsZXRlRmVhdHVyZXMoaWRzLCBmdW5jdGlvbiAoZXJyb3IsIHJlc3BvbnNlKSB7XG4gICAgICBpZiAoIWVycm9yICYmIHJlc3BvbnNlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXNwb25zZS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHRoaXMucmVtb3ZlTGF5ZXJzKFtyZXNwb25zZVtpXS5vYmplY3RJZF0sIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2suY2FsbChjb250ZXh0LCBlcnJvciwgcmVzcG9uc2UpO1xuICAgICAgfVxuICAgIH0sIHRoaXMpO1xuICB9XG59KTtcbiIsImltcG9ydCBMIGZyb20gJ2xlYWZsZXQnO1xuaW1wb3J0IHsgRmVhdHVyZU1hbmFnZXIgfSBmcm9tICcuL0ZlYXR1cmVNYW5hZ2VyJztcblxuZXhwb3J0IHZhciBGZWF0dXJlTGF5ZXIgPSBGZWF0dXJlTWFuYWdlci5leHRlbmQoe1xuXG4gIG9wdGlvbnM6IHtcbiAgICBjYWNoZUxheWVyczogdHJ1ZVxuICB9LFxuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3RvclxuICAgKi9cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBGZWF0dXJlTWFuYWdlci5wcm90b3R5cGUuaW5pdGlhbGl6ZS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuICAgIHRoaXMuX29yaWdpbmFsU3R5bGUgPSB0aGlzLm9wdGlvbnMuc3R5bGU7XG4gICAgdGhpcy5fbGF5ZXJzID0ge307XG4gIH0sXG5cbiAgLyoqXG4gICAqIExheWVyIEludGVyZmFjZVxuICAgKi9cblxuICBvblJlbW92ZTogZnVuY3Rpb24gKG1hcCkge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5fbGF5ZXJzKSB7XG4gICAgICBtYXAucmVtb3ZlTGF5ZXIodGhpcy5fbGF5ZXJzW2ldKTtcbiAgICAgIC8vIHRyaWdnZXIgdGhlIGV2ZW50IHdoZW4gdGhlIGVudGlyZSBmZWF0dXJlTGF5ZXIgaXMgcmVtb3ZlZCBmcm9tIHRoZSBtYXBcbiAgICAgIHRoaXMuZmlyZSgncmVtb3ZlZmVhdHVyZScsIHtcbiAgICAgICAgZmVhdHVyZTogdGhpcy5fbGF5ZXJzW2ldLmZlYXR1cmUsXG4gICAgICAgIHBlcm1hbmVudDogZmFsc2VcbiAgICAgIH0sIHRydWUpO1xuICAgIH1cblxuICAgIHJldHVybiBGZWF0dXJlTWFuYWdlci5wcm90b3R5cGUub25SZW1vdmUuY2FsbCh0aGlzLCBtYXApO1xuICB9LFxuXG4gIGNyZWF0ZU5ld0xheWVyOiBmdW5jdGlvbiAoZ2VvanNvbikge1xuICAgIHZhciBsYXllciA9IEwuR2VvSlNPTi5nZW9tZXRyeVRvTGF5ZXIoZ2VvanNvbiwgdGhpcy5vcHRpb25zKTtcbiAgICBsYXllci5kZWZhdWx0T3B0aW9ucyA9IGxheWVyLm9wdGlvbnM7XG4gICAgcmV0dXJuIGxheWVyO1xuICB9LFxuXG4gIF91cGRhdGVMYXllcjogZnVuY3Rpb24gKGxheWVyLCBnZW9qc29uKSB7XG4gICAgLy8gY29udmVydCB0aGUgZ2VvanNvbiBjb29yZGluYXRlcyBpbnRvIGEgTGVhZmxldCBMYXRMbmcgYXJyYXkvbmVzdGVkIGFycmF5c1xuICAgIC8vIHBhc3MgaXQgdG8gc2V0TGF0TG5ncyB0byB1cGRhdGUgbGF5ZXIgZ2VvbWV0cmllc1xuICAgIHZhciBsYXRsbmdzID0gW107XG4gICAgdmFyIGNvb3Jkc1RvTGF0TG5nID0gdGhpcy5vcHRpb25zLmNvb3Jkc1RvTGF0TG5nIHx8IEwuR2VvSlNPTi5jb29yZHNUb0xhdExuZztcblxuICAgIC8vIGNvcHkgbmV3IGF0dHJpYnV0ZXMsIGlmIHByZXNlbnRcbiAgICBpZiAoZ2VvanNvbi5wcm9wZXJ0aWVzKSB7XG4gICAgICBsYXllci5mZWF0dXJlLnByb3BlcnRpZXMgPSBnZW9qc29uLnByb3BlcnRpZXM7XG4gICAgfVxuXG4gICAgc3dpdGNoIChnZW9qc29uLmdlb21ldHJ5LnR5cGUpIHtcbiAgICAgIGNhc2UgJ1BvaW50JzpcbiAgICAgICAgbGF0bG5ncyA9IEwuR2VvSlNPTi5jb29yZHNUb0xhdExuZyhnZW9qc29uLmdlb21ldHJ5LmNvb3JkaW5hdGVzKTtcbiAgICAgICAgbGF5ZXIuc2V0TGF0TG5nKGxhdGxuZ3MpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ0xpbmVTdHJpbmcnOlxuICAgICAgICBsYXRsbmdzID0gTC5HZW9KU09OLmNvb3Jkc1RvTGF0TG5ncyhnZW9qc29uLmdlb21ldHJ5LmNvb3JkaW5hdGVzLCAwLCBjb29yZHNUb0xhdExuZyk7XG4gICAgICAgIGxheWVyLnNldExhdExuZ3MobGF0bG5ncyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnTXVsdGlMaW5lU3RyaW5nJzpcbiAgICAgICAgbGF0bG5ncyA9IEwuR2VvSlNPTi5jb29yZHNUb0xhdExuZ3MoZ2VvanNvbi5nZW9tZXRyeS5jb29yZGluYXRlcywgMSwgY29vcmRzVG9MYXRMbmcpO1xuICAgICAgICBsYXllci5zZXRMYXRMbmdzKGxhdGxuZ3MpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ1BvbHlnb24nOlxuICAgICAgICBsYXRsbmdzID0gTC5HZW9KU09OLmNvb3Jkc1RvTGF0TG5ncyhnZW9qc29uLmdlb21ldHJ5LmNvb3JkaW5hdGVzLCAxLCBjb29yZHNUb0xhdExuZyk7XG4gICAgICAgIGxheWVyLnNldExhdExuZ3MobGF0bG5ncyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnTXVsdGlQb2x5Z29uJzpcbiAgICAgICAgbGF0bG5ncyA9IEwuR2VvSlNPTi5jb29yZHNUb0xhdExuZ3MoZ2VvanNvbi5nZW9tZXRyeS5jb29yZGluYXRlcywgMiwgY29vcmRzVG9MYXRMbmcpO1xuICAgICAgICBsYXllci5zZXRMYXRMbmdzKGxhdGxuZ3MpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEZlYXR1cmUgTWFuYWdlbWVudCBNZXRob2RzXG4gICAqL1xuXG4gIGNyZWF0ZUxheWVyczogZnVuY3Rpb24gKGZlYXR1cmVzKSB7XG4gICAgZm9yICh2YXIgaSA9IGZlYXR1cmVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICB2YXIgZ2VvanNvbiA9IGZlYXR1cmVzW2ldO1xuXG4gICAgICB2YXIgbGF5ZXIgPSB0aGlzLl9sYXllcnNbZ2VvanNvbi5pZF07XG4gICAgICB2YXIgbmV3TGF5ZXI7XG5cbiAgICAgIGlmICh0aGlzLl92aXNpYmxlWm9vbSgpICYmIGxheWVyICYmICF0aGlzLl9tYXAuaGFzTGF5ZXIobGF5ZXIpKSB7XG4gICAgICAgIHRoaXMuX21hcC5hZGRMYXllcihsYXllcik7XG4gICAgICAgIHRoaXMuZmlyZSgnYWRkZmVhdHVyZScsIHtcbiAgICAgICAgICBmZWF0dXJlOiBsYXllci5mZWF0dXJlXG4gICAgICAgIH0sIHRydWUpO1xuICAgICAgfVxuXG4gICAgICAvLyB1cGRhdGUgZ2VvbWV0cnkgaWYgbmVjZXNzYXJ5XG4gICAgICBpZiAobGF5ZXIgJiYgdGhpcy5vcHRpb25zLnNpbXBsaWZ5RmFjdG9yID4gMCAmJiAobGF5ZXIuc2V0TGF0TG5ncyB8fCBsYXllci5zZXRMYXRMbmcpKSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUxheWVyKGxheWVyLCBnZW9qc29uKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFsYXllcikge1xuICAgICAgICBuZXdMYXllciA9IHRoaXMuY3JlYXRlTmV3TGF5ZXIoZ2VvanNvbik7XG4gICAgICAgIG5ld0xheWVyLmZlYXR1cmUgPSBnZW9qc29uO1xuXG4gICAgICAgIC8vIGJ1YmJsZSBldmVudHMgZnJvbSBpbmRpdmlkdWFsIGxheWVycyB0byB0aGUgZmVhdHVyZSBsYXllclxuICAgICAgICBuZXdMYXllci5hZGRFdmVudFBhcmVudCh0aGlzKTtcblxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLm9uRWFjaEZlYXR1cmUpIHtcbiAgICAgICAgICB0aGlzLm9wdGlvbnMub25FYWNoRmVhdHVyZShuZXdMYXllci5mZWF0dXJlLCBuZXdMYXllcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjYWNoZSB0aGUgbGF5ZXJcbiAgICAgICAgdGhpcy5fbGF5ZXJzW25ld0xheWVyLmZlYXR1cmUuaWRdID0gbmV3TGF5ZXI7XG5cbiAgICAgICAgLy8gc3R5bGUgdGhlIGxheWVyXG4gICAgICAgIHRoaXMuc2V0RmVhdHVyZVN0eWxlKG5ld0xheWVyLmZlYXR1cmUuaWQsIHRoaXMub3B0aW9ucy5zdHlsZSk7XG5cbiAgICAgICAgdGhpcy5maXJlKCdjcmVhdGVmZWF0dXJlJywge1xuICAgICAgICAgIGZlYXR1cmU6IG5ld0xheWVyLmZlYXR1cmVcbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgLy8gYWRkIHRoZSBsYXllciBpZiB0aGUgY3VycmVudCB6b29tIGxldmVsIGlzIGluc2lkZSB0aGUgcmFuZ2UgZGVmaW5lZCBmb3IgdGhlIGxheWVyLCBpdCBpcyB3aXRoaW4gdGhlIGN1cnJlbnQgdGltZSBib3VuZHMgb3Igb3VyIGxheWVyIGlzIG5vdCB0aW1lIGVuYWJsZWRcbiAgICAgICAgaWYgKHRoaXMuX3Zpc2libGVab29tKCkgJiYgKCF0aGlzLm9wdGlvbnMudGltZUZpZWxkIHx8ICh0aGlzLm9wdGlvbnMudGltZUZpZWxkICYmIHRoaXMuX2ZlYXR1cmVXaXRoaW5UaW1lUmFuZ2UoZ2VvanNvbikpKSkge1xuICAgICAgICAgIHRoaXMuZmlyZSgnYWRkZmVhdHVyZScsIHtcbiAgICAgICAgICAgIGZlYXR1cmU6IG5ld0xheWVyLmZlYXR1cmVcbiAgICAgICAgICB9LCB0cnVlKTtcbiAgICAgICAgICB0aGlzLl9tYXAuYWRkTGF5ZXIobmV3TGF5ZXIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIGFkZExheWVyczogZnVuY3Rpb24gKGlkcykge1xuICAgIGZvciAodmFyIGkgPSBpZHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIHZhciBsYXllciA9IHRoaXMuX2xheWVyc1tpZHNbaV1dO1xuICAgICAgaWYgKGxheWVyKSB7XG4gICAgICAgIHRoaXMuZmlyZSgnYWRkZmVhdHVyZScsIHtcbiAgICAgICAgICBmZWF0dXJlOiBsYXllci5mZWF0dXJlXG4gICAgICAgIH0sIHRydWUpO1xuICAgICAgICB0aGlzLl9tYXAuYWRkTGF5ZXIobGF5ZXIpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICByZW1vdmVMYXllcnM6IGZ1bmN0aW9uIChpZHMsIHBlcm1hbmVudCkge1xuICAgIGZvciAodmFyIGkgPSBpZHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIHZhciBpZCA9IGlkc1tpXTtcbiAgICAgIHZhciBsYXllciA9IHRoaXMuX2xheWVyc1tpZF07XG4gICAgICBpZiAobGF5ZXIpIHtcbiAgICAgICAgdGhpcy5maXJlKCdyZW1vdmVmZWF0dXJlJywge1xuICAgICAgICAgIGZlYXR1cmU6IGxheWVyLmZlYXR1cmUsXG4gICAgICAgICAgcGVybWFuZW50OiBwZXJtYW5lbnRcbiAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICAgIHRoaXMuX21hcC5yZW1vdmVMYXllcihsYXllcik7XG4gICAgICB9XG4gICAgICBpZiAobGF5ZXIgJiYgcGVybWFuZW50KSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9sYXllcnNbaWRdO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBjZWxsRW50ZXI6IGZ1bmN0aW9uIChib3VuZHMsIGNvb3Jkcykge1xuICAgIGlmICghdGhpcy5fem9vbWluZyAmJiB0aGlzLl9tYXApIHtcbiAgICAgIEwuVXRpbC5yZXF1ZXN0QW5pbUZyYW1lKEwuVXRpbC5iaW5kKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNhY2hlS2V5ID0gdGhpcy5fY2FjaGVLZXkoY29vcmRzKTtcbiAgICAgICAgdmFyIGNlbGxLZXkgPSB0aGlzLl9jZWxsQ29vcmRzVG9LZXkoY29vcmRzKTtcbiAgICAgICAgdmFyIGxheWVycyA9IHRoaXMuX2NhY2hlW2NhY2hlS2V5XTtcbiAgICAgICAgaWYgKHRoaXMuX2FjdGl2ZUNlbGxzW2NlbGxLZXldICYmIGxheWVycykge1xuICAgICAgICAgIHRoaXMuYWRkTGF5ZXJzKGxheWVycyk7XG4gICAgICAgIH1cbiAgICAgIH0sIHRoaXMpKTtcbiAgICB9XG4gIH0sXG5cbiAgY2VsbExlYXZlOiBmdW5jdGlvbiAoYm91bmRzLCBjb29yZHMpIHtcbiAgICBpZiAoIXRoaXMuX3pvb21pbmcpIHtcbiAgICAgIEwuVXRpbC5yZXF1ZXN0QW5pbUZyYW1lKEwuVXRpbC5iaW5kKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuX21hcCkge1xuICAgICAgICAgIHZhciBjYWNoZUtleSA9IHRoaXMuX2NhY2hlS2V5KGNvb3Jkcyk7XG4gICAgICAgICAgdmFyIGNlbGxLZXkgPSB0aGlzLl9jZWxsQ29vcmRzVG9LZXkoY29vcmRzKTtcbiAgICAgICAgICB2YXIgbGF5ZXJzID0gdGhpcy5fY2FjaGVbY2FjaGVLZXldO1xuICAgICAgICAgIHZhciBtYXBCb3VuZHMgPSB0aGlzLl9tYXAuZ2V0Qm91bmRzKCk7XG4gICAgICAgICAgaWYgKCF0aGlzLl9hY3RpdmVDZWxsc1tjZWxsS2V5XSAmJiBsYXllcnMpIHtcbiAgICAgICAgICAgIHZhciByZW1vdmFibGUgPSB0cnVlO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxheWVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICB2YXIgbGF5ZXIgPSB0aGlzLl9sYXllcnNbbGF5ZXJzW2ldXTtcbiAgICAgICAgICAgICAgaWYgKGxheWVyICYmIGxheWVyLmdldEJvdW5kcyAmJiBtYXBCb3VuZHMuaW50ZXJzZWN0cyhsYXllci5nZXRCb3VuZHMoKSkpIHtcbiAgICAgICAgICAgICAgICByZW1vdmFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocmVtb3ZhYmxlKSB7XG4gICAgICAgICAgICAgIHRoaXMucmVtb3ZlTGF5ZXJzKGxheWVycywgIXRoaXMub3B0aW9ucy5jYWNoZUxheWVycyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghdGhpcy5vcHRpb25zLmNhY2hlTGF5ZXJzICYmIHJlbW92YWJsZSkge1xuICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fY2FjaGVbY2FjaGVLZXldO1xuICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fY2VsbHNbY2VsbEtleV07XG4gICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9hY3RpdmVDZWxsc1tjZWxsS2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIHRoaXMpKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFN0eWxpbmcgTWV0aG9kc1xuICAgKi9cblxuICByZXNldFN0eWxlOiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5vcHRpb25zLnN0eWxlID0gdGhpcy5fb3JpZ2luYWxTdHlsZTtcbiAgICB0aGlzLmVhY2hGZWF0dXJlKGZ1bmN0aW9uIChsYXllcikge1xuICAgICAgdGhpcy5yZXNldEZlYXR1cmVTdHlsZShsYXllci5mZWF0dXJlLmlkKTtcbiAgICB9LCB0aGlzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBzZXRTdHlsZTogZnVuY3Rpb24gKHN0eWxlKSB7XG4gICAgdGhpcy5vcHRpb25zLnN0eWxlID0gc3R5bGU7XG4gICAgdGhpcy5lYWNoRmVhdHVyZShmdW5jdGlvbiAobGF5ZXIpIHtcbiAgICAgIHRoaXMuc2V0RmVhdHVyZVN0eWxlKGxheWVyLmZlYXR1cmUuaWQsIHN0eWxlKTtcbiAgICB9LCB0aGlzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICByZXNldEZlYXR1cmVTdHlsZTogZnVuY3Rpb24gKGlkKSB7XG4gICAgdmFyIGxheWVyID0gdGhpcy5fbGF5ZXJzW2lkXTtcbiAgICB2YXIgc3R5bGUgPSB0aGlzLl9vcmlnaW5hbFN0eWxlIHx8IEwuUGF0aC5wcm90b3R5cGUub3B0aW9ucztcbiAgICBpZiAobGF5ZXIpIHtcbiAgICAgIEwuVXRpbC5leHRlbmQobGF5ZXIub3B0aW9ucywgbGF5ZXIuZGVmYXVsdE9wdGlvbnMpO1xuICAgICAgdGhpcy5zZXRGZWF0dXJlU3R5bGUoaWQsIHN0eWxlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgc2V0RmVhdHVyZVN0eWxlOiBmdW5jdGlvbiAoaWQsIHN0eWxlKSB7XG4gICAgdmFyIGxheWVyID0gdGhpcy5fbGF5ZXJzW2lkXTtcbiAgICBpZiAodHlwZW9mIHN0eWxlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBzdHlsZSA9IHN0eWxlKGxheWVyLmZlYXR1cmUpO1xuICAgIH1cbiAgICBpZiAobGF5ZXIuc2V0U3R5bGUpIHtcbiAgICAgIGxheWVyLnNldFN0eWxlKHN0eWxlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFV0aWxpdHkgTWV0aG9kc1xuICAgKi9cblxuICBlYWNoRmVhdHVyZTogZnVuY3Rpb24gKGZuLCBjb250ZXh0KSB7XG4gICAgZm9yICh2YXIgaSBpbiB0aGlzLl9sYXllcnMpIHtcbiAgICAgIGZuLmNhbGwoY29udGV4dCwgdGhpcy5fbGF5ZXJzW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgZ2V0RmVhdHVyZTogZnVuY3Rpb24gKGlkKSB7XG4gICAgcmV0dXJuIHRoaXMuX2xheWVyc1tpZF07XG4gIH0sXG5cbiAgYnJpbmdUb0JhY2s6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmVhY2hGZWF0dXJlKGZ1bmN0aW9uIChsYXllcikge1xuICAgICAgaWYgKGxheWVyLmJyaW5nVG9CYWNrKSB7XG4gICAgICAgIGxheWVyLmJyaW5nVG9CYWNrKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgYnJpbmdUb0Zyb250OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5lYWNoRmVhdHVyZShmdW5jdGlvbiAobGF5ZXIpIHtcbiAgICAgIGlmIChsYXllci5icmluZ1RvRnJvbnQpIHtcbiAgICAgICAgbGF5ZXIuYnJpbmdUb0Zyb250KCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgcmVkcmF3OiBmdW5jdGlvbiAoaWQpIHtcbiAgICBpZiAoaWQpIHtcbiAgICAgIHRoaXMuX3JlZHJhdyhpZCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIF9yZWRyYXc6IGZ1bmN0aW9uIChpZCkge1xuICAgIHZhciBsYXllciA9IHRoaXMuX2xheWVyc1tpZF07XG4gICAgdmFyIGdlb2pzb24gPSBsYXllci5mZWF0dXJlO1xuXG4gICAgLy8gaWYgdGhpcyBsb29rcyBsaWtlIGEgbWFya2VyXG4gICAgaWYgKGxheWVyICYmIGxheWVyLnNldEljb24gJiYgdGhpcy5vcHRpb25zLnBvaW50VG9MYXllcikge1xuICAgICAgLy8gdXBkYXRlIGN1c3RvbSBzeW1ib2xvZ3ksIGlmIG5lY2Vzc2FyeVxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5wb2ludFRvTGF5ZXIpIHtcbiAgICAgICAgdmFyIGdldEljb24gPSB0aGlzLm9wdGlvbnMucG9pbnRUb0xheWVyKGdlb2pzb24sIEwubGF0TG5nKGdlb2pzb24uZ2VvbWV0cnkuY29vcmRpbmF0ZXNbMV0sIGdlb2pzb24uZ2VvbWV0cnkuY29vcmRpbmF0ZXNbMF0pKTtcbiAgICAgICAgdmFyIHVwZGF0ZWRJY29uID0gZ2V0SWNvbi5vcHRpb25zLmljb247XG4gICAgICAgIGxheWVyLnNldEljb24odXBkYXRlZEljb24pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGxvb2tzIGxpa2UgYSB2ZWN0b3IgbWFya2VyIChjaXJjbGVNYXJrZXIpXG4gICAgaWYgKGxheWVyICYmIGxheWVyLnNldFN0eWxlICYmIHRoaXMub3B0aW9ucy5wb2ludFRvTGF5ZXIpIHtcbiAgICAgIHZhciBnZXRTdHlsZSA9IHRoaXMub3B0aW9ucy5wb2ludFRvTGF5ZXIoZ2VvanNvbiwgTC5sYXRMbmcoZ2VvanNvbi5nZW9tZXRyeS5jb29yZGluYXRlc1sxXSwgZ2VvanNvbi5nZW9tZXRyeS5jb29yZGluYXRlc1swXSkpO1xuICAgICAgdmFyIHVwZGF0ZWRTdHlsZSA9IGdldFN0eWxlLm9wdGlvbnM7XG4gICAgICB0aGlzLnNldEZlYXR1cmVTdHlsZShnZW9qc29uLmlkLCB1cGRhdGVkU3R5bGUpO1xuICAgIH1cblxuICAgIC8vIGxvb2tzIGxpa2UgYSBwYXRoIChwb2x5Z29uL3BvbHlsaW5lKVxuICAgIGlmIChsYXllciAmJiBsYXllci5zZXRTdHlsZSAmJiB0aGlzLm9wdGlvbnMuc3R5bGUpIHtcbiAgICAgIHRoaXMucmVzZXRTdHlsZShnZW9qc29uLmlkKTtcbiAgICB9XG4gIH1cbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZmVhdHVyZUxheWVyIChvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgRmVhdHVyZUxheWVyKG9wdGlvbnMpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmZWF0dXJlTGF5ZXI7XG4iXSwibmFtZXMiOlsic2hhbGxvd0Nsb25lIiwiYXJjZ2lzVG9HZW9KU09OIiwiZ2VvanNvblRvQXJjR0lTIiwiZzJhIiwiYTJnIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0NDQU8sSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjLElBQUksaUJBQWlCLElBQUksSUFBSSxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2hHLENBQU8sSUFBSSxhQUFhLEdBQUcsUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsYUFBYSxLQUFLLEVBQUUsQ0FBQzs7QUFFL0UsQ0FBTyxJQUFJLE9BQU8sR0FBRztBQUNyQixDQUFBLEVBQUUsSUFBSSxFQUFFLElBQUk7QUFDWixDQUFBLEVBQUUsYUFBYSxFQUFFLGFBQWE7QUFDOUIsQ0FBQSxDQUFDLENBQUM7O0NDTkssSUFBSSxPQUFPLEdBQUc7QUFDckIsQ0FBQSxFQUFFLHNCQUFzQixFQUFFLEVBQUU7QUFDNUIsQ0FBQSxDQUFDLENBQUM7O0NDRUYsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDOztBQUVsQixDQUFBLFNBQVMsU0FBUyxFQUFFLE1BQU0sRUFBRTtBQUM1QixDQUFBLEVBQUUsSUFBSSxJQUFJLEdBQUcsRUFB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RyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQixDQUFBLEVBQUUsSUFBSSxHQUFHLENBQUM7QUFDVixDQUFBLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDaEMsQ0FBQSxJQUFJLEdBQUcsR0FBRyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzVCLENBQUEsSUFBSSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkQsQ0FBQSxJQUFJLEdBQUcsR0FBRyxHQUFHLENBQUM7QUFDZCxDQUFBLEdBQUc7QUFDSCxDQUFBLEVBQUUsT0FBTyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN0QixDQUFBLENBQUM7O0FBRUQsQ0FBQTtBQUNBLENBQUEsU0FBUyxzQkFBc0IsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDakQsQ0FBQSxFQUFFLElBQUksR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUEsRUFBRSxJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FB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VSxPQUFPLEVBQUU7QUFDakMsQ0FBQSxJQUFJLE9BQU8sR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDO0FBQzVCLENBQUEsSUFBSSxJQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsQ0FBQztBQUM1QixDQUFBLElBQUksSUFBSSxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUM7QUFDakMsQ0FBQSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztBQUNyQyxDQUFBLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbEQsQ0FBQSxHQUFHOztBQUVILENBQUEsRUFBRSxHQUFHLEVBQUUsVUFBVSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUU7QUFDbEQsQ0FBQSxJQUFJLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDakUsQ0FBQSxHQUFHOztBQUVILENBQUEsRUFBRSxJQUFJLEVBQUUsVUFBVSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUU7QUFDbkQsQ0FBQSxJQUFJLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDbEUsQ0FBQSxHQUFHOztBQUVILENBQUEsRUFBRSxPQUFPLEVBQUUsVUFBVSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUU7QUFDdEQsQ0FBQSxJQUFJLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDckUsQ0FBQSxHQUFHOztBQUVILENBQUEsRUFBRSxRQUFRLEVB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QUFHOztBQUVILENBQUEsRUFBRSxPQUFPLEVBQUU7QUFDWCxDQUFBLElBQUksa0JBQWtCLEVBQUU7QUFDeEIsQ0FBQSxNQUFNLEdBQUcsRUFBRSxrQkFBa0I7QUFDN0IsQ0FBQSxNQUFNLEdBQUcsRUFBRSxrQkFBa0I7QUFDN0IsQ0FBQSxNQUFNLEdBQUcsRUFBRSxrQkFBa0I7QUFDN0IsQ0FBQSxNQUFNLEdBQUcsRUFBRSxrQkFBa0I7QUFDN0IsQ0FBQSxNQUFNLEdBQUcsRUFBRSxrQkFBa0I7QUFDN0IsQ0FBQSxNQUFNLEdBQUcsRUFBRSxrQkFBa0I7QUFDN0IsQ0FBQSxNQUFNLEdBQUcsRUFBRSxrQkFBa0I7QUFDN0IsQ0FBQSxNQUFNLEdBQUcsRUFBRSxrQkFBa0I7QUFDN0IsQ0FBQSxNQUFNLEdBQUcsRUFBRSxrQkFBa0I7QUFDN0IsQ0FBQSxNQUFNLEdBQUcsRUFBRSxrQkFBa0I7QUFDN0IsQ0FBQSxNQUFNLElBQUksRUFBRSxnQkFBZ0I7QUFDNUIsQ0FBQSxNQUFNLElBQUksRUFBRSxrQkFBa0I7QUFDOUIsQ0FBQSxNQUFNLElBQUksRUFBRSxrQkFBa0I7QUFDOUIsQ0FBQSxNQUFNLElBQUksRUFBRSxrQkFBa0I7QUFDOUIsQ0FBQSxNQUFNLElBQUksRUFBRSxrQkFBa0I7QUFDOUIsQ0FBQSxNQUFNLElBQUksRUFBRSxrQkFBa0I7QUFDOUIsQ0FBQSxNQUFNLElBQUksRUFBRSxnQkFBZ0I7QUFDNUIsQ0FBQSxNQUFNLElBQUksRUFBRSxrQkFBa0I7QUFDOUIsQ0FBQSxNQUFNLElBQUksRUFBRSxtQkFBbUI7QUFDL0IsQ0FBQSxNQUFNLElBQUksRUFBRSxtQkFBbUI7QUFDL0IsQ0FBQSxNQUFNLElBQUksRUFBRSxnQkFBZ0I7QUFDNUIsQ0FBQSxNQUFNLElBQUksRUFBRSxnQkFBZ0I7QUFDNUIsQ0FBQSxNQUFNLElBQUksRUFBRSxrQkFBa0I7QUFDOUIsQ0FBQSxNQUFNLElBQUksRUFBRSxrQkFBa0I7QUFDOUIsQ0FBQSxLQUFLO0FBQ0wsQ0FBQSxHQUFHOztBQUVILENBQUEsRUFBRSxVQUFV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SCxDQUFBLEVBQUUsWUFBWSxFQUFFLFlBQVk7QUFDNUIsQ0FBQSxJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7QUFDbEMsQ0FBQSxHQUFHOztBQUVILENBQUEsRUFBRSxVQUFVLEVBQUUsVUFBVSxPQUFPLEVBQUU7QUFDakMsQ0FBQSxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7QUFDakMsQ0FBQSxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDL0MsQ0FBQSxLQUFLLE1BQU07QUFDWCxDQUFBLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQ2hELENBQUEsS0FBSztBQUNMLENBQUEsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7QUFDbkIsQ0FBQSxJQUFJLE9BQU8sSUFBSSxDQUFDO0FBQ2hCLENBQUEsR0FBRzs7QUFFSCxDQUFBLEVBQUUsVUFBVSxFQUFFLFlBQVk7QUFDMUIsQ0FBQSxJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7QUFDaEMsQ0FBQSxHQUFHOztBQUVILENBQUEsRUFBRSxTQUFTLEVBQUUsVUFBVSxNQUFNLEVBQUUsb0JBQW9CLEVBQUU7QUFDckQsQ0FBQSxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7QUFDaEMsQ0FBQSxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDN0MsQ0FBQSxLQUFLLE1BQU07QUFDWCxDQUFBLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQzlDLENBQUEsS0FBSztBQUNMLENBQUEsSUFBSSxJQUFJ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