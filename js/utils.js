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
        //crossDomain: true,
        //withCredentials: true,
        beforeSend: function(request) {
            request.setRequestHeader("Authorization", HOLETSERVER_AUTHORIZATION);
        },
        success: function(data) {
            var count = data.length;
            var lang = getLanguage();
            console.log("Fetched " + count + " elements: " );
            console.log(data);
            $(data).each(function(index, value) {
                console.log(index + ". " + value.server_id + " - " +value["name_"+lang]);
                $("#routeButtons").append('<button id="dl_' + (index+1) + '" class="ui-btn ui-shadow ui-corner-all ui-btn-icon-left ui-icon-itineraryicon ui-mini" >' + value["name_"+lang] + '</button>');
                if(index<=count) { $.mobile.loading("hide"); }
            });
        },
        error: function(error) {
            console.log("ERROR: " + error.responseText);
        }
    });
});