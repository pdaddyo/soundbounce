

/* injected into play(er).spotify.com */

// looking for this kind of message
// {"type":"bridge_request","id":305,"name":"client_show_context_ui","args":[[],396,433,"spotify:user:lundinjoel:playlist:1ArDb6xiCBVejrcuqg99ga",1],"appVendor":"com.spotify","appVersion":"0.5.19"}
var actualCode = '(' + function() {


        if(window.location.href.indexOf('context-actions')>-1){
            window.top.addEventListener("message", function(e){
                if(e.data=="@execute_deferreds" || e.data[0]!="{")
                    return;
                try {
                    var data = JSON.parse(e.data);
                    if (data.name == "client_show_context_ui") {
                        var uri = data.args[0][0];
                        console.log("[soundbounce] clicked context menu!", uri);


                    }
                }catch(er){
                    console.log("[soundbounce] error in context menu handler",er);

                }
            });

            console.log("[soundbounce] found context menu");

        }

    } + ')();';


var script = document.createElement('script');
script.textContent = actualCode;
(document.head||document.documentElement).appendChild(script);
script.parentNode.removeChild(script);

