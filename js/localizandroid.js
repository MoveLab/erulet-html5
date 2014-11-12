// localizandroid.js
//
// Copyright (c) 2014 Jordi López
// MIT License - http://opensource.org/licenses/mit-license.php

// An attempt to use Android string resources
// based on http://www.webgeekly.com/tutorials/jquery/how-to-make-your-site-multilingual-using-xml-and-jquery/


$(function() {
	$.mobile.loading("show", {
                        text: "initializing",
                        textVisible: true,
                        theme: "b",
                        html: ""
                    });
	// Configure the following variables to your needs
    var AVAILABLE_CODES = new Array("oc","ca", "en", "es");
    var DEFAULT_CODE = "en";
    var ARRAY_NAMES = new Array("gallery_array");
    var ARRAY_DATA_NAMES = new Array("gallery");
    // End of configurable variables
    
    var lang = navigator.language || navigator.userLanguage;
    lang = lang.substr(0,2); // check we are using a 2 character ISO code
    if($.inArray(lang, AVAILABLE_CODES)==-1 || lang==null) {
        lang=DEFAULT_CODE;
    }
    console.log("localizandroid.js: Language is: " + lang);
    var langCode = '-' + lang;
    $.ajax({
        type: "GET",
        url: "strings/values" + langCode + "/strings.xml",
        dataType: "xml",
        cache: "true",
        success: function(xml) {
            $(xml).find('string').each(function() { // Parse strings
                var name = $(this).attr('name');
                var text = $(this).text().replace(/\\/g,"");

                // Using custom data- attributes
                $(".localizable").map(function() {
                    if($(this).data("lclstring")==name) {
                        $(this).html(text);
                    }
                });
                $.mobile.loading('hide');
            });
            $(xml).find('string-array').each(function() { //Parse string arrays
                var pos = $.inArray($(this).attr('name'), ARRAY_NAMES);
                if(pos!=-1) {
                    var text = $(this).find('item').map(function() {
                        return $(this).text().replace(/\\/g,"");
                    });
					
					// Using custom data- attributes
                    $(".localizable").map(function() {
                        if($(this).data("lclstringarray")==ARRAY_DATA_NAMES[pos]) {
                            $(this).html(text.get($(this).data("lclstringarraypos")));
                        }

                    });
                    $.mobile.loading('hide');
                }
            });
        }
    });
});
