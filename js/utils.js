
var lang = null;
/*var lang = localStorage.getItem("language");
if(lang=="") {
    lang = navigator.language || navigator.userLanguage;
    lang = lang.substr(0,2);
}*/

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
    iconSize: [34, 53],
    iconAnchor: [16, 52],
    popupAnchor: [0, -54],
});

// Methods
$(document).on('pageshow', '#credits', function() {
    loadHTML($(this).attr('id'));
});

$(document).on('pageshow', '#security_recom', function() {
    loadHTML($(this).attr('id'));
});

$(document).on('pageshow', '#user_manual', function() {
    loadHTML($(this).attr('id'));
});

$(document).on('pageshow', '#register', function() {
    loadHTML($(this).attr('id'));
});

$(document).on('pageshow', '#login', function() {
    loadHTML($(this).attr('id'));
});


$(document).ready( function() {

    lang = localStorage.getItem("language");

    // Load translations
    var options = {
        langCodes: [ "oc", "ca", "en", "es", "fr" ],
        defaultCode: "ca",
        forceLanguage: lang
    };
    $(this).localizandroid(options);

    if(lang=="" || lang==null) {
        lang = navigator.language || navigator.userLanguage;
        lang = lang.substr(0,2);
    }
    // Load file

    $('#langSelector input').each(function(index, value) {
        if(localStorage.getItem("language")==value.value) {
            var selector = '#' + value.id;
            //$('input[name="langChoice"]').attr("checked", false).checkboxradio().checkboxradio('refresh', true);
            $(selector).attr('checked', true).checkboxradio().checkboxradio('refresh', true);

        }
    });

    $('#langSelector input').click(function() {
        localStorage.setItem("language", $(this)[0].value);
    });

    if(DEBUG) {
        $('#routeButtons').append("<button id='dl_r0' class='ui-btn ui-mini ui-icon-user ui-btn-icon-right ui-corner-all ui-icon-itineraryicon' data-mapid='58827839-f1df-475b-ae2f-7eb76c4d3284.mbtiles'>Test</button>");
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

function loadHTML(pageID) {
    console.log("loadHTML()");
    var path = null;
    var id = pageID;
     switch(pageID) {
        case 'security_recom':
            id = 'before_leaving';
            path = navigator.onLine ? HOLETSERVER_MOBILEPAGES + lang + HOLETSERVER_MOBILEPAGES_BLEAVING : 'html/' + id + '_' + lang + '.html';
            break;
        case 'user_manual':
            id = 'manual'
            path = navigator.onLine ? HOLETSERVER_MOBILEPAGES + lang + HOLETSERVER_MOBILEPAGES_MANUAL : 'html/' + id + '_' + lang + '.html';
            break;
        case 'credits':
            id = 'about';
            path = navigator.onLine ? HOLETSERVER_MOBILEPAGES + lang + HOLETSERVER_MOBILEPAGES_CREDITS : 'html/' + id + '_' + lang + '.html';
            break;
        case 'register':
            path = navigator.onLine ? HOLETSERVER_MOBILEPAGES + lang + HOLETSERVER_MOBILEPAGES_REGISTER : 'offline.html';
            break;
        case 'login':
            path = navigator.onLine ? HOLETSERVER_MOBILEPAGES + lang + HOLETSERVER_MOBILEPAGES_LOGIN : 'offline.html';
            break;
        default:
            console.log('skipping');
    }
    if(path != null) {
        console.log('Loaded ' + path);

        $.get(path, function(data) {
            $('#'+id).append(data);
        });
    }
}