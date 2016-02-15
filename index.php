<?php
    function getWebsocketURL()
    {
        $settings = json_decode(file_get_contents("settings.json"));
        return 'wss://' . $settings->domain . ':' . $settings->port;
    }
?>
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>WebSocket Chat</title>
        <meta name="description" content="A simple websocket powered chat">
        <meta name="author" content="Wagner Patriota">
        <style>
            body { font-family: Verdana; color:DarkGreen; margin: 0px; height:100% }

            a { color:DodgerBlue }
            a:link { text-decoration: none }
            a:visited { text-decoration: none }
            a:hover { text-decoration: underline }

            #name { padding:10px; border-bottom: 1px solid DarkGreen; background-color: LightGreen }
            #name h1 { margin:0px }
            #name #welcome { float: right }

            #rooms { padding:30px }
            #rooms ul { width: 200px }
            #rooms li { list-style-type:none; border:1px solid Green; text-align:center; margin:5px; padding:4px; background:Honeydew }

            #room {margin:20px 30px }
            #chat { padding:0px 15px; margin:0; background: ghostwhite; border-radius: 8px; border:1px solid DarkGreen; height: 100px; overflow: scroll }

            #chat li { list-style-type:none; margin:5px 0; padding:0px }
            #chat img { vertical-align: middle }

            #inputBar { margin-top: 10px }

            input {
                font-size: 15pt;
                padding: 5px 10px;
                border: 1px solid Gray;
                border-radius: 4px;
                vertical-align: middle;
                width: 40%
            }

            #gif img { vertical-align: middle; width:40px; height:40px; }

            .leaveRoom { float: right }
        </style>
    </head>
    <body>
        <div id="message">
            Connecting to server...
        </div>
        <div id="main" style="display:none">
            <div id="name">
                <div id="welcome">
                    Welcome <span class="userName">...</span><br /><small>(<a href="#" id="changeName">Wanna change your name?</a>)</small>
                </div>
                <h1>WebSocket Chat</h1>
            </div>
            <div id="rooms">
                Here is the list of all available rooms! :-)<br />
                Pick one of them or <a href="#" id="newRoom">Create a new Room!</a>
                <ul>
                </ul>
            </div>
            <div id="room" style='display:none'>
                <div class="leaveRoom"><a href="#">Leave Room</a></div>
                <h2 id="title"></h2>
                <ul id="chat"></ul>
                <div id="inputBar">
                    <div class="leaveRoom"><a href="#">Leave Room</a></div>
                    <span class="userName">...</span>: <input type="text" id="chatText" /> <button id="sendMessage">Send</button>
                    <a href="#" id="gif"><img src="gif.jpg" /></a>
                </div>
            </div>
        </div>

        <script src="//code.jquery.com/jquery-2.2.0.min.js"></script>
        <script type="text/javascript">
            $(function()
            {
                var currentUser = null;

                var websocket = new WebSocket("<?php echo getWebsocketURL(); ?>");

                websocket.sendObject = function(object)
                {
                    this.send(JSON.stringify(object));
                };

                websocket.onopen = function()
                {
                    $("#message").hide();
                    $("#main").show();
                    websocket.sendObject({type: "list_rooms"});
                };

                websocket.onmessage = function(message)
                {
                    console.log(message.data);

                    var message = JSON.parse(message.data);

                    switch (message.type)
                    {
                        case "welcome":
                            {
                                currentUser = message.user;
                                $(".userName").text(currentUser.name);
                            }
                            break;
                        case "list_rooms":
                            {
                                $("#rooms ul").empty();

                                for (i in message.rooms)
                                {
                                    var room = message.rooms[i];
                                    $("#rooms ul").append("<li><a class='room' roomId='" + room.id + "' href='#'>" + room.title + "</a></li>");
                                }

                                $(".room").click(function()
                                {
                                    var roomId = $(this).attr("roomId");
                                    websocket.sendObject({type: "enter_room", roomId: roomId});

                                    $("#rooms").hide();
                                    $("#room #title").text($(this).text());
                                    $("#chat").empty();
                                    $("#room").show();
                                    resizeChat();
                                });
                            }
                            break;
                        case "enter_room":
                            {
                                appendChatMessage("<li><span>" + message.user.name + " joined the room.</span></li>");
                            }
                            break;
                        case "leave_room":
                            {
                                appendChatMessage("<li><span>" + message.user.name + " left the room.</span></li>");
                            }
                            break;
                        case "text":
                            {
                                var from = (currentUser.id == message.from.id) ? "You" : message.from.name;
                                appendChatMessage("<li><span>" + from + ":</span> <span>" + message.text + "</span></li>");
                            }
                            break;
                        case "gif":
                            {
                                var from = (currentUser.id == message.from.id) ? "You" : message.from.name;
                                appendChatMessage("<li><span>" + from + ":</span> <img src='gifs/" + message.gifId + ".gif' /></li>");
                            }
                            break;
                        case "change_name":
                            {
                                $("#chat").append("<li><span>" + message.oldName + " is now " + message.newName + "</span></li>");
                            }
                            break;
                    }
                };

                websocket.onerror = function(error)
                {
                    $("#main").hide();

                    $("#message").text("Could not connect to server... start the server and refresh this page!");
                    $("#message").show();
                };

                function sendText()
                {
                    if ($("#chatText").val().length)
                    {
                        websocket.sendObject({type: "text", text: $("#chatText").val()});
                        $("#chatText").val("");
                    }
                }

                $("#sendMessage").click(function()
                {
                    sendText();
                    return false;
                });

                $("#chatText").keypress(function(e)
                {
                    if (e.which == 13)
                    {
                        sendText();
                    }
                });

                $(".leaveRoom a").click(function()
                {
                    websocket.sendObject({type: "leave_room"});

                    $("#room").hide();
                    $("#rooms").show();

                    return false;
                });

                $("#changeName").click(function()
                {
                    var newName = prompt("Type a new name:");
                    if (newName)
                    {
                        currentUser.name = newName;
                        $(".userName").text(currentUser.name);
                        websocket.sendObject({type: "change_name", name: newName});
                    }
                    return false;
                });

                $("#newRoom").click(function()
                {
                    var newRoom = prompt("Type the name of the new room!");
                    if (newRoom)
                    {
                        websocket.sendObject({type: "create_room", title: newRoom});
                    }
                    return false;
                });

                $("#gif").click(function()
                {
                    websocket.sendObject({type: "gif", gifId: Math.floor((Math.random() * 5) + 1)});
                    return false;
                });

                function resizeChat()
                {
                    $("#chat").height($(window).height() * 0.95 - $("#chat").offset().top - $("#inputBar").height());
                }

                function appendChatMessage(chatMessage)
                {
                    $("#chat").append(chatMessage);
                    $("#chat").scrollTop(9999999);
                }

                $(window).resize(function()
                {
                    resizeChat();
                });
            });
        </script>
    </body>
</html>
