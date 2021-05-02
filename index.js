var i = 1;
var today = new Date();
var time =
  today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();

//BaseMaps
var basemaps = [
  L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 17,
    minZoom: 3,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }),

  L.tileLayer("http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
    maxZoom: 17,
    minZoom: 3,
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
  }),
];

//Init The Map
var mymap = L.map("mapid", {
  center: [0, 0],
  zoom: 3,
  maxBounds: L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180)),
  zoomDelta: 0.6,
  worldCopyJump: true,
  doubleClickZoom: false,
});

//Current Location Function
navigator.geolocation.getCurrentPosition((position) => {
  const pos = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };

  //Button for Zooming Using Easy Button Library
  var ZoomButton = L.easyButton({
    states: [
      {
        stateName: "zoom-to-location", // name the state
        icon:
          '<img src="src/compass.svg" style="margin-top: 6px; width:auto;">', // and define its properties
        title: "zoom to a current location", // like its title
        onClick: function (btn, map) {
          // and its callback
          map.flyTo([pos.lat, pos.lng], 15, { duration: 2 });
          btn.state("zoom-to-location"); // change state on click!
        },
      },
    ],
  });

  ZoomButton.addTo(mymap);
});

//BaseMaps Control Button
mymap.addControl(
  L.control.basemaps({
    basemaps: basemaps,
    tileX: 0,
    tileY: 0,
    tileZ: 1,
  })
);

//Adding Markers
var editableLayers = new L.FeatureGroup();
mymap.addLayer(editableLayers);

var drawnItems = L.geoJson().addTo(mymap);

var options = {
  position: "topleft",
  draw: {
    polyline: false,
    polygon: false,
    circle: false,
    rectangle: false,
    circlemarker: false,
    marker: {
      //Using the Merker Styling with Extra Markers Library
      icon: L.ExtraMarkers.icon({
        icon: "fa-number",
        markerColor: "blue",
        shape: "circle",
        prefix: "fa",
        extraClasses: "font-weight-bold",
      }),
      repeatMode: true, // To Put the marker one by one or not
    },
  },
  edit: {
    featureGroup: editableLayers,
    remove: true, //Control if u can remove Featuers or not
    edit: true,
  },
};

var geocodeService = L.esri.Geocoding.geocodeService();

let Points = [];
let PointsArray = [];
let locationReverseGeocoder = [];
let FinalMarkersMade = [];
let geojson = [];
let buffer;


var router = new L.Routing.OSRMv1({});

// Init the Routing
var control = L.Routing.control({
  waypoints: [null],
  createMarker: function () {
    return false;
  },

  // dragStyles: [
  //   { color: "black", opacity: 0.15, weight: 7 },
  //   { color: "white", opacity: 0.8, weight: 4 },
  //   { color: "orange", opacity: 1, weight: 2, dashArray: "7,12" },
  // ],
  useZoomParameter: false,
  draggableWaypoints: false,
  showAlternatives:true,
  lineOptions : {
    addWaypoints: false
}
}).addTo(mymap);
var routeArray = new Array();
routeArray = control.getWaypoints();

let RouteCoor = [];

control.addTo(mymap).on("routesfound", function (e) {
  
  RouteCoor = [];
  if (buffer != null) {
    mymap.removeLayer(buffer);
  }
  let length = e.routes[0].coordinates.length;
  for (let i = 0; i < length; i++) {
    let Coor = [e.routes[0].coordinates[i].lng, e.routes[0].coordinates[i].lat];
    RouteCoor.push(Coor);
  }

  mymap.createPane("labels");

  mymap.getPane("labels").style.zIndex = 100;

  var point = turf.lineString(RouteCoor);
  var buffered = turf.buffer(point, 0.2);
  buffer = L.geoJSON(buffered, {
    style: { color: "green", fillColor: "green" },
  });
  buffer.addTo(mymap);


});

var drawControl = new L.Control.Draw(options);
mymap.addControl(drawControl);

//Event Happen When you Create a Marker(Feature)
mymap.on(L.Draw.Event.CREATED, function (e) {
  //Marker Numbering
  L.stamp(e.layer);
  options.draw.marker.icon.options["number"] = i++;

  // Saving the Point Created in a array (Used in Routing)
  Point = {
    a: e.layer._latlng.lat,
    b: e.layer._latlng.lng,
    Id: time,
    lflid: e.layer._leaflet_id,
  };
  Points.push(Point);

  let PonitArray = [e.layer._latlng.lat, e.layer._latlng.lng];
  PointsArray.push(PonitArray);

  editableLayers.addLayer(e.layer);
  geocodeService
    .reverse()
    .latlng(e.layer._latlng)
    .run(function (error, result) {
      if (error) {
        return;
      }
      locationReverseGeocoder.push(result.address.Match_addr);

      let Row = document.createElement("tr");
      let NumberCell = document.createElement("th");
      let AdressCell = document.createElement("td");
      let LocationCell = document.createElement("td");

      let Number_txt = NumberCell.appendChild(document.createTextNode(i - 1));
      Row.appendChild(NumberCell);
      AdressCell.appendChild(
        document.createTextNode(result.address.Match_addr)
      );
      Row.appendChild(AdressCell);
      LocationCell.appendChild(
        document.createTextNode(
          `( ${e.layer._latlng.lat} , ${e.layer._latlng.lng} )`
        )
      );
      Row.appendChild(LocationCell);

      Row.setAttribute("id", e.layer._leaflet_id);
      AdressCell.setAttribute("id", `${e.layer._leaflet_id}A`);
      LocationCell.setAttribute("id", `${e.layer._leaflet_id}L`);
      var Table = document.getElementById("table-body");
      Table.appendChild(Row);
    });
});

mymap.on("draw:drawstart", function (e) {
  //Used To Update the Marker Numbering
  options.draw.marker.icon.options["number"] = i;
});

//Edit Event
mymap.on("draw:edited	", function (e) {
  let editedLayers = Object.values(e.layers._layers);
  console.log(editedLayers);
  for (let z = 0; z < editedLayers.length; z++) {
   
    for (let y = 0; y < Points.length; y++) {
     
      if (Points[y].lflid === editedLayers[z]._leaflet_id) {
      
        Points[y].a = editedLayers[z]._latlng.lat;
        Points[y].b = editedLayers[z]._latlng.lng;
       
        PointsArray.splice(y, 1, [
          editedLayers[z]._latlng.lat,
          editedLayers[z]._latlng.lng,
        ]);
        control.spliceWaypoints(y, 1, [
          editedLayers[z]._latlng.lat,
          editedLayers[z]._latlng.lng,
        ]); 
        if (buffer != null) {
          mymap.removeLayer(buffer);
        }
      }
    }

    geocodeService
      .reverse()
      .latlng(editedLayers[z]._latlng)
      .run(function (error, result) {
        if (error) {
          return error;
        }
        document.getElementById(`${editedLayers[z]._leaflet_id}A`).innerHTML =
          result.address.Match_addr;
        document.getElementById(
          `${editedLayers[z]._leaflet_id}L`
        ).innerHTML = `( ${editedLayers[z]._latlng.lat} , ${editedLayers[z]._latlng.lng} )`;
      });
  }
});

//Delete Event
mymap.on("draw:deleted	", function (e) {
  let deletedLayers = Object.values(e.layers._layers);
  for (let z = 0; z < deletedLayers.length; z++) {
    for (let y = 0; y < Points.length; y++) {
      if (
        Points[y].a === deletedLayers[z]._latlng.lat &&
        Points[y].b === deletedLayers[z]._latlng.lng
      ) {
        Points.splice(y, 1);
        PointsArray.splice(y, 1);
        control.spliceWaypoints(y, 1);
      }
    }
    document.getElementById(deletedLayers[z]._leaflet_id).remove();
  }
  if (Points.length < 2) {
    mymap.removeLayer(buffer);
  }
});

// Routing Button
var RoutingButton = L.easyButton({
  states: [
    {
      stateName: "Route",
      icon:
        '<img src="src/icons8-route-64.png" style=" width:25px; margin-left:-2px">',
      title: "Route",
      onClick: function (btn, map) {
        
        for (let w = 0; w < PointsArray.length; w++) {
          // console.log(PointsArray[w]);
          control.spliceWaypoints(w, 1, PointsArray[w]);
        }
       
        btn.state("Route");
      },
    },
  ],
});
RoutingButton.addTo(mymap);

//Used to Show Routing Errors
L.Routing.errorControl(control).addTo(mymap);

//GeoCoding
L.Control.geocoder({
  defaultMarkGeocode: false,
  position: "topleft",
  collapsed: true,
  geocoder: L.Control.Geocoder.photon({
    showResultIcons: true,
    geocodingQueryParams: {
      limit: 8,
    },
  }),
})
  .on("markgeocode", function (e) {
    var latlng = e.geocode.center;
    mymap.flyTo(latlng, 15, { duration: 1.5 });
  })
  .addTo(mymap);

function exportToJsonFile(jsonData) {
  let dataStr = JSON.stringify(jsonData);
  let dataUri =
    "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

  let exportFileDefaultName = "data.json";

  let linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
}

mymap.on("click", (e) => { });

var x = document.getElementById("customRange").value;

function bufferChange(value) {
  try {
    mymap.removeLayer(buffer);
  } catch (err) { }
  if (Points.length > 2) {
    var point = turf.lineString(RouteCoor);
    var buffered = turf.buffer(point, value);
    buffer = L.geoJSON(buffered, {
      style: { color: "green", fillColor: "green" },
    });
    buffer.addTo(mymap);
  }
}
