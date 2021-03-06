// OFFMAP_NAME + " for jQuery Mobile
//
// Copyright (c) 2014,2015 Jordi López
// MIT License - http://opensource.org/licenses/mit-license.php

/* Leaflet map with an offline layer created from a MBTiles file
*/

var OFFMAP_NAME = "offlinemaps.js";
console.log(OFFMAP_NAME + ": Initializing");

var dbname = "offmaps";
var dbname_con = "offcont";
var dbname_gcon = "offgcont";
var dbname_user = "usercont";
var sqlite = null;
var sqlite_general = null;
var DB = null;
var DB_cont = null;
var DB_gcont = null;
var DB_user = null;
var metadata = null;

//Map data
var maxZ = 18;
var minZ = 0;
var lat, lon, latt, lonn, compos, str;
var imgType;
var markers = new L.FeatureGroup();
var markersHLT = new L.FeatureGroup();
var geolocationControl;
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


    // Let's make the map use the whole space
    var windowHeight = $(window).height();
    var headerHeight = $("#mapHeader").height();

    // Expected height is window - header
    var realHeight = windowHeight - headerHeight;

    $("#map").height(realHeight);
    $("#map").css({ top: headerHeight }); // position under header

    $('#generalMapCheckbox').prop('checked', true).checkboxradio().checkboxradio('refresh');
    $('#deleteDBCheckbox').prop('checked', true).checkboxradio().checkboxradio('refresh');
    $('#deleteLocalCheckbox').prop('checked', true).checkboxradio().checkboxradio('refresh');


    if(localStorage.getItem("selectedRoute_name")!=null || localStorage.getItem("selectedRoute_name")!=undefined) {
        $(".status-text-rname").html(localStorage.getItem("selectedRoute_name"));
    }
    else {
        $(".status-text-rname").html($(document).localizandroid('getString', 'nothing'));
    }
});

$(document).ready(function() {
    //$(this).localizandroid();
    routesData = JSON.parse(localStorage.getItem("routesData"));
    //console.log(routesData);
    if(!routesData || routesData==null) {
        setLedIcon($(".status-led-gdata"), $(".status-text-gdata"), false);
    }
    else {
        setLedIcon($(".status-led-gdata"), $(".status-text-gdata"), true);
    }

    $(".route-desc-button").data("selectedRoute", localStorage.getItem("selectedRoute"));
    $(".route-desc-button").data("selectedRoute_serverid", localStorage.getItem("selectedRoute_serverid"));
    $(".route-desc-button").data("selectedRoute_mapid", localStorage.getItem("selectedRoute_mapid"));
    $(".route-desc-button").data("selectedRoute_name", localStorage.getItem("selectedRoute_name"));
});

// Handle clear button
$(document).on('click', '#dl_clear', function(e) {
   e.preventDefault(); // avoid calling things twice
   e.stopImmediatePropagation();
   $("#popupDelete").popup('close');
   deleteDB();
   //window.location.href = window.location.href.substr(window.location.href, window.location.href.lastIndexOf('#'));
});

$(document).on('change', '#selectRoutes', function() {

    if($("#selectRoutes :selected").text()!="") {
        var mapID = $("#selectRoutes :selected").data('mapid');
        var position = $("#selectRoutes").val()-1;
        var name = $("#selectRoutes :selected").text();
        var serverid = $("#selectRoutes :selected").data('serverid');
        $("#syncPopupYes").data("selectedRoute", position);
        $("#syncPopupYes").data("selectedRoute_serverid", serverid);
        $("#syncPopupYes").data("selectedRoute_mapid", mapID);
        $("#syncPopupYes").data("selectedRoute_name", name);
        //openRouteDescription(mapID, position, serverid);

        $("#syncRouteDescription").html(routesData[position]["description_"+lang]);
    }
});

$(document).on('click', '#routeDownload', function() {

        // Store selected route ID on routesData array and server ID
        localStorage.setItem("selectedRoute", $("#routeDownload").data("selectedRoute"));
        localStorage.setItem("selectedRoute_serverid", $("#routeDownload").data("selectedRoute_serverid"));
        localStorage.setItem("selectedRoute_mapid", $("#routeDownload").data("selectedRoute_mapid"));
        localStorage.setItem("selectedRoute_name", $("#routeDownload").data("selectedRoute_name"));

        $(".route-desc-button").data("selectedRoute", $("#routeDownload").data("selectedRoute"));
        $(".route-desc-button").data("selectedRoute_serverid", $("#routeDownload").data("selectedRoute_serverid"));
        $(".route-desc-button").data("selectedRoute_mapid", $("#routeDownload").data("selectedRoute_mapid"));
        $(".route-desc-button").data("selectedRoute_name", $("#routeDownload").data("selectedRoute_name"));
        getBundleFile(localStorage.getItem("selectedRoute_serverid"));
});

$(document).on('click', '#routeView', function() {
    viewRoute($(this), false);
});

$(document).on('click', '#routeSelect', function() {
    viewRoute($(this), true);
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
        localStorage.setItem("selectedRoute_name", $("#syncPopupYes").data("selectedRoute_name"));
        getBundleFile(localStorage.getItem("selectedRoute_serverid"));
    }
});

$(document).on('pageshow', '#trip_select', function() {

    if(navigator.onLine && routesData==null) {
        showMobileLoading($(document).localizandroid('getString', 'initializing_map'));
        loadRoutes();
    }
    else if(markers.getLayers().length==0) {
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

$(window).resize(function() {
    // Let's make the map use the whole space
    var windowHeight = $(window).height();
    var headerHeight = $("#mapHeader").height();

    // Expected height is window - header
    var realHeight = windowHeight - headerHeight;

    $("#map").height(realHeight);
    $("#map").css({ top: headerHeight }); // position under header
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
   localStorage.setItem("viewingRoute", elem.data('selectedRoute_serverid'));
   if(localStorage.getItem("selectedRoute")!=elem.data('selectedRoute_erverid')) {
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
        var results = drawRoute(routesData[elem.data('selectedRoute')].track.steps, POLYLINE_DEFAULT_COLOR, POLYLINE_DEFAULT_OPACITY, false);
        polyline = results[0];
        highlights = results[1];
        map.fitBounds(polyline.getBounds());

        putHighlights(highlights, markersHLT, elem.data('selectedRoute_serverid'));

        markers.addTo(map);
        markersHLT.addTo(map);

        if(locate) {
            map.locate({setView: true, maxZoom: 8, watch: true});
        }


        L.Control.Geolocation = L.Control.extend({
            options: {
                position: 'bottomleft',
            },

            onAdd: function (map) {
                var controlDiv = L.DomUtil.create('div', 'leaflet-control-geolocation');
                L.DomEvent
                    .addListener(controlDiv, 'click', L.DomEvent.stopPropagation)
                    .addListener(controlDiv, 'click', L.DomEvent.preventDefault)
                .addListener(controlDiv, 'click', function () { geolocate(); });

                controlDiv.innerHTML = '<a id="geolocationAnchor" href="#popupMessage" data-rel="popup" data-position-to="origin" data-transition="flow"><img id="geolocationIcon" src="icons/whereami_btn_alt.png"></a>';
                var controlUI = L.DomUtil.create('div', 'leaflet-control-command-interior', controlDiv);
                controlUI.title = 'Map Commands';
                return controlDiv;
            }
        });

        if(!geolocationControl) {
            geolocationControl = new L.Control.Geolocation({});
            map.addControl(geolocationControl);
        }
   }
}

function loadGeneralMap() {
    console.log(OFFMAP_NAME + ": loadGeneralMap()");
    if(!DB) { DB = new PouchDB(dbname);}
    //DB.get("generalMap").then( function(doc) {
    DB.get('generalMap').then(function(doc) {
        DB.remove(doc);
    }).catch(function(err) {
        switch(err.status) {
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
      var mbtilesf = zip.file(fName).asUint8Array();
      console.log("Downloaded DB : " + fName);
      sqlite_general = new SQL.Database(mbtilesf);

      mbtilesf = zip.file(fName).asArrayBuffer();
      //DB.put({_id: "generalMap", mbtiles:fName ,database: mbtiles}).catch(function(err){ });)
      /*DB.put({
        _id: "generalMap",
        _attachments: {
            'database': {
                name: fName,
                mbtiles: mbtilesf
            }
        }
      });*/
      putBlobInDB(DB, "generalMap", "application/x-sqlite3", mbtilesf, function(){addDBMap();});
      //addDBMap();
    }, 'gmap');

    url = HOLETSERVER_APIURL + HOLETSERVER_APIURL_GENERALCONTENT + $(window).width();
    getFileFromAPI(url, function(e) {
        var uInt8Array = new Uint8Array(this.response);

        var zip = new JSZip();
        zip.load(uInt8Array);

        storeContentsInDB(zip, DB_gcont);
        /*$.each(zip.files, function(index, value) {

            *//*DB.put({_id: value.name, file:value.asUint8Array()}, function(err, response) {

            }).catch(function(error) { });*//*
            DB_cont.put({
                _id: value.name,
                _attachments: {
                    'file': {
                        data: value.asArrayBuffer()
                    }
                }
            });
        });*/
        //$.mobile.loading("hide");

    }, 'gcontent');
}

function putHighlights(highlights, layer, serverid) {

    var arr = [];
    if(!DB_user) { DB_user = new PouchDB(dbname_user);}
    ajaxGet('GET', HOLETSERVER_APIURL + HOLETSERVER_APIURL_RATINGS_USER, HOLETSERVER_AUTHORIZATION,
        function(data){
            localStorage.setItem("ratingsData", JSON.stringify(data));


            $(data).each(function(index, value) {
                var id = '';
                if(value["route"]!=null) {
                    id = id + 'r' + value["route"];
                }
                if(value["highlight"]!=null) {
                    id = id + 'h' + value["highlight"];
                }
                //console.log("R " + value["rating"]);
                // Store rating object
                var obj = {};
                obj['_id'] = id;
                obj['rating'] = value["rating"];
                arr.push(obj);


            });
        },
        function(error) {
            console.log(error);
        },
        function() {
            //console.log(arr);
            DB_user.bulkDocs(arr).then(function(result) {
               // console.log(result);
                parseHighlights(highlights, layer, serverid);
            }).catch(function(err) {
                console.log(err);
            });
        }
    );

}


function parseHighlights(highlights, layer, serverid) {
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
                    //console.log(urlHTML);
                        $("#waypointHtmlPopup_loading").show();
                        $("#waypointHtmlPopup_content").html("");
                        parseHTMLFromDB(DB_cont, url, urlHTML);
                       // $('#waypointHtmlPopup_content').css('max-height', $(window).height()-100 + 'px');
                       // $("#waypointHtmlPopup_content").css('overflow-y', 'scroll');

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
                    DB_user.get('h'+value.highlights[0]["server_id"]).then(function(response) {
                        //$("#waypointInfoRatingField").html(response.rating);
                        console.log("Retrieved rating..." + response.rating);
                        $("#waypointInfoRatingField").rateit('value', response.rating);
                    }).catch(function(err) {
                        console.log(err);
                    });

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


function setLedIcon(icon, text, isOn) {
    if(isOn) {
        $(icon).attr('src','images/green.png');
        $(text).html('OK');
    }
    else {
        $(icon).attr('src', 'images/red.png');
        $(text).html('KO');
    }
}

function openDB() {
    console.log(OFFMAP_NAME + ": openDB()");

    DB = new PouchDB(dbname);
    DB_cont = new PouchDB(dbname_con);
    DB_gcont = new PouchDB(dbname_gcon);

    //DB.get("generalMap").then( function(doc) {
    DB.getAttachment("generalMap", "file").then(function(doc) {
        blobUtil.blobToArrayBuffer(doc).then(function(result) {
            var uint8Array = new Uint8Array(result);
            sqlite_general = createSQLiteObject(sqlite_general, uint8Array);
            setLedIcon($(".status-led-gmap"), $(".status-text-gmap"), true);

        }).then(function() {addDBMap();});

    }).catch(function(error) {
        switch(error.status) {
        case 404:
            console.warn(OFFMAP_NAME +  ": No general DB present");
            setLedIcon($(".status-led-gmap"), $(".status-text-gmap"), false);
        break;
        }
    });

    //DB_cont.get("routeMap").then( function(doc) {
    DB.getAttachment("routeMap", "file").then(function(doc) {
        blobUtil.blobToArrayBuffer(doc).then(function(result) {
            var uint8Array = new Uint8Array(result);
            sqlite = createSQLiteObject(sqlite, uint8Array);
            setLedIcon($(".status-led-rmap"), $(".status-text-rmap"), true);
        });
    }).catch(function(error) {
      switch(error.status) {
        case 404:
            console.warn(OFFMAP_NAME +  ": Not found on DB");
            setLedIcon($(".status-led-rmap"), $(".status-text-rmap"), false);
        break;
      }
    });

    // TODO: Think of a better way to check general/route content is present.
    DB_gcont.info(function(err, info) {
       // console.log(info.doc_count);
        switch(info.doc_count) {
            case 0:
            case 1:
                setLedIcon($(".status-led-gcontent"), $(".status-text-gcontent"), false);
                break;
            default:
                setLedIcon($(".status-led-gcontent"), $(".status-text-gcontent"), true);
                break;
        }
    });

    DB_cont.info(function(err, info) {
        //console.log(info.doc_count);
        switch(info.doc_count) {
            case 0:
            case 1:
                setLedIcon($(".status-led-rcontent"), $(".status-text-rcontent"), false);
                break;
            default:
                setLedIcon($(".status-led-rcontent"), $(".status-text-rcontent"), false);
                break;
        }
    });
}

function createSQLiteObject(sql, doc) {
    console.log(OFFMAP_NAME + ": opened MBTiles...");
    //console.log(doc.mbtiles);

    //sql = new SQL.Database(doc.database);
    sql = new SQL.Database(doc);
    console.log("Tables found on the DB: ");
    var result=sql.exec("SELECT name FROM sqlite_master WHERE type = 'table'");
    console.table(result[0].values);
    return sql;
}

function getBundleFile(serverid) {
    console.log(OFFMAP_NAME + ": getBundleFile()");
    var path = bundleFilename + serverid + '.zip';
    console.log(OFFMAP_NAME + ": opening "+ path);

    showMobileLoading($(document).localizandroid('getString', 'downloading'));
    // Delete old file
    DB_cont.get('routeMap').then(function(doc) {
        DB.remove(doc);
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

        mbtiles = zip.file(fName).asArrayBuffer();
       /* DB_cont.put({_id: "routeMap", mbtiles:fName ,database: mbtiles}).then( function(response) {
              $.mobile.loading("hide");
        }).catch(function(error) {
            //localStorage.setItem("selectedRoute_name", null);
              if(error.status==409) {
                  $('#popupDataPresent').popup();
                  $('#popupDataPresent').popup('open');
              }
              else {
                //alert(error);
                $("#dialogMessage-header").text($(document).localizandroid('getString', 'sync_error_title'));
                $("#dialogMessage-text").text(error);
                $("#dialogMessage").popup('open');
              }
          });*/
          putBlobInDB(DB, "routeMap", "application/x-sqlite3", mbtiles, function(){});
    }, 'rmap');

    url = HOLETSERVER_APIURL + HOLETSERVER_APIURL_ROUTECONTENT + serverid + "/" + $(window).width();
    console.log(url);
    getFileFromAPI(url, function(e) {
        var uInt8Array = new Uint8Array(this.response);

        var zip = new JSZip();
        zip.load(uInt8Array);

        storeContentsInDB(zip, DB_cont);


    }, 'rcontent');
}

function parseHTMLFromDB(dbname, url, urlHTML) {
    dbname.get(urlHTML).then(function(response) {
        $("#waypointHtmlPopup_loading").hide();
        var content = $.parseHTML(response.file);

        $("#waypointHtmlPopup_content").html("").append(content);
        $("#waypointHtmlPopup_content img").each(function(index, value) {
            //console.log(url+value.src.substr(value.src.lastIndexOf('/'), value.src.length));
            /*DB_cont.get(url + value.src.substr(value.src.lastIndexOf('/'), value.src.length), function(err, response) {

                // Generate base64 data and put in the img element
                var imgURL = 'data:' + response.type + ';base64,' + JSZip.base64.encode(response.file);
                value.src = imgURL;
            }).catch(function(error) {

            });*/
            dbname.getAttachment(url + value.src.substr(value.src.lastIndexOf('/'), value.src.length), 'file').then(function(blob) {
                var imgURL = blobUtil.createObjectURL(blob);
                value.src = imgURL;
            });

        });
        $("#waypointHtmlPopup_content link").each(function(index, value) {
            if(value.rel=="stylesheet") {
                var urlCSS = value.href.substr(value.href.lastIndexOf('/'), value.href.length);
                //console.log(urlCSS);  // Check for CSS file links
                dbname.get(url + urlCSS).then(function(response) {
                    //console.log(response.file);
                    $("head").append("<style type='text/css'>" + response.file + "</style>"); // Append CSS style
                });
            }
        });
        $("#waypointHtmlPopup_content a").each(function(index, value) {

            if(value.href.indexOf('.mp4') > -1) { // if file extension is .mp4, we have a video
                var urlVID = value.href.substr(value.href.lastIndexOf('/'), value.href.length);
                $("#waypointHtmlPopup_content").append('<video type="video/webm" width="320" height="240" id="video' + index + '" controls>Your browser does not support the video tag.</video>');
                dbname.getAttachment(url + urlVID, 'file').then(function(blob) {
                    var videoURL = blobUtil.createObjectURL(blob);
                    $("#video"+index).attr('src', videoURL);
                })
            }
            if(value.href.indexOf('general_references') > -1) { // external link, use general offline content

                $(value).on('click', function(e) {
                    e.preventDefault();
                    $("#waypointHtmlPopup_loading").show();
                    var urlLNK = value.href.substr(value.href.lastIndexOf('/'), value.href.length);
                    parseHTMLFromDB(DB_gcont, '', urlLNK);
                });
                /*$("#waypointHtmlPopup_content").html("");
                var urlLNK = value.href.substr(value.href.lastIndexOf('/')+1, value.href.length);
                //parseHTMLFromDB(DB_gcont, '', urlLNK);
                DB_gcont.get(urlLNK).then(function(response) {

                    //$(value).append(response);
                });*/

            }
        });
    }).catch(function(error) {
        switch(error.status) {
            case 404:
                console.warn(OFFMAP_NAME +  ": Not found on DB");
                $("#waypointHtmlPopup_content").append("No data");
            break;
        }
    });
}

function storeContentsInDB(zip, dbname) {
    $.each(zip.files, function(index, value) {

        if(value.name.indexOf('/') === -1) {  // Check for initial /, unify names
            value.name = '/' + value.name;
        }

        var filedata; //= value.asUint8Array();
        var filetype; //= 'text/html';
        var extension = value.name.substr(value.name.indexOf('.')+1, value.name.length);
        // console.log(extension);
        switch(extension) {
            case 'html':
            case 'css':
                filetype = 'text/' + extension;
                filedata = value.asBinary();
                dbname.put({
                    file: filedata,
                    type: filetype
                }, value.name).catch(function(err) {});

                break;
            case 'jpg':
            case 'jpeg':
            case 'png':
                filetype = 'image/' + extension;
                //filedata = value.asBinary();
                putBlobInDB(dbname, value.name, filetype, value.asArrayBuffer());
                break;
            case 'mp4':
                filetype = 'video/' + extension;
                //filedata = value.asBinary();
                putBlobInDB(dbname, value.name, filetype, value.asArrayBuffer());
                break;
        }
    });
}

function putBlobInDB(dbname, name, type, buffer, thenf) {
    blobUtil.arrayBufferToBlob(buffer, type).then(function(blob) {
        dbname.put({
            _id: name,
            _attachments: {
                'file': {
                    content_type: type,
                    data: blob
                }
            }
        });
    }).then(thenf);
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
    L.control.scale({position: 'bottomright'}).addTo(map);

    // Make sure markers appear (in case we set them up before)
    markers.addTo(map);
    polylines.addTo(map);
    markersHLT.addTo(map);
}

function geolocate() {
    map.locate({setView: true, maxZoom: 12});
    map.on('locationfound', function(e) {
        var marker = L.marker(e.latlng, {icon: geolocatedIcon});
        marker.addTo(markersHLT);
    });
    map.on('locationerror', function(e) {
        console.log(e);
        $("#popupMessage-text").text($(document).localizandroid('getString', 'still_lost'));
        $("#geolocationAnchor").click();
    });
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
   // console.log(OFFMAP_NAME + ": maxZoom is " + maxZ + " and minZoom is " + minZ);
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
    var marker = L.marker(latlng, {icon: routeMarkerIcon})
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
    var deleteDB = $('#deleteDBCheckbox').prop('checked');
    var deleteLocal = $('#deleteLocalCheckbox').prop('checked');


    if(deleteLocal == true ) {
        // Delete also local storage values, removeItem() does not seem to work
        localStorage.setItem("selectedRoute_steps", null);
        localStorage.setItem("selectedRoute_serverid", null);
        localStorage.setItem("selectedRoute_mapid", null);
        localStorage.setItem("selectedRoute_name", null);
        localStorage.setItem("selectedRoute", null);
        localStorage.setItem("routesData", null);
        localStorage.setItem("ratingsData", null);
        localStorage.setItem("viewingRoute", null);

        setLedIcon($(".status-led-gdata"), $(".status-text-gdata"), false);
    }

    if(deleteDB == true) {
        if(DB!=null) {
            DB.destroy(function(err, info) {
                if(!err) {
                   console.log("Database " + dbname + " deleted");
                   setLedIcon($(".status-led-gmap"), $(".status-text-gmap"), false);
                   //setLedIcon($(".status-led-gcontent"), $(".status-text-gcontent"), false);
                   setLedIcon($(".status-led-rmap"), $(".status-text-rmap"), false);
               }
               }).catch(function(error) {
                    //alert("Could not delete DB: ", error);
                    $("#dialogMessage-header").text($(document).localizandroid('getString', 'sync_error_title'));
                    $("#dialogMessage-text").text($(document).localizandroid('getString', 'db_error'));
                    $("#dialogMessage").popup('open');
              });
        }
        if(DB_cont!=null) {
            DB_cont.destroy(function(err, info) {
               if(!err) {
                   console.log("Database " + dbname_con+ " deleted");
                   //setLedIcon($(".status-led-rmap"), $(".status-text-rmap"), false);
                   setLedIcon($(".status-led-rcontent"), $(".status-text-rcontent"), false);
                   $(".status-text-rname").html($(document).localizandroid('getString', 'nothing'));
               }
               }).catch(function(error) {
                    //alert("Could not delete DB: ", error);
                    $("#dialogMessage-header").text($(document).localizandroid('getString', 'sync_error_title'));
                    $("#dialogMessage-text").text($(document).localizandroid('getString', 'db_error'));
                    $("#dialogMessage").popup('open');
               });
        }
        if(DB_gcont!=null) {
            DB_gcont.destroy(function(err, info) {
                 if(!err) {
                   console.log("Database " + dbname_gcon+ " deleted");
                   //setLedIcon($(".status-led-gmap"), $(".status-text-gmap"), false);
                   setLedIcon($(".status-led-gcontent"), $(".status-text-gcontent"), false);
                   $(".status-text-rname").html($(document).localizandroid('getString', 'nothing'));
               }
               }).catch(function(error) {
                    //alert("Could not delete DB: ", error);
                    $("#dialogMessage-header").text($(document).localizandroid('getString', 'sync_error_title'));
                    $("#dialogMessage-text").text($(document).localizandroid('getString', 'db_error'));
                    $("#dialogMessage").popup('open');
               });

        }
        if(DB_user!=null) {
            DB_user.destroy(function(err, info) {
                if(!err) {
                  console.log("Database " + dbname_user+ " deleted");

              }
              }).catch(function(error) {
                   //alert("Could not delete DB: ", error);
                   $("#dialogMessage-header").text($(document).localizandroid('getString', 'sync_error_title'));
                   $("#dialogMessage-text").text($(document).localizandroid('getString', 'db_error'));
                   $("#dialogMessage").popup('open');
              });
        }
    }
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


    $(".route-desc-button").data('selectedRoute', arrayPosition);
    $(".route-desc-button").data('selectedRoute_mapid', mapID);
    $(".route-desc-button").data('selectedRoute_serverid', serverid);
    $(".route-desc-button").data('selectedRoute_name', routesData[arrayPosition]["name_"+lang]);
    $("#popupRoute").popup();
    $("#popupRoute").popup('open');

}

function getFileFromAPI(url, onload, dloadType) {
    try {
        var xhr = new XMLHttpRequest();

        console.log(url);
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.addEventListener("progress", function(e) {
            if (e.lengthComputable) {
                showMobileLoading($(document).localizandroid('getString', 'downloading'));
                var percentComplete = e.loaded / e.total * 100;
                var status = percentComplete.toFixed(2) + '%';
                //Do something with upload progress
                //console.log(percentComplete);

                if(percentComplete.toFixed(0) == 100) {
                    setLedIcon($(".status-led-"+dloadType), $(".status-text-"+dloadType), true );
                }
                else {
                    $(".status-text-"+dloadType).html(status);
                }
            }
        }, false);
        xhr.addEventListener("load", function(e) {
            $.mobile.loading("hide");
        }, false);
        xhr.onload = onload;
        xhr.send();

        if(localStorage.getItem("selectedRoute_name")!=null || localStorage.getItem("selectedRoute_name")!=undefined) {
            $(".status-text-rname").html(localStorage.getItem("selectedRoute_name"));
        }
        else {
            $(".status-text-rname").html($(document).localizandroid('getString', 'nothing'));
        }
    }
    catch(error) {
        $("#dialogMessage-header").text($(document).localizandroid('getString', 'sync_error_title'));
        $("#dialogMessage-text").text($(document).localizandroid('getString', 'sync_error_message'));
        $("#dialogMessage").popup('open');
    }
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
            setLedIcon($(".status-led-gdata"), $(".status-text-gdata"), true);
            parseRoutesData(data);

        },
        function(error) {
            console.log(error);
            setLedIcon($(".status-led-gdata"), $(".status-text-gdata"), false);
            //alert("ERROR: Probably a network (offline/CORS) issue");
            $("#dialogMessage-header").text($(document).localizandroid('getString', 'sync_error_title'));
            $("#dialogMessage-text").text($(document).localizandroid('getString', 'sync_error_message'));
            $("#dialogMessage").popup('open');
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
        var mapfilename = value.map ? value.map.map_file_name : null;
        var routename = value["name_"+lang];
        if(mapfilename==null) { routename = routename + '<ERROR!>';}

        $("#selectRoutes").append("<option value='"+(index+1)+"' data-serverid='" + value.server_id + "' data-mapid='"+ mapfilename +"'>"+routename+"</option");

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
        container.html("<b><a class='mapPopupLink' href='#' data-serverid='" + value.server_id + "' data-arraypos='" + index + "' data-mapid='"  + mapfilename + "'>" + routename + "</a></b></br><p>" + value.track.steps[0].latitude + ","+ value.track.steps[0].longitude+ "</p>");

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
        //addMarkerWithPopup(latlngs[Math.round(latlngs.length/2)], container[0]);
        addMarkerWithPopup(latlngs[0], container[0]);
        drawRoute(steps, POLYLINE_COLORS[index], POLYLINE_DEFAULT_OPACITY, false);

    });
    if(!map) {
        initMap();
        openDB();
    }


}
