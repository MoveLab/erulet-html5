/*$( document ).on( "pageshow", "#switchboard", function( event ) {
    $.mobile.loading("show", {
           text: "parsing files",
           textVisible: true,
           theme: "b",
           html: ""
        });
});*/

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

});

$(document).on("pageshow", "#trip_select", function() {
    console.log("Retrieving routes...");
    $.mobile.loading("show", {
       text: "retrieving routes",
       textVisible: true,
       theme: "b",
       html: ""
    });
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
            var lang = getLanguage();
            //console.log("Fetched " + count + " elements: " );
            //console.table(data, ["server_id", "name_ca", "name_es", "map.map_file_name"]);
            //console.table(data  );
            $(data).each(function(index, value) {
                /*console.log(index + ". " + value.server_id + " - " +value["name_"+lang]);
                console.log(value.map.map_file_name);*/
                //$("#routeButtons").append('<button id="dl_r' + (index+1) + '" class="ui-btn ui-shadow ui-corner-all ui-btn-icon-left ui-icon-itineraryicon ui-mini routeButton" data-mapid="' + value.map.map_file_name + '">' + value["name_"+lang] + '</button>');
                $("#selectRoutes").append("<option value='"+(index+1)+"' data-mapid='"+ value.map.map_file_name +"'>"+value["name_"+lang]+"</option");
            });
        },
        error: function(error) {
            //console.log(error);
            alert("ERROR: Probably a CORS issue");
            $.mobile.loading("hide");
        }
    }).done( function() {
        $.mobile.loading("hide");
        setUpButtons(); });
    });

function setUpButtons() {

    $("#selectRoutes").change(function() {
        if($("#selectRoutes :selected").text()!="") {
            if (navigator.onLine) {         // No internet, can't download
                $.mobile.loading("show", {
                    text: "downloading files",
                    textVisible: true,
                    theme: "b",
                    html: ""
                });
               //getBundleFile("/vielha");
               //var filename = $("#dl_r1").data('mapid');
               var filename = $("#selectRoutes :selected").data('mapid');
               //We'll use zip to avoid 5 mb quota limit of localStorage
               //filename = filename.replace('.mbtiles', '.mbtiles.zip');
               //console.log("Map file to load: " + $("#dl_r1").data('mapid'));
               getBundleFile(filename);
           }
           else {
                $('#popupNoInternet').popup();
                $('#popupNoInternet').popup('open');
           }
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