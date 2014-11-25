var routesData = null;
var lang = getLanguage();

// Icon data
var mapMarkerIcon = L.icon({
    iconUrl: 'icons/ic_map_marker.png',
    iconRetinaUrl: 'icons/ic_map_marker.png',
    iconSize: [53, 53],
    iconAnchor: [26, 52],
    popupAnchor: [0, -54],
   // shadowUrl: 'my-icon-shadow.png',
   // shadowRetinaUrl: 'my-icon-shadow@2x.png',
   // shadowSize: [68, 95],
    //shadowAnchor: [22, 94]
});

var waypointIcon = L.icon({
    iconUrl: 'icons/pin_chart.png',
    iconRetinaUrl: 'icons/pin_chart.png',
    iconSize: [53, 81],
    iconAnchor: [26, 80],
    popupAnchor: [0, -76],
});

// Methods
$(document).ready( function() {

    // Load file
    var lang = navigator.language || navigator.userLanguage;
    lang = lang.substr(0,2);

    $.each($('.loadHTML'), function() {
        var id = $(this).attr('id');
        var path;
        switch(id) {
            case 'beforeleaving':
                //path = 'html/before_leaving_' + lang + '.html';
                path = navigator.onLine ? HOLETSERVER_MOBILEPAGES + lang + HOLETSERVER_MOBILEPAGES_BLEAVING : 'html/before_leaving_' + lang + '.html';
                break;
            case 'manual':
                //path = 'html/manual_' + lang + '.html';
                path = navigator.onLine ? HOLETSERVER_MOBILEPAGES + lang + HOLETSERVER_MOBILEPAGES_MANUAL : 'html/manual_' + lang + '.html';
                break;
            case 'about':
                //path = 'html/about_' + lang + '.html';
                path = navigator.onLine ? HOLETSERVER_MOBILEPAGES + lang + HOLETSERVER_MOBILEPAGES_CREDITS : 'html/about_' + lang + '.html';
                break;
        }
                        console.log(path);
        $(this).load(path, function(response, status, xhr) {
            if(status=="error") {
                var msg = "Sorry but there was an error with " + path + ": ";
                $(this).html(msg+xhr.status+ " " + xhr.statusText);
            }
            /*else {
                // Replace wrong src
                $.each($('img'), function() {
                    var src = $(this).attr('src');
                    console.log("SRC: " + src);
                    $(this).attr('src', 'assets/' + src);
                });
            }*/
        });
    });

    if(DEBUG) {
        $('#routeButtons').append("<button id='dl_r0' class='ui-btn ui-shadow ui-corner-all ui-btn-icon-left ui-icon-itineraryicon ui-mini routeButtons' data-mapid='58827839-f1df-475b-ae2f-7eb76c4d3284.mbtiles'>Test</button>");
        $("#dl_r0").click(function(e) {
            if (navigator.onLine) {         // No internet, can't download
                $.mobile.loading("show", {
                    text: "downloading files",
                    textVisible: true,
                    theme: "b",
                    html: ""
                });
               //getBundleFile("/vielha");
               //var filename = $("#dl_r1").data('mapid');
               var filename = $(this).data('mapid');
               //We'll use zip to avoid 5 mb quota limit of localStorage
               //filename = filename.replace('.mbtiles', '.mbtiles.zip');
               //console.log("Map file to load: " + $("#dl_r1").data('mapid'));
               getBundleFile(filename);
           }
           else {
                $('#popupNoInternet').popup();
                $('#popupNoInternet').popup('open');
           }
        });
    }
});
