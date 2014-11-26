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
var markersHLT = new L.FeatureGroup();
var polyline;

var map;
var onlineLayer, offlineLayer;
var baseMaps, baseOverlay;
var control;

$(document).on('pagebeforeshow', function() {   // Handle UI changes

    // Make sure controls are visible
    $("#routeControls").show("slow");


    // Handle clear button
    $("#dl_clear").click(function(e) {
        //e.preventDefault(); // it's an anchor
       deleteDB();
       $.mobile.navigate("#switchboard");
    });



    $("#routeView").click(function(e) {

       // Hide controls
       $("#routeControls").hide("slow");

       // Let's make the map use the whole space
       var windowHeight = $(window).height();
       var headerHeight = $("#mapHeader").height();

       // Expected height is window - header
       var realHeight = windowHeight - headerHeight;

       $("#map").height(realHeight);
       $("#map").css({ top: headerHeight }); // position under header
       removeMarkers();

       if(routesData) {
            if(polyline) {map.removeLayer(polyline)};
            console.log("Route selected: " + localStorage.getItem("selectedRoute"));
            var step = routesData[localStorage.getItem("selectedRoute")].track.steps;
            var highlights = [];
            var steps = [];
            var latlngs = [];
            step.sort(function(a,b){return a.order-b.order});
            $(step).each(function(index, value) {
                if(value.order!=null) {
                    steps[steps.length] = value;
                    latlngs[latlngs.length] = new L.LatLng(value.latitude, value.longitude);
                }
                else {
                    highlights[highlights.length] = value;
                }
            });
            localStorage.setItem("selectedRoute_steps", steps);
            localStorage.setItem("selectedRoute_highlights", highlights);
            //console.log(latlngs);
            //console.log(latlngs);
            polyline = L.polyline(latlngs, {color: POLYLINE_DEFAULT_COLOR, opacity: POLYLINE_DEFAULT_OPACITY}).addTo(map);
            map.fitBounds(polyline.getBounds());

            $(highlights).each(function(index, value) {
                console.log(value.highlights[0].type);
                var mIcon = waypointIcon;
                switch(value.highlights[0].type) {
                    case 0:
                        icon = mapMarkerIcon;
                        break;
                    case 1:
                        icon = waypointIcon;
                        break;
                }

                var marker = L.marker(new L.LatLng(value.latitude, value.longitude), {icon: mIcon}).bindPopup('<p>' + value.highlights[0]["long_text_"+lang] + '</p>');
                markersHLT.addLayer(marker);
            });
            markersHLT.addTo(map);
       }
    });

    $("#routeSelect").click(function(e) {

    });

});

$(document).ready(function() {
    loadRoutes();
    //getBundleFile(10);
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

function getBundleFile(serverid) {
    console.log(OFFMAP_NAME + ": getBundleFile()");
    var path = bundleFilename + serverid + '.zip';
    console.log(OFFMAP_NAME + ": opening "+ path);

   ajaxGetFile('GET', HOLETSERVER_APIURL + HOLETSERVER_APIURL_ROUTEMAPS+serverid+'/', HOLETSERVER_AUTHORIZATION,
     function(data) {
     console.log(data);
        var zip = new JSZip();
        zip.load(data);
        console.log(zip);
     },
     function(error) {
        console.log( error);
        //alert("ERROR: Probably a network (offline/CORS) issue");
        $.mobile.loading("hide");
     } );

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
    markersHLT.addTo(map);
}

function addDBMap() {
    console.log(OFFMAP_NAME + ": addDBMap()");

    markers.addTo(map);
    markersHLT.addTo(map);

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
    var marker = L.marker(latlng, {icon: mapMarkerIcon})
        .bindPopup(popupElement);
    markers.addLayer(marker);
}

function removeMarkers() {
    console.log(OFFMAP_NAME + ": removeMarkers()");
    //markers.clearLayers();
    map.removeLayer(markers);
    map.removeLayer(markersHLT);
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

function openRouteDescription(mapID, arrayPosition, serverid) {
    console.log(OFFMAP_NAME + ": openRouteDescription()");

    if (navigator.onLine) {         // No internet, can't download
        $.mobile.loading("show", {
            text: "downloading files",
            textVisible: true,
            theme: "b",
            html: ""
        });
       //var filename = $(this).data('mapid');
       //We'll use zip to avoid 5 mb quota limit of localStorage
       //filename = filename.replace('.mbtiles', '.mbtiles.zip');
       //console.log("Map file to load: " + $("#dl_r1").data('mapid'));
       getBundleFile(serverid);
   }
   else {
        $('#popupNoInternet').popup();
        $('#popupNoInternet').popup('open');
   }
}

function setUpButtons() {

    console.log(OFFMAP_NAME + ": setUpButtons()");
    $("#selectRoutes").change(function() {
        if($("#selectRoutes :selected").text()!="") {
            var mapID = $("#selectRoutes :selected").data('mapid');
            var position = $("#selectRoutes").val()-1;
            var serverid = $("#selectRoutes :selected").data('serverid');
            openRouteDescription(mapID, position, serverid);
        }
    });
}

function ajaxGetFile(type, url, token, successFunc, errorFunc, doneFunc) {
    $.ajax({
        type: type,
        url: url,
        //crossDomain: true,
        //responseType: 'blob',
        processData: false,
        /*withCredentials: false,*/
        /*xhrFields: {
            withCredentials: false
        },*/
       /* headers: {
            "Authorization": token
        },*/
        /*beforeSend: function(request) {
            request.setRequestHeader("Authorization", token);
        },*/
        success: successFunc,
        error: errorFunc
    });
}

function ajaxGetCORS(type, url, token, successFunc, errorFunc, doneFunc) {
    $.ajax({
        type: type,
        url: url,
        //crossDomain: true,
        /*withCredentials: false,*/
        /*xhrFields: {
            withCredentials: false
        },*/
        headers: {
            "Authorization": token
        },
        /*beforeSend: function(request) {
            request.setRequestHeader("Authorization", token);
        },*/
        success: successFunc,
        error: errorFunc
    }).done(doneFunc);
}

function loadRoutes() {
    console.log("Retrieving routes...");
    // $.mobile.loading moved to 'pageshow' (does not work here)
    ajaxGetCORS('GET', HOLETSERVER_APIURL + HOLETSERVER_APIURL_ROUTES, HOLETSERVER_AUTHORIZATION,
        function(data) {

            var count = data.length;
            //console.log("Fetched " + count + " elements: " );
            //console.table(data, ["server_id", "name_ca", "name_es", "map.map_file_name"]);
            //console.table(data  );
            $(data).each(function(index, value) {
                    $("#selectRoutes").append("<option value='"+(index+1)+"' data-serverid='" + value.server_id + "' data-mapid='"+ value.map.map_file_name +"'>"+value["name_"+lang]+"</option");

                    // Create an element to hold all your text and markup
                    var container = $('<div />');

                    // Delegate all event handling for the container itself and its contents to the container
                    container.on('click', '.mapPopupLink', function() {
                        var mapID = $(this).data('mapid');
                        var position = $(this).data('arraypos');
                        var serverid = $(this).data('serverid');
                        openRouteDescription(mapID, position, serverid);

                    });

                    // Insert whatever you want into the container, using whichever approach you prefer
                    container.html("<b><a class='mapPopupLink' href='#' data-serverid='" + value.server_id + "' data-arraypos='" + index + "' data-mapid='"  + value.map.map_file_name + "'>" + value["name_"+lang] + "</a></b></br><p>" + value.track.steps[0].latitude + ","+ value.track.steps[0].longitude+ "</p>");

                    var latlngs = [];
                    var steps = value.track.steps;
                    steps.sort(function(a,b){return a.order-b.order});
                    $(steps).each(function(index, value) {
                        if(value.order!=null) {
                            latlngs[latlngs.length] = new L.LatLng(value.latitude, value.longitude);
                        }
                    });
''
                    //console.log(value["name_"+lang] + " -> " + latlngs[0]);
                    // Show routes on the map
                    addMarkerWithPopup(latlngs[0], container[0]);



            });
            routesData = data;
        },
        function(error) {
            console.log(error);
            alert("ERROR: Probably a network (offline/CORS) issue");
            $.mobile.loading("hide");
        },
        function() {
                $.mobile.loading("hide");
                initMap();
                setUpButtons();

                openDB();
        });
}
