var routesData = null;
var lang = getLanguage();

$(document).ready( function() {

    // Load file
    var lang = navigator.language || navigator.userLanguage;
    lang = lang.substr(0,2);

    $.each($('.loadHTML'), function() {
        var id = $(this).attr('id');
        var path;
        switch(id) {
            case 'beforeleaving':
                path = 'html/before_leaving_' + lang + '.html';
                break;
            case 'manual':
                path = 'html/manual_' + lang + '.html';
                break;
            case 'about':
                path = 'html/about_' + lang + '.html';
                break;
        }
        $(this).load(path, function(response, status, xhr) {
            if(status=="error") {
                var msg = "Sorry but there was an error: ";
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

    console.log("Retrieving routes...");
    // $.mobile.loading moved to 'pageshow' (does not work here)
    $.ajax({
        type: "GET",
        url: HOLETSERVER_APIURL + HOLETSERVER_APIURL_ROUTES,
        crossDomain: true,
        withCredentials: true,
        //headers: { Authorization: HOLETSERVER_AUTHORIZATION },
        beforeSend: function(request) {
            request.setRequestHeader("Authorization", HOLETSERVER_AUTHORIZATION);
        },
        success: function(data) {
            var count = data.length;
            //console.log("Fetched " + count + " elements: " );
            //console.table(data, ["server_id", "name_ca", "name_es", "map.map_file_name"]);
            //console.table(data  );
            $(data).each(function(index, value) {
                $("#selectRoutes").append("<option value='"+(index+1)+"' data-mapid='"+ value.map.map_file_name +"'>"+value["name_"+lang]+"</option");

                    // Create an element to hold all your text and markup
                    var container = $('<div />');

                    // Delegate all event handling for the container itself and its contents to the container
                    container.on('click', '.mapPopupLink', function() {
                        var mapID = $(this).data('mapid');
                        var position = $(this).data('arraypos');
                        openRouteDescription(mapID, position);
                    });

                    // Insert whatever you want into the container, using whichever approach you prefer
                    container.html("<b><a class='mapPopupLink' href='#' data-arraypos='" + index + "' data-mapid='"  + value.map.map_file_name + "'>" + value["name_"+lang] + "</a></b></br><p>" + value.track.steps[0].latitude + ","+ value.track.steps[0].longitude+ "</p>");
                    //container.append($('<span class="bold">').text(" :)"));

                    // Show routes on the map
                    addMarkerWithPopup(new L.LatLng(value.track.steps[0].latitude, value.track.steps[0].longitude), container[0]);

            });
            routesData = data;
        },
        error: function(error) {
            //console.log(error);
            alert("ERROR: Probably a CORS issue");
            $.mobile.loading("hide");
        }

    }).done( function() {
        $.mobile.loading("hide");
        setUpButtons();
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
    });

    $("#routeSelect").click(function(e) {

        if (navigator.onLine) {         // No internet, can't download
            $.mobile.loading("show", {
                text: "downloading files",
                textVisible: true,
                theme: "b",
                html: ""
            });
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


});

function openRouteDescription(mapID, arrayPosition) {
    // Define message
    $("#routeDescription").html(routesData[arrayPosition]["description_"+lang]);

    // Define mapid
    $("#routeSelect").data('mapid', mapID);

    $("#popupRoute").popup();
    $("#popupRoute").popup('open');
}

function setUpButtons() {

    $("#selectRoutes").change(function() {
        if($("#selectRoutes :selected").text()!="") {
            var mapID = $("#selectRoutes :selected").data('mapid');
            var position = $("#selectRoutes").val()-1;
            openRouteDescription(mapID, position);
        }
    });
/*
    $(".routeButton").click(function(e) {
    //$("#dl_r1").click(function(e) {
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
*/

}