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