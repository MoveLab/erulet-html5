// offlinemaps.js for jQuery Mobile
//
// Copyright (c) 2014 Jordi López
// MIT License - http://opensource.org/licenses/mit-license.php

/* Leaflet map with an offline layer created from a downloaded zip file including the following:
*   tile image files (downloaded from MOBAC or another source) following the standard {z}/{x}/{y}.png paths
*   A json manifest file like this:
*    {
*        "version": <version number>,
*        "url": "/<folder name>/",
*        "imageType": "<image type (p.ex.("image/png")>",
         "maxZoom": <maxZoom level>,
         "minZoom": <minZoom level>
*    }
*   Configuration variables:
*       mapsURL: root folder for your maps
*       manifestURL: name of the json manifest <p.ex: manifest.json>
*       bundleFilename: name of the zip file to download <p.ex: bundle.zip>
*/

console.log("offlinemaps.js: Initializing");
var dbname = "offmaps";
var DB = null;
var manifest = null;
var zip = new JSZip;

$(document).on('pageshow', '#trip_select', function() {
    window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    if(!window.indexedDB) {
        window.alert("IndexedDB not supported.");
    }
    else {
        // try to load cached map
        openDB();
        dbMap(map);
    }
});


function openDB() {
    console.log("offlinemaps.js: openDB()");
    DB = new PouchDB(dbname);
    DB.get("MANIFEST", function(err,doc) {
        if(err) {
            console.warn("Manifest fetch error: ", err.error, " reason: ", err.reason, " status: ", err.status);
            manifest = null;
            //getManifest();
        }
        else {
            manifest = doc.data;
        }
    })
}

function dbMap(map) {
    var maxZ = 11;
    var minZ = 2;
    if(manifest!=null)  {
        maxZ = manifest.maxZoom;
        minZ = manifest.minZoom;
    }
    console.log("offlinemaps.js: dbMap()");
    var onlineLayer = L.tileLayer(
        'http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: "\u00a9 <a href=\"http://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors",

    });
    var offlineLayer = new L.TileLayer.Functional(function(view) {
        var deferred = new jQuery.Deferred();
        var id = view.zoom + "/" + view.tile.column + "/" + view.tile.row + ".png";
        DB.get(id, function(err, response) {
            if(err) {
                console.warn("Couldn't find tile");
            }
            else {
                console.log("Got " + response._id);
                //var blob = new Blob(response.data, {type:"image/png"});
                //var imgURL = window.URL.createObjectURL(blob);
                var imgURL = response.data;
                deferred.resolve(imgURL);
                URL.revokeObjectURL(imgURL);
            }
        });
        return deferred;
    });

    var map = L.map('map',{
        maxZoom: maxZ,
        minZoom: minZ,
        maxBounds: [{lat:42.164, lon:0.352}, {lat:42.940, lon:1.581}],
        layers: [offlineLayer, onlineLayer]
    }).setView(new L.LatLng(42.704,0.796), 11);

    var baseMaps = {
        "Offline": offlineLayer,
        "Online": onlineLayer
    };

    L.control.layers(baseMaps).addTo(map);
}

function getBundleFile(path) {
    console.log("offlinemaps.js: getBundleFile()");
    JSZipUtils.getBinaryContent(mapsURL + path + bundleFilename, function(err, data) {
        if(err) {
            alert(err);
            $.mobile.loading("hide");
            throw err;
        }
        else {
            console.log("Generating JSZip");
            zip.load(data);
            if(zip.file("manifest.json")==null) {
                alert("Data is corrupted or uncomplete");
            }
            else {
                parseManifest(zip);
                //fillDB(zip);
            }
        }
    });
}

function parseManifest(zip) {
    console.log("offlinemaps.js: parseManifest()");
    $.mobile.loading("show", {
       text: "parsing files",
       textVisible: true,
       theme: "b",
       html: ""
    });
    var data = $.parseJSON(zip.file(manifestURL).asBinary());
    console.log("offlinemaps.js: Route parsed: ", data.path);
    manifest = data;
    DB.put({_id: "MANIFEST", data: manifest}, function(err, response) {
        if(err) {
            alert(err);
            $.mobile.loading("hide");
            throw err;
        }
        else {
            console.log("saved: ", response.id + " rev: " + response.rev);
            fillDB(zip);
        }
    });
}

function fillDB(zip) {
    console.log("offlinemaps.js: fillDB()");
    $.mobile.loading("show", {
       text: "storing files",
       textVisible: true,
       theme: "b",
       html: ""
    });
    if(manifest == null) {
        alert("Manifest not found, please reload");
        $.mobile.loading("hide");
        return;
    }
    else {
        console.log("Fetching tiles");
        $.each(zip.files, function() {
            var file = this;//zip.file(this.path);
            if(file.name.indexOf("png")!=-1) {  // avoid folders, not needed
                var blob = "data:" + manifest.imageType +";base64," + JSZip.base64.encode(file.asBinary());
                //putImage(file.name, blob);

                /*
                *  TODO: WE MUST INSERT PNGs AS ATTACHMENTS (putImage()). FIX THIS ASAP
                *
                */
                DB.put({_id:file.name, data:blob}, function(err, response) {
                    if(err) {
                        alert(err);
                        $.mobile.loading("hide");
                        throw err;
                    }
                    else {
                        //console.log("saved: ", response.id + " rev: " + response.rev);
                     //   fillDB(zip);

                        $.mobile.loading("hide");
                    }
                });
            }

        });
    }
}


function deleteDB() {
    console.log("offlinemaps.js: deleteDB()");
    DB.destroy(function(err, info) {
       if(err) {
           alert("Could not delete DB: ", info);
           throw err;
       }
       else {
           console.log("Database deleted");
           manifest = null;
       }
    });
    /*PouchDB.destroy(dbname, function(err, info) {
        if(err) {
            alert("Could not delete DB: ", info);
            throw err;
        }
        else {
            console.log("Database deleted");
            manifest = null;
        }
    });*/
}

function putImage(name, blob) {
    DB.putAttachment(name + '/pic', blob, manifest.imageType,  function(err, response) {
        if(err) {
            alert(err);
            $.mobile.loading("hide");
            throw err;
        }
        else {
            console.log("saved: ",response.id+ " rev: "+ response.rev );
        }
    });
}
