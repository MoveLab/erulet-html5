
var lang = null;
/*var lang = localStorage.getItem("language");
if(lang=="") {
    lang = navigator.language || navigator.userLanguage;
    lang = lang.substr(0,2);
}*/

// Icon data
var mapMarkerIcon = L.icon({
    iconUrl: 'icons/itinerary_marker.png',
    iconRetinaUrl: 'icons/itinerary_marker.png',
    iconSize: [20, 23],
    iconAnchor: [6, 22],
    popupAnchor: [0, -24],
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

var geolocatedIcon = L.icon({
    iconUrl: 'icons/green.png',
    iconRetinaUrl: 'icons/green.png',
    iconSize: [32, 32],
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

$(document).on('pagebeforeshow', '#switchboard', function() {
    if(sessionStorage.getItem('username')!=undefined && sessionStorage.getItem('token')!=undefined) {
        $('#registerAnchor').hide();
        $('#loginAnchor').hide();
        $('#logoffAnchor').show();
    }
    else {
        $('#registerAnchor').show();
        $('#loginAnchor').show();
        $('#logoffAnchor').hide();
    }
});

$(document).ready( function() {

    lang = localStorage.getItem("language");

    // Load translations
    var options = {
        langCodes: [ "oc", "ca", "en", "es", "fr" ],
        defaultCode: "ca",
        forceLanguage: lang
    };
    $(document).localizandroid(options);

    if(lang=="" || lang==null) {
        lang = navigator.language || navigator.userLanguage;
        lang = lang.substr(0,2);
    }

    $('#logoffAnchor').click(function() {
        sessionStorage.removeItem('username');
        sessionStorage.removeItem('token');
        location.reload();
    });

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

    // Process Register and Login screens
    $('#registerHTML').load(HOLETSERVER_MOBILEPAGES + lang + HOLETSERVER_MOBILEPAGES_REGISTER + " #main_id", function(response, status, xhr) {
        var url = HOLETSERVER_MOBILEPAGES + lang + HOLETSERVER_MOBILEPAGES_REGISTER;
        var htmlResponse = $.parseHTML(xhr.responseText);
        $('#registerPageTitle').append($(htmlResponse).find('#header_id:first-child').text()); // Get title from external page
        $(this).find('form:first-of-type').attr('action', HOLETSERVER_MOBILEPAGES + lang + HOLETSERVER_MOBILEPAGES_REGISTER); // Override url or it will fail miserably
        $(this).find('form:first-of-type').submit(function(e) {
             e.preventDefault();
             $.post(url, { csrfmiddlewaretoken: $(this).find("input[name='csrfmiddlewaretoken']").val(),
                 username: $(this).find('#id_username').val(), password1 : $('#id_password1').val(), password2: $('#id_password2').val()})
                 .done(function(data) {
                     var htmlData = $.parseHTML(data);
                     var credentials = $(htmlData).find('#credentials');
                     var errors = $(htmlData).find('ul.errorlist');    // Check for error messages, stored in p tags (may we use ID or class?)
                     if(credentials.text()=="") { // No credentials means error
                        $('#registerMessage').html(errors.html());
                        $('#popupRegister').popup('open');
                     }
                     else {
                         var json = $.parseJSON(credentials.text());
                         sessionStorage.setItem('username', json.username);
                         sessionStorage.setItem('token', json.token);
                         $.mobile.navigate("#switchboard");
                     }
                 })
                 .fail(function(response) {
                        var data = $.parseHTML(response.responseText);
                        var errors = $(data).find('p');

                        $('#loginMessage').html(errors.html());
                        $('#popupLogin').popup('open');
                 });
         });
        $('#registerHTML').trigger('create'); // Without this it won't apply styling

    });
    $('#loginHTML').load(HOLETSERVER_MOBILEPAGES + lang + HOLETSERVER_MOBILEPAGES_LOGIN + " #main_id", function(response, status, xhr) {
        var url = HOLETSERVER_MOBILEPAGES + lang + HOLETSERVER_MOBILEPAGES_LOGIN;
        var htmlResponse = $.parseHTML(xhr.responseText);
        $('#loginPageTitle').append($(htmlResponse).find('#header_id:first-child').text()); // Get title from external page
        $(this).find('form:first-of-type').attr('action', url); // Override url or it will fail miserably
        $(this).find('form:first-of-type').submit(function(e) {
            e.preventDefault();
            $.post(url, { csrfmiddlewaretoken: $(this).find("input[name='csrfmiddlewaretoken']").val(), next: $("input[name='next']").val(),
                username: $(this).find('#id_username').val(), password : $('#id_password').val()})
                .done(function(data) {
                    var htmlData = $.parseHTML(data);
                    var credentials = $(htmlData).find('#credentials');
                    var errors = $(htmlData).find('p');    // Check for error messages, stored in p tags (may we use ID or class?)
                    if(credentials.text()=="") { // No credentials means error
                        $('#loginMessage').text(errors.text());
                        $('#popupLogin').popup('open');
                    }
                    else {
                        var json = $.parseJSON(credentials.text());
                        sessionStorage.setItem('username', json.username);
                        sessionStorage.setItem('token', json.token);
                        $.mobile.navigate("#switchboard");
                    }
                })
                .fail(function(response) {
                        var data = $.parseHTML(response.responseText);
                        var errors = $(data).find('p');

                        $('#loginMessage').html(errors.html());
                        $('#popupLogin').popup('open');
                });

        });
        $('#loginHTML').trigger('create'); // Without this it won't apply styling
    });

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
        /*case 'register':
            path = navigator.onLine ? HOLETSERVER_MOBILEPAGES + lang + HOLETSERVER_MOBILEPAGES_REGISTER + " #_id" : 'offline.html';
            break;
        case 'login':
            path = navigator.onLine ? HOLETSERVER_MOBILEPAGES + lang + HOLETSERVER_MOBILEPAGES_LOGIN + " #body_id" : 'offline.html';
            break;*/
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