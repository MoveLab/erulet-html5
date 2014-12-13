// OFFMAP_NAME + " for jQuery Mobile
//
// Copyright (c) 2014 Jordi López
// MIT License - http://opensource.org/licenses/mit-license.php

/* Leaflet map with an offline layer created from a MBTiles file
*/

var OFFMAP_NAME = "offlinemaps.js";
console.log(OFFMAP_NAME + ": Initializing");

var dbname = "offmaps";
var dbname_con = "offcont";
var sqlite = null;
var sqlite_general = null;
var DB = null;
var DB_cont = null;
var metadata = null;

//Map data
var maxZ = 18;
var minZ = 0;
var lat, lon, latt, lonn, compos, str;
var imgType;
var markers = new L.FeatureGroup();
var markersHLT = new L.FeatureGroup();
var polylines = new L.FeatureGroup();
var polyline;
var mapviewmode = 0;
var showsurvey = false;

var map;
var onlineLayer, offlineLayer;
var baseMaps, baseOverlay;
var control;
var routesData;

$(document).on('pagebeforeshow', function() {   // Handle UI changes

    // Make sure controls are visible
    //$("#routeControls:hidden").show("slow");

    mapviewmode=0;
    showsurvey=false;
    if(map) {map.stopLocate();}
    // Handle clear button
    $("#dl_clear").click(function(e) {
        //e.preventDefault(); // it's an anchor
       deleteDB();
       $.mobile.navigate("#switchboard");
    });

    // Let's make the map use the whole space
    var windowHeight = $(window).height();
    var headerHeight = $("#mapHeader").height();

    // Expected height is window - header
    var realHeight = windowHeight - headerHeight;

    $("#map").height(realHeight);
    $("#map").css({ top: headerHeight }); // position under header

    $('#generalMapCheckbox').prop('checked', true).checkboxradio().checkboxradio('refresh');

    $("#routeDownload").click(function(e) {
        getBundleFile($(this).data("serverid"));
    });

    $("#routeView").click(function(e) {
        viewRoute($(this), false);
    });

    $("#routeSelect").click(function(e) {
        //Geolocation
        viewRoute($(this), true);
    });

    $("#selectRoutes").change(function() {

            if($("#selectRoutes :selected").text()!="") {
                var mapID = $("#selectRoutes :selected").data('mapid');
                var position = $("#selectRoutes").val()-1;
                var serverid = $("#selectRoutes :selected").data('serverid');
                $("#syncPopupYes").data("selectedRoute", position);
                $("#syncPopupYes").data("selectedRoute_serverid", serverid);
                $("#syncPopupYes").data("selectedRoute_mapid", mapID);
                //openRouteDescription(mapID, position, serverid);
                $("#syncRouteDescription").html(routesData[position]["description_"+lang]);
            }
        });
    });

$(document).ready(function() {
    routesData = JSON.parse(localStorage.getItem("routesData"));

});

$(document).on('click', '#syncPopupYes', function() {       //avoid double-calling bug
    var dload_general = $('#generalMapCheckbox').prop('checked');
    var dload_routedata = $('#routeDataCheckbox').prop('checked');
    console.log(dload_general + " - " + dload_routedata);
    if(dload_general==true) {
        loadGeneralMap();
    }
    if(dload_routedata==true) {
        loadRoutes();
    }
    if($("#selectRoutes :selected").text()!="") {
        // Store selected route ID on routesData array and server ID
        localStorage.setItem("selectedRoute", $("#syncPopupYes").data("selectedRoute"));
        localStorage.setItem("selectedRoute_serverid", $("#syncPopupYes").data("selectedRoute_serverid"));
        localStorage.setItem("selectedRoute_mapid", $("#syncPopupYes").data("selectedRoute_mapid"));
        getBundleFile(localStorage.getItem("selectedRoute_serverid"));
    }
});

$(document).on('pageshow', '#trip_select', function() {
    // Workaround to show loading dialog (can't be used on document.ready()
    if(routesData==null) {
        showMobileLoading("initializing map...");
    }

    if(navigator.onLine && routesData==null) {
        loadRoutes();
    }
    else {
        parseRoutesData(routesData);
    }
});

$(document).on('pagebeforehide', '#trip_select', function() {
    if(showsurvey==true) {
        console.log("Show survey");
        showsurvey = false;
        window.location = HOLETSERVER_URL + lang + HOLETSERVER_MOBILEPAGES_SURVEY + localStorage.getItem("viewingRoute") + "/";
    }
});

function showMobileLoading(message) {
    $.mobile.loading("show", {
      text: message,
      textVisible: true,
      theme: "b",
      html: ""
    });
}

function viewRoute(elem, locate) {

   mapviewmode = 1;
   showsurvey = true;

   // Save serverid for survey
   localStorage.setItem("viewingRoute", elem.data('serverid'));
   if(localStorage.getItem("selectedRoute")!=elem.data('serverid')) {
        console.log("no data");
        $('#popupDataNoPresent').popup('open');
   }

   if(routesData) {
        if(polyline) {
            map.removeLayer(polyline);
            map.removeLayer(markersHLT);
            markersHLT = new L.FeatureGroup();
        };
        if(polylines) {
            map.removeLayer(polylines);
            polylines = new L.FeatureGroup();
            polylines.addTo(map);
        };
        //console.log("Route selected: " + localStorage.getItem("selectedRoute"));
        var highlights = [];
        var results = drawRoute(routesData[elem.data('arraypos')].track.steps, POLYLINE_DEFAULT_COLOR, POLYLINE_DEFAULT_OPACITY, false);
        polyline = results[0];
        highlights = results[1];
        map.fitBounds(polyline.getBounds());

        putHighlights(highlights, markersHLT, elem.data('serverid'));

        markers.addTo(map);
        markersHLT.addTo(map);

        if(locate) {
            map.locate({setView: true, maxZoom: 8, watch: true});
        }
   }
}

function loadGeneralMap() {
    console.log(OFFMAP_NAME + ": loadGeneralMap()");
    DB.get('generalMap', function(doc, err) {
        if(!err) {
            DB.remove(doc);
        }
    }).catch(function(error) {
        switch(error.status) {
            case 404:
                console.warn(OFFMAP_NAME +  ": Not found on DB");
            break;
        }
    });

    var url = HOLETSERVER_APIURL + HOLETSERVER_APIURL_GENERALMAP;
    getFileFromAPI(url, function(e) {

      var uInt8Array = new Uint8Array(this.response);

      var zip = new JSZip();
      zip.load(uInt8Array);
      var fName = zip.files[Object.keys(zip.files)[0]].name;
      var mbtiles = zip.file(fName).asUint8Array();
      console.log("Downloaded DB : " + fName);
      sqlite_general = new SQL.Database(mbtiles);

      DB.put({_id: "generalMap", mbtiles:fName ,database: mbtiles}, function(err, response) {

      }).catch(function(error) {
        });
      addDBMap();
    });

    url = HOLETSERVER_APIURL + HOLETSERVER_APIURL_GENERALCONTENT + $(window).width();
    getFileFromAPI(url, function(e) {
        var uInt8Array = new Uint8Array(this.response);

        var zip = new JSZip();
        zip.load(uInt8Array);
        $.each(zip.files, function(index, value) {

            DB.put({_id: value.name, file:value.asUint8Array()}, function(err, response) {
            }).catch(function(error) {
            });
        });
        $.mobile.loading("hide");

    });
}

function putHighlights(highlights, layer, serverid) {
if(!DB_cont) { DB_cont = new PouchDB(dbname_con);}
    $(highlights).each(function(index, value) {
        //console.log(value.highlights[0].type);
        var mIcon = waypointIcon;
        var marker;
        switch(value.highlights[0].type) {
            case 0:
                mIcon = mapMarkerIcon;
                marker = L.marker(new L.LatLng(value.latitude, value.longitude), {icon: mIcon}).bindPopup('<div style="float: left; width=50%"><a href="#waypointHtmlPopup" data-rel="popup" data-position-to="window" data-transition="pop"><img src="icons/ic_itinerary_icon.png"></img></a></div><p>' + value.highlights[0]["long_text_"+lang] + '</p>');
                marker.on('click', function(e) {
                    var url = 'route_' + serverid + '/highlight_' + value.highlights[0]["server_id"] + '/reference_' + value.highlights[0].references[0]["server_id"];
                    var urlHTML = url + '/reference_' + lang + '.html';
                    console.log(urlHTML);
                    DB_cont.get(urlHTML, function(err, response) {
                        var content = $.parseHTML(response.file);

                        $("#waypointHtmlPopup_content").html("").append(content);
                        $("#waypointHtmlPopup_content img").each(function(index, value) {
                            console.log(url+value.src.substr(value.src.lastIndexOf('/'), value.src.length));
                            DB_cont.get(url + value.src.substr(value.src.lastIndexOf('/'), value.src.length), function(err, response) {

                                // Generate base64 data and put in the img element
                                var imgURL = 'data:' + response.type + ';base64,' + JSZip.base64.encode(response.file);
                                value.src = imgURL;
                            });

                        });
                        $('#waypointHtmlPopup_content').css('max-height', $(window).height()-100 + 'px');
                        $("#waypointHtmlPopup_content").css('overflow-y', 'scroll');
                    }).catch(function(error) {
                        switch(error.status) {
                            case 404:
                                console.warn(OFFMAP_NAME +  ": Not found on DB");
                                $("#waypointHtmlPopup_content").append("No data");
                            break;
                        }
                    });
                });
                break;
            case 1:
                mIcon = waypointIcon;
                marker = L.marker(new L.LatLng(value.latitude, value.longitude), {icon: mIcon}).bindPopup('<div style="float: left; width=50%"><a href="#waypointInfoPopup" data-rel="popup" data-position-to="window" data-transition="pop"><img src="icons/ic_itinerary_icon.png"></img></a></div><p>' + value.highlights[0]["long_text_"+lang] + '</p>');
                marker.on('click', function(e) {
                    $("#waypointInfoImgHeader").src = 'icons/pin_chart.png';
                    $("#waypointInfoNameField").html( value.highlights[0]["name_"+lang]);
                    $("#waypointInfoDescField").html( value.highlights[0]["long_text_"+lang]);
                    $("#waypointInfoLatField").html(value["latitude"]);
                    $("#waypointInfoLongField").html(value["longitude"]);
                    $("#waypointInfoAltField").html(value["altitude"]);
                    $("#waypointInfoRatingField").html(value.highlights[0]["average_rating"]);
                });
                break;
        }

        //var marker = L.marker(new L.LatLng(value.latitude, value.longitude), {icon: mIcon}).bindPopup(popup);
        //layer.addLayer(marker);
        marker.addTo(markersHLT);
    });
}

function drawRoute(step, color, opacity, store) {
    console.log(OFFMAP_NAME + ": drawRoute()");
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
    if(store) {
        localStorage.setItem("selectedRoute_steps", steps);
        localStorage.setItem("selectedRoute_highlights", highlights);
    }
    L.polyline(latlngs, {weight:5, color: 'black', opacity: opacity}).addTo(polylines);
    var pLine = L.polyline(latlngs, {weight:2, color: color, opacity: opacity}).addTo(polylines);
    //polylines.addTo(map);
    return [pLine, highlights];
}

function openDB() {
    console.log(OFFMAP_NAME + ": openDB()");

    DB = new PouchDB(dbname);
    DB_cont = new PouchDB(dbname_con);

    DB.get("generalMap").then( function(doc) {
        sqlite_general = createSQLiteObject(sqlite_general, doc);
        addDBMap();
    }).catch(function(error) {
        switch(error.status) {
        case 404:
            console.warn(OFFMAP_NAME +  ": No general DB present");
        break;
        }
    });

    DB.get("routeMap").then( function(doc) {
        sqlite = createSQLiteObject(sqlite, doc);
    }).catch(function(error) {
      switch(error.status) {
        case 404:
            console.warn(OFFMAP_NAME +  ": Not found on DB");
        break;
      }
    });
}

function createSQLiteObject(sql, doc) {
    console.log(OFFMAP_NAME + ": opened MBTiles...");
    console.log(doc.mbtiles);

    sql = new SQL.Database(doc.database);
    console.log("Tables found on the DB: ");
    var result=sql.exec("SELECT name FROM sqlite_master WHERE type = 'table'");
    console.table(result[0].values);
    return sql;
}

function getBundleFile(serverid) {
    console.log(OFFMAP_NAME + ": getBundleFile()");
    var path = bundleFilename + serverid + '.zip';
    console.log(OFFMAP_NAME + ": opening "+ path);

    showMobileLoading("downloading maps");
    // Delete old file
    DB.get('routeMap', function(doc, err) {
        DB.remove(doc).catch(function(error) {});
    }).catch(function(error) {
        switch(error.status) {
        case 404:
            console.warn(OFFMAP_NAME +  ": Not found on DB");
        break;
        }
    });

    var url = HOLETSERVER_APIURL + HOLETSERVER_APIURL_ROUTEMAPS + serverid;

    getFileFromAPI(url, function(e) {
        var uInt8Array = new Uint8Array(this.response);

        var zip = new JSZip();
        zip.load(uInt8Array);
        var fName = localStorage.getItem("selectedRoute_mapid");
        var mbtiles = zip.file(fName).asUint8Array();
        console.log("Downloaded DB : " + fName);
        sqlite = new SQL.Database(mbtiles);
        //var contents = sqlite.exec("SELECT * FROM tiles");
        //console.log(contents);
        // contents is now [{columns:['col1','col2',...], values:[[first row], [second row], ...]}]

        DB.put({_id: "routeMap", mbtiles:fName ,database: mbtiles}, function(err, response) {
          if(err) {
              if(err.status==409) {
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
        }).catch(function(error) {
          });
    });

    url = HOLETSERVER_APIURL + HOLETSERVER_APIURL_ROUTECONTENT + serverid + "/" + $(window).width();
    console.log(url);
    getFileFromAPI(url, function(e) {
        var uInt8Array = new Uint8Array(this.response);

        var zip = new JSZip();
        zip.load(uInt8Array);

        $.each(zip.files, function(index, value) {
           var filedata; //= value.asUint8Array();
           var filetype; //= 'text/html';
           var extension = value.name.substr(value.name.indexOf('.')+1, value.name.length);
           console.log(extension);
           switch(extension) {
                case 'html':
                case 'css':
                    filetype = 'text/' + extension;
                    filedata = value.asBinary();
                    break;
                case 'jpg':
                case 'jpeg':
                case 'png':
                    filetype = 'image/' + extension;
                    filedata = value.asBinary();
                    break;
           }
           console.log(filetype);
           DB_cont.put({_id: value.name, file: filedata, type: filetype}, function(err, response) {

           }).catch(function(error) {
           });

        });
    });

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
    polylines.addTo(map);
    markersHLT.addTo(map);
}

function addDBMap() {
    console.log(OFFMAP_NAME + ": addDBMap()");

    markers.addTo(map);
    markersHLT.addTo(map);

    maxZ = (mapviewmode==1) ? sqlite.exec("SELECT max(zoom_level) FROM tiles")[0].values[0] :  sqlite_general.exec("SELECT max(zoom_level) FROM tiles")[0].values[0];
    minZ = (mapviewmode==1) ? sqlite.exec("SELECT min(zoom_level) FROM tiles")[0].values[0] :  sqlite_general.exec("SELECT min(zoom_level) FROM tiles")[0].values[0];


    metadata = (mapviewmode==1) ? sqlite.exec("SELECT * FROM metadata") : sqlite_general.exec("SELECT * FROM metadata");
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
            var imgBlob = (mapviewmode==1) ? sqlite.exec("SELECT tile_data FROM tiles WHERE zoom_level="+view.zoom+" AND tile_column="+view.tile.column+" AND tile_row="+view.tile.row) : sqlite_general.exec("SELECT tile_data FROM tiles WHERE zoom_level="+view.zoom+" AND tile_column="+view.tile.column+" AND tile_row="+view.tile.row);
            if(!imgBlob[0]) {
                console.warn("Couldn't find tile " + id);
            }
            else {
                readDataFromBlob(new Blob([imgBlob[0].values[0][0]], {type:"image/"+imgType}), deferred);
                //console.warn("Found tile " + id);


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

function readDataFromBlob(blob, deferred) {
    var reader = new FileReader();
    reader.addEventListener("loadend", function() {

        //console.log(reader.result);
        var imgURL = reader.result;
        deferred.resolve(imgURL);

        //URL.revokeObjectURL(imgURL);
    });
    //console.log(imgBlob[0].values[0][0]);
    reader.readAsDataURL(blob);
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

    if(DB==null) { DB = new PouchDB(dbname);}

    // Delete also local storage values, removeItem() does not seem to work
    localStorage.setItem("selectedRoute_steps", null);
    localStorage.setItem("selectedRoute_highlights", null);
    localStorage.setItem("selectedRoute_serverid", null);
    localStorage.setItem("selectedRoute_mapid", null);
    localStorage.setItem("selectedRoute", null);
    localStorage.setItem("routesData", null);

    DB.destroy(function(err, info) {
       if(err) {
           alert("Could not delete DB: ", err);
           $.mobile.navigate("#");
           throw err;
       }
       else {
           console.log("Database " + dbname + " deleted");
       }
    }).catch(function(error) {
      });

    DB_cont.destroy(function(err, info) {
       if(err) {
           alert("Could not delete DB: ", err);
           $.mobile.navigate("#");
           throw err;
       }
       else {
           console.log("Database " + dbname_con+ " deleted");
       }
    }).catch(function(error) {
      });

   $.mobile.navigate("#");

}

function openRouteDescription(mapID, arrayPosition, serverid) {
    console.log(OFFMAP_NAME + ": openRouteDescription()");

    // Define message
    $("#routeDescription").html(routesData[arrayPosition]["description_"+lang]);

    if(localStorage.getItem("selectedRoute_serverid")==serverid) {
        $(".route-desc-button-dload").hide();
        $(".route-desc-button-dloaded").show();
        //$("#routeSelect").show();
    }
    else {
        $(".route-desc-button-dload").show();
        $(".route-desc-button-dloaded").hide();
        //$("#routeSelect").hide();
    }

    // Define mapid
    $(".route-desc-button").data('arraypos', arrayPosition);
    $(".route-desc-button").data('mapid', mapID);
    $(".route-desc-button").data('serverid', serverid);
    $("#popupRoute").popup();
    $("#popupRoute").popup('open');

}

function getFileFromAPI(url, onload) {
    var xhr = new XMLHttpRequest();

    console.log(url);
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = onload;
    xhr.send();
}

function ajaxGet(type, url, token, successFunc, errorFunc, doneFunc) {
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
    ajaxGet('GET', HOLETSERVER_APIURL + HOLETSERVER_APIURL_ROUTES, HOLETSERVER_AUTHORIZATION,
        function(data) {

            localStorage.setItem("routesData", JSON.stringify(data));
            routesData = data;
            parseRoutesData(data);



        },
        function(error) {
            console.log(error);
            alert("ERROR: Probably a network (offline/CORS) issue");
            $.mobile.loading("hide");
        },
        function() {
           //setUpButtons();
            $.mobile.loading("hide");
        });
}

function parseRoutesData(data) {
    if(map) {map.removeLayer(markersHLT);}
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

        //console.log(value["name_"+lang] + " -> " + latlngs[0]);
        // Show routes on the map
        addMarkerWithPopup(latlngs[0], container[0]);
        drawRoute(steps, POLYLINE_COLORS[index], POLYLINE_DEFAULT_OPACITY, false);

    });
    if(!map) {
        initMap();
        openDB();
    }


}