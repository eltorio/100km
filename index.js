//Params
const clefChoisirGeoportail = "choisirgeoportail";
const realGeoportailAPIKey = "an7nvfzojv5wa96dsga5nk8w";
var clefGeoportail = (typeof clefGeoportail === 'undefined') ? realGeoportailAPIKey : clefGeoportail; //this is the real geoportail api key for the OACI layer, please request your own at contact.geoservices@ign.fr

const fallbackAddress = '18 Route de Notre Dame de la Gorge, 74170 Les Contamines-Monjoie'; //Bureau des guides Contas
var address = fallbackAddress;
var addressSet = jQuery.Deferred(); // not yet
var initialZoomLevel = 10; // automatically replaced if parameter z= is provided
const scoreMiniGeocoding = 0.6;
const greenDistance = 100000; //100km
const wgs84_fullextent = [-198.023011999972, -99.1758454464684, 198.035711151158, 99.0083737124466];
const rgf93_fullextent = [-357823.2365, 6037008.6939, 1313632.3628, 7230727.3772];

const paysISO = "FR"; // 3 lettres = FRA
var geocodedAddress;
var mapCenter = [652311, 6862059];

//Proj4 initialization
proj4.defs("EPSG:2154", "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
ol.proj.proj4.register(proj4);

var proj_2154 = ol.proj.get('EPSG:2154'); //proj_2154.setExtent(rgf93_fullextent);
var proj_3857 = ol.proj.get('EPSG:3857');
var proj_4326 = ol.proj.get('EPSG:4326');

const urlParams = new URLSearchParams(window.location.search);

function popupFormHandler() {
  address = jQuery("#input-address").val();
  jQuery.colorbox.close();
}

var popUPColorbox = `
<!-- Modal content -->
<div style="margin-left:50px;margin-right:50px;font-family: Arial, Helvetica, sans-serif; font-size:12pt;line-height: 1" id="modal-ext-div">
  <p id="p-address" style="text-align: left;font-size:14pt;color:#656564">Adresse:<br /> <textarea rows="3" cols="40" id="input-address" style="text-align: left;font-size:10pt;color:#656564">18 Route de Notre Dame de la Gorge, 74170 Les Contamines-Monjoie</textarea></p>
  <p style="font-size: 12pt; text-align: right; margin-right: -25px;color:#656564"><a id="click" onclick="popupFormHandler()" href="#" style="padding: 5px; background: rgb(65,65,64) none repeat scroll 0% 0%; color: rgb(255, 255, 255); cursor: inherit;">Go</a></p>
</div>`

function insertParam(key, value) {
  key = encodeURI(key); value = encodeURI(value);
  var kvp = document.location.search.substr(1).split('&');
  var baseURL = document.location.origin;
  baseURL += document.location.pathname;
  if (kvp == '') {
    history.replaceState(null,null,baseURL + '?' + key + '=' + value);
  }
  else {
    var i = kvp.length; var x; while (i--) {
      x = kvp[i].split('=');

      if (x[0] == key) {
        x[1] = value;
        kvp[i] = x.join('=');
        break;
      }
    }
    if (i < 0) { kvp[kvp.length] = [key, value].join('='); }
    //document.location.search = '?' + kvp.join('&');
    history.replaceState(null,null,baseURL + '?' + kvp.join('&'));
  }

}

function setAddressFromPopup() {

  jQuery.colorbox({
    closeButton: true,
    html: popUPColorbox,
    speed: 500,
    width: "400px"
  });

  // event handler
  jQuery(document).bind('cbox_closed', function () {
    insertParam('a', address); //adds the filled address to the URL for giving the ability to store the result
    addressSet.resolve();
  });
}

//Parse URL
if (urlParams.get('a') !== null) {
  address = urlParams.get('a');
  addressSet.resolve();
} else {
  setAddressFromPopup();
}

if (urlParams.get('z') !== null) {
  var _zoom = urlParams.get('z');
  if (jQuery.isNumeric(_zoom)) {
    _zoom = Number.parseInt(_zoom);
    if ((_zoom >= 4) && (_zoom <= 18)) {
      initialZoomLevel = _zoom;
    }
  }

}
if (urlParams.get('x') !== null){
  var _x = urlParams.get('x');
  if (jQuery.isNumeric(_x)){
      mapCenter[0] = Number.parseFloat(_x);
  }
}
if (urlParams.get('y') !== null){
  var _y = urlParams.get('y');
  if (jQuery.isNumeric(_y)){
      mapCenter[1] = Number.parseFloat(_y);
  }
}




// Openlayers 6 features:
var polyDepartement, polyPays, polyFullRGF93, greenCircle, greenZone, invertedGreenZone, domicilePoint;  // All are features
var clickedPoint; // a ol.geom.Point geometry
var clickedLineString; //a ol.geom.LineString

// Standard IGN resolutions
var ign_resolutions = [
  156543.03392804103,
  78271.5169640205,
  39135.75848201024,
  19567.879241005125,
  9783.939620502562,
  4891.969810251281,
  2445.9849051256406,
  1222.9924525628203,
  611.4962262814101,
  305.74811314070485,
  152.87405657035254,
  76.43702828517625,
  38.218514142588134,
  19.109257071294063,
  9.554628535647034,
  4.777314267823517,
  2.3886571339117584,
  1.1943285669558792,
  0.5971642834779396,
  0.29858214173896974,
  0.14929107086948493,
  0.07464553543474241
];
var jsonReader = new ol.format.GeoJSON()
var jstsParser = new jsts.io.OL3Parser();
jstsParser.inject(
  ol.geom.Point,
  ol.geom.LineString,
  ol.geom.LinearRing,
  ol.geom.Polygon,
  ol.geom.MultiPoint,
  ol.geom.MultiLineString,
  ol.geom.MultiPolygon
);
var jstsWriter = new jsts.io.WKTWriter()
var jstsReducer = new jsts.precision.GeometryPrecisionReducer(new jsts.geom.PrecisionModel(jsts.geom.PrecisionModel.FLOATING_SINGLE));

var vectorSourceStyles = {
  'greenZone': new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'green',
      width: 3
    }),
    fill: new ol.style.Fill({
      color: 'rgba(0, 0, 255, 0.1)'
    })
  }),
  'invertedGreenZone': new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'blue',
      width: 3
    }),
    fill: new ol.style.Fill({
      color: 'rgba(0, 0, 255, 0.1)'
    })
  }),
  'domMarker': new ol.style.Style({
    image: new ol.style.Icon({
      anchor: [0.5, 1],
      scale: 0.5,
      src: 'marker-red.svg'
    })
  })
};
var positiveVectorSource = new ol.source.Vector({
  format: new ol.format.GeoJSON({ dataProjection: proj_2154, defaultDataProjection: proj_2154, geometryName: "Green Zone" }),
  projection: proj_2154,
});

var negativeVectorSource = new ol.source.Vector({
  format: new ol.format.GeoJSON({ dataProjection: proj_2154, defaultDataProjection: proj_2154, geometryName: "Inverted Green Zone" }),
  projection: proj_2154,
});

var markersVectorSource = new ol.source.Vector({
  format: new ol.format.GeoJSON({ dataProjection: proj_2154, defaultDataProjection: proj_2154, geometryName: "Inverted Green Zone" }),
  projection: proj_2154,
});

function geoCodeAddress(givenAddress) {
  var geocodingRequest = jQuery.ajax(
    {
      url: `https://api-adresse.data.gouv.fr/search/?q=${givenAddress}`,
      async: false
    });

  var geoCodedAddress = jsonReader.readFeatures(geocodingRequest.responseText)[0];
  var domicile = geoCodedAddress.getGeometry().transform(proj_4326, proj_2154).getCoordinates();
  var api_address_properties = JSON.parse(geocodingRequest.responseText).features[0].properties;
  var departement = api_address_properties.citycode.substr(0, 2);
  return { 'domicile': domicile, 'departement': departement, 'pays': paysISO, 'score': api_address_properties.score, 'type': api_address_properties.type, 'properties': api_address_properties };  //pays en dur
}

function getGeoJsonAsAFeature(url, projection, geometryName) {
  var request = jQuery.ajax(
    {
      url: url,
      async: false
    }
  );
  var json = new ol.format.GeoJSON({ dataProjection: projection, featureProjection: projection });
  return json.readFeatures(request.responseText)[0];
}

var popupContainer = document.getElementById('popup');
var popupContent = document.getElementById('popup-content');
var popupCloser = document.getElementById('popup-closer');

var popupOverlay = new ol.Overlay({
  element: popupContainer,
  autoPan: true,
  autoPanAnimation: {
    duration: 250
  }
});

popupCloser.onclick = function () {
  popupOverlay.setPosition(undefined);
  popupCloser.blur();
  return false;
};

var map = new ol.Map({
  target: "map",
  layers: [
    new ol.layer.Group({
      title: 'Cartes',
      layers: [
        new ol.layer.Tile({
          title: 'Carte IGN',
          source: new ol.source.WMTS({
            url: `https://wxs.ign.fr/${clefChoisirGeoportail}/geoportail/wmts`,
            layer: 'GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-EXPRESS.STANDARD',
            matrixSet: 'PM',
            format: 'image/jpeg',
            projection: proj_3857,
            style: 'normal',
            tileGrid: new ol.tilegrid.WMTS({
              origin: [-20037508, 20037508],
              resolutions: ign_resolutions,
              matrixIds: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"] // TileMatrix IDs
            }),
            attributions: '<a href="http://www.geoportail.fr/" target="_blank">Fonds de carte ©IGN</a> et code ©Ronan 😂'
          })
        }),
        new ol.layer.Tile({
          title: 'Images IGN',
          visible: false,
          source: new ol.source.WMTS({
            url: `https://wxs.ign.fr/${clefChoisirGeoportail}/geoportail/wmts`,
            layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
            matrixSet: 'PM',
            format: 'image/jpeg',
            projection: proj_3857,
            style: 'normal',
            tileGrid: new ol.tilegrid.WMTS({
              origin: [-20037508, 20037508],
              resolutions: ign_resolutions,
              matrixIds: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"]
            }),
            attributions: '<a href="http://www.geoportail.fr/" target="_blank">Fonds de carte ©IGN</a> et code ©Ronan 😂'
          })
        }),
        new ol.layer.Tile({
          title: clefGeoportail != realGeoportailAPIKey ? 'Espaces OACI' : "DEMANDEZ UNE CLÉ contact.geoservices@ign.fr - Espaces OACI",
          visible: false,
          source: new ol.source.WMTS({
            url: `https://wxs.ign.fr/${clefGeoportail}/geoportail/wmts`,
            layer: 'GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-OACI',
            matrixSet: 'PM',
            format: 'image/jpeg',
            projection: proj_3857,
            style: 'normal',
            tileGrid: new ol.tilegrid.WMTS({
              origin: [-20037508, 20037508],
              resolutions: ign_resolutions,
              matrixIds: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"]
            }),
            attributions: '<a href="https://www.sia.aviation-civile.gouv.fr" target="_blank">Fonds de carte ©DGAC/IGN</a> et code ©Ronan 😂'
          })
        }),
      ]
    }),
    new ol.layer.Group({
      title: 'Degré de liberté',
      layers: [
        new ol.layer.Vector({
          title: 'zone interdite',
          type: 'base',
          visible: false,
          source: positiveVectorSource,
          style: function (feature) {
            return vectorSourceStyles[feature.get('type')];
          }
        }),
        new ol.layer.Vector({
          title: 'zone libre',
          type: 'base',
          source: negativeVectorSource,
          style: function (feature) {
            return vectorSourceStyles[feature.get('type')];
          }
        }),
        new ol.layer.Vector({
          title: 'Repères',
          source: markersVectorSource,
          style: function (feature) {
            return vectorSourceStyles[feature.get('type')];
          }
        })
      ]
    })
  ],
  overlays: [popupOverlay],
  view: new ol.View({
    //center: mapCenter,
    zoom: initialZoomLevel,
    projection: proj_2154
    // extent: bounds
  })
});
//trois requêtes asynchrones imbriquées:
// rien n'est exécuté tant que le Deferred addressSet est à l'état pending, or celui-ci ne change d'état qu'après que la variable address ait été chargée (soit dans l'url a= soit en fermant le popup colorbox)
// quand l'addressSet est resolved le then execute une fonction inline avec le geoProcess complet: geocodage, création des sources vectorielles, et calculs
// quand le geocodage est terminé le téléchargment des deux sources vectorielles WFS pays et département sont téléchargés
// quand c'est fait les opérations topologiques sont effectuées
// polyPays : feature openlayer représentant le polygone du pays (multiple zone)
// polyDepartement: feature openlayer du département
// greenCircle cercle de 100km (greenDistance) autour du domicile (approximé en 1000 segments)
// greenZone: feature openlayer [ ( polyDepartement ⋃ greenCircle ) ⋂ polyPays)

//in keys is defined the same functions but returning a WMS url
var getUrlDepartement = (typeof getUrlDepartement === 'undefined') ? function (insee_code) {
  return `geobase/INSEE_DEP_${insee_code}.json`;
}
  : getUrlDepartement;

var getUrlPays = (typeof getUrlPays === 'undefined') ? function (iso_code) {
  return `geobase/PAYS_${iso_code}.json`;
}
  : getUrlPays;

jQuery.when(addressSet).then(function () {
  jQuery.when(geoCodeAddress(address)).done(function (_geocodedAddress) {
    if (_geocodedAddress.score > scoreMiniGeocoding) {
      geocodedAddress = _geocodedAddress;
      domicilePoint = new ol.Feature({
        type: 'domMarker',
        geometry: new ol.geom.Point(geocodedAddress.domicile)
      });
      var urlDepartement = getUrlDepartement(geocodedAddress.departement);
      var urlPays = getUrlPays(geocodedAddress.pays);

      console.log("urlDepartement: " + urlDepartement);
      console.log("urlPays: " + urlPays);
      jQuery.when(getGeoJsonAsAFeature(urlDepartement, proj_2154, "monDépartement"), getGeoJsonAsAFeature(urlPays, proj_4326, "monPays")).done(function (_polyDepartement, _polyPays) {
        polyDepartement = _polyDepartement;
        polyPays = _polyPays;
        polyPays.getGeometry().transform(proj_4326, proj_2154); // Why ????? MapServer config error?
        greenCircle = new ol.Feature(ol.geom.Polygon.fromCircle(new ol.geom.Circle(geocodedAddress.domicile, greenDistance), 1000));

        polyFullRGF93 = new ol.Feature(ol.geom.Polygon.fromExtent(rgf93_fullextent));

        var jstsPolyPaysHigh = jstsParser.read(polyPays.getGeometry());
        var jstsPolyDepartementHigh = jstsParser.read(polyDepartement.getGeometry());
        var jstsPolyPays = jstsReducer.reduce(jstsPolyPaysHigh);
        var jstsPolyDepartement = jstsReducer.reduce(jstsPolyDepartementHigh);
        var jstsCircle = jstsParser.read(greenCircle.getGeometry());
        var jstsMaxiGreenZone = jstsPolyDepartement.union(jstsCircle);
        var jstsGreenZone = jstsMaxiGreenZone.intersection(jstsPolyPays);

        //inversion
        var jstsInvertedGreenZone = jstsParser.read(polyFullRGF93.getGeometry()).difference(jstsGreenZone);
        var formatWKT = new ol.format.WKT();
        greenZone = formatWKT.readFeature(jstsWriter.write(jstsGreenZone));
        greenZone.set('type', 'greenZone');
        positiveVectorSource.addFeature(greenZone);

        invertedGreenZone = formatWKT.readFeature(jstsWriter.write(jstsInvertedGreenZone));
        invertedGreenZone.set('type', 'invertedGreenZone');
        negativeVectorSource.addFeature(invertedGreenZone);

        //Marker
        markersVectorSource.addFeature(domicilePoint);

        //Center//move to the provided coordinates in URL only if they are in the 'greenZone' otherwise use domicile as center
        if (((urlParams.get('x') !== undefined) && (urlParams.get('y') !== undefined)) && 
                greenZone.getGeometry().intersectsCoordinate(mapCenter)  //x,y coordinates were already parsed to mapCenter
          )
        {
          map.getView().setCenter(mapCenter);
        }else{
          mapCenter = ol.extent.getCenter(polyDepartement.getGeometry().getExtent());
          map.getView().setCenter(domicilePoint.getGeometry().getCoordinates());
        }

      });
    } //  if (_geocodedAddress.score > scoreMiniGeocoding) 
  });
});



var layerSwitcher = new ol.control.LayerSwitcher({
  tipLabel: 'Légende', // Optional label for button
});
map.addControl(layerSwitcher);

// click event
map.on('click', function (evt) {
  clickedPoint = new ol.geom.Point(evt.coordinate);
  clickedLineString = new ol.geom.LineString([clickedPoint.getCoordinates(), domicilePoint.getGeometry().getCoordinates()])
  console.log("clic: " + evt.coordinate + "(m RGF93) longueur:" + clickedLineString.getLength() + "m");
  popupContent.innerHTML = `<p>Depuis:<br/>${geocodedAddress.properties.label}</p>` + Math.round((clickedLineString.getLength() / 1000 + Number.EPSILON) * 100) / 100 +
    ' km';
  popupOverlay.setPosition(evt.coordinate);
});


map.on('moveend', function(e) {
  var newCenter = map.getView().getCenter();
  insertParam("x", newCenter[0]);  insertParam("y", newCenter[1]);
  var newZoom = map.getView().getZoom();
  if (newZoom != initialZoomLevel) {
    console.log('zoom end, new zoom: ' + newZoom);
    initialZoomLevel = newZoom;
    var cleanZoom = Math.round(newZoom);
    cleanZoom = (cleanZoom < 4 ) ? 4 : cleanZoom;
    cleanZoom = (cleanZoom > 19) ? 19 : cleanZoom;
    insertParam('z',cleanZoom)
  }
});