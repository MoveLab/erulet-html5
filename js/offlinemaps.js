// OFFMAP_NAME + " for jQuery Mobile
//
// Copyright (c) 2014 Jordi López
// MIT License - http://opensource.org/licenses/mit-license.php

/* Leaflet map with an offline layer created from a MBTiles file
*/

var OFFMAP_NAME = "offlinemaps.js";
console.log(OFFMAP_NAME + ": Initializing");

var dbname = "offmaps";
var sqlite = null;
var DB = null;
var metadata = null;

//Map data
var maxZ = 18;
var minZ = 0;
var lat, lon, latt, lonn, compos, str;
var imgType;
var markers = new L.FeatureGroup();

var map;
var onlineLayer, offlineLayer;
var baseMaps, baseOverlay;
var control;

$(document).on('pagechange', function() {

    // Make sure controls are visible
    $("#routeControls").show("slow");


    // try to load cached map
    openDB();

    initMap();

});

$(document).on('pageinit', '#trip_select', function() {


    // Handle clear button
    $("#dl_clear").click(function(e) {
        e.preventDefault(); // it's an anchor
       deleteDB();
       $.mobile.navigate("#switchboard");
    });


});

$(document).on('pageshow', '#trip_select', function() {
    // Workaround to show loading dialog (can't be used on document.ready()
    if(Object.keys(markers["_layers"]).length==0) {
        $.mobile.loading("show", {
          text: "retrieving routes",
          textVisible: true,
          theme: "b",
          html: ""
        });
   }
});


function openDB() {
    console.log(OFFMAP_NAME + ": openDB()");

    DB = new PouchDB(dbname);


    DB.get("bundle", function(err,doc) {
        if(err) {
            console.warn(OFFMAP_NAME + ": No DB present");
            //console.warn("Manifest fetch error: ", err.error, " reason: ", err.reason, " status: ", err.status);
        }
        else {
            console.log(OFFMAP_NAME + ": opened MBTiles...");
            console.log(doc.mbtiles);

            sqlite = new SQL.Database(doc.database);
            console.log("Tables found on the DB: ");
            var result=sqlite.exec("SELECT name FROM sqlite_master WHERE type = 'table'");
            console.table(result[0].values);
            addDBMap();
        }
    });//.then(function(doc) { addDBMap(); } );
}

function getBundleFile(path) {
    console.log(OFFMAP_NAME + ": getBundleFile()");
    console.log(OFFMAP_NAME + ": opening + "+ path);

    var xhr = new XMLHttpRequest();
    xhr.open('GET', mapsURL+path, true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = function(e) {
      var uInt8Array = new Uint8Array(this.response);
      sqlite = new SQL.Database(uInt8Array);
      var contents = sqlite.exec("SELECT * FROM tiles");
      console.log(contents);
      // contents is now [{columns:['col1','col2',...], values:[[first row], [second row], ...]}]

      DB.put({_id: "bundle", mbtiles:path ,database: uInt8Array}, function(err, response) {
          if(err) {
              if(err.status==500) {
                  $('#popupDataPresent').popup();
                  $('#popupDataPresent').popup('open');
              }
              else {
                  alert(err);
              }
              $.mobile.loading("hide");
              throw err;
          }
          else {
              //console.log("saved: ", response.id + " rev: " + response.rev);
              //fillDB(zip);
              $.mobile.loading("hide");
          }
      }).then(function(doc) { addDBMap(); });
    };
    xhr.send();


}

function initMap() {
    console.log(OFFMAP_NAME + ": initMap()");
    onlineLayer = L.tileLayer(
        'http://{s}.tile.osm.org/{z}/{x}/{y}.png',
        {attribution: "\u00a9 <a href=\"http://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"}
    );

    map = L.map('map',{
        maxZoom: maxZ,
        minZoom: minZ,
        zoom: maxZ,
        layers: [onlineLayer],
        center: [42.7019600 , 0.7955600]
    }).setView(new L.LatLng(42.7019600 , 0.7955600), maxZ-8);

    baseMaps = {
        "Online": onlineLayer
    };

    baseOverlay = {
        "Grid": L.grid()
    };
    control = L.control.layers(baseMaps, baseOverlay);
    control.addTo(map);

    // Make sure markers appear (in case we set them up before)
    markers.addTo(map);
}

function addDBMap() {
    console.log(OFFMAP_NAME + ": addDBMap()");

    markers.addTo(map);

    maxZ = sqlite.exec("SELECT max(zoom_level) FROM tiles")[0].values[0];
    minZ = sqlite.exec("SELECT min(zoom_level) FROM tiles")[0].values[0];


    metadata = sqlite.exec("SELECT * FROM metadata");
    imgType = metadata[0].values[5][1];
    str = metadata[0].values[0][1];
    compos = str.indexOf(',');
    lon = parseFloat(str.substring(0, compos));
    str = str.substring(compos+1, str.length);
    compos = str.indexOf(',');
    lat = parseFloat(str.substring(0, compos));
    str = str.substring(compos+1, str.length);
    compos = str.indexOf(',');
    lonn = parseFloat(str.substring(0, compos));
    str = str.substring(compos+1, str.length);
    latt = parseFloat(str.substring(0, str.length));
    console.log(OFFMAP_NAME + ": maxZoom is " + maxZ + " and minZoom is " + minZ);
    offlineLayer = new L.TileLayer.Functional(function(view) {
            var deferred = new jQuery.Deferred();
            var id = view.zoom + "/" + view.tile.column + "/" + view.tile.row + "." + imgType;
            //console.log(id);
            var imgBlob = sqlite.exec("SELECT tile_data FROM tiles WHERE zoom_level="+view.zoom+" AND tile_column="+view.tile.column+" AND tile_row="+view.tile.row);
            if(!imgBlob[0]) {
                //console.warn("Couldn't find tile " + id);
            }
            else {
                //console.warn("Found tile " + id);
                var reader = new FileReader();
                reader.addEventListener("loadend", function() {

                    //console.log(reader.result);
                    var imgURL = reader.result;
                    deferred.resolve(imgURL);

                    //URL.revokeObjectURL(imgURL);
                });
                //console.log(imgBlob[0].values[0][0]);
                reader.readAsDataURL(new Blob([imgBlob[0].values[0][0]], {type:"image/"+imgType}));

            }
            return deferred.promise();
    }, {tms: true});

    map.removeControl(control);
    offlineLayer.setZIndex(-1);
    baseMaps = {
        "Offline": offlineLayer,
        "Online": onlineLayer
    };
    control = L.control.layers(baseMaps, baseOverlay);
    control.addTo(map);
}

function addMarkerWithPopup(latlng, popupElement) {
    console.log(OFFMAP_NAME + ": addMarkerWithPopup()");
    var marker = L.marker(latlng)
        .bindPopup(popupElement);
    markers.addLayer(marker);
}

function removeMarkers() {
    console.log(OFFMAP_NAME + ": removeMarkers()");
    //markers.clearLayers();
    map.removeLayer(markers);
}

function deleteDB() {
    console.log(OFFMAP_NAME + ": deleteDB()");
    DB.destroy(function(err, info) {
       if(err) {
           alert("Could not delete DB: ", err);
           throw err;
       }
       else {
           console.log("Database deleted");
           manifest = null;
       }
    });
}