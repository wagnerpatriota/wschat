var fs = require("fs");
var ws = require("ws");
var https = require("https");

var UserStaticCounter = 1;

function User(websocket)
{
    this.websocket = websocket;
    this.id = UserStaticCounter++;
    this.name = "User " + this.id;

    this.toJson = function()
    {
        return {id: this.id, name: this.name};
    }
}

function UserCollection()
{
    var users = {};

    this.size = function()
    {
        var size = 0;
        for (i in users)
        {
            size++;
        }
        return size;
    };

    this.getUser = function(index)
    {
        return users[index];
    }

    this.getKeys = function()
    {
        var keys = [];
        for (key in users)
        {
            keys.push(key);
        }
        return keys;
    }

    this.toJson = function()
    {
        var ret = {};

        for (i in users)
        {
            if (i == "size")
            {
                continue;
            }

            var user = users[i];
            ret[user.id] = {id: user.id, name: user.name};
        }

        return ret;
    }

    this.addUser = function(user)
    {
        users[user.id] = user;
    }

    this.removeUser = function(user)
    {
        delete users[user.id];
    }

    this.getUsers = function()
    {
        return users;
    }
}

var UserManager = function()
{
    var userCollection = new UserCollection();

    this.createUser = function(ws)
    {
        var newUser = new User(ws);
        userCollection.addUser(newUser);
        return newUser;
    };

    this.removeUser = function(user)
    {
        userCollection.removeUser(user);
    };

    this.getUsers = function()
    {
        return userCollection;
    }
}

var RoomStaticCounter = 1;

function Room(title)
{
    this.id = RoomStaticCounter++;
    this.title = title;

    var userCollection = new UserCollection();

    this.toJson = function()
    {
        return {id: this.id, title: this.title, users: userCollection.toJson()};
    }

    this.addUser = function(user)
    {
        userCollection.addUser(user);
    }

    this.removeUser = function(user)
    {
        userCollection.removeUser(user);
    }

    this.getUsers = function()
    {
        return userCollection;
    }
}

var RoomManager = function()
{
    this.rooms = {
        1: new Room("Room 1"),
        2: new Room("Room 2"),
        3: new Room("Room 3")
    };

    this.createRoom = function(title)
    {
        var newRoom = new Room(title);
        this.rooms[newRoom.id] = newRoom;
        return newRoom;
    }

    this.removeRoom = function(room)
    {
        delete this.rooms[room.id];
    }

    this.getRoom = function(roomId)
    {
        for (i in this.rooms)
        {
            var room = this.rooms[i];
            if (room.id == roomId)
            {
                return room;
            }
        }

        return null;
    };

    this.getRoomFromUser = function(user)
    {
        for (i in this.rooms)
        {
            var room = this.rooms[i];
            var users = room.getUsers();

            for (var j = 0; j < users.size(); j++)
            {
                if (users.getUser(users.getKeys()[j]).id == user.id)
                {
                    return room;
                }
            }
        }

        return null;
    };

    this.toJson = function()
    {
        var ret = {};

        for (i in this.rooms)
        {
            var room = this.rooms[i];
            ret[room.id] = room.toJson();
        }

        return ret;
    };

    this.removeUser = function(user)
    {
        for (i in this.rooms)
        {
            var room = this.rooms[i];
            room.removeUser(user);
        }
    };
}

var WebSocketChat = function(settings)
{
    var roomManager = new RoomManager();
    var userManager = new UserManager();

    this.processRequest = function(request, response)
    {
        response.writeHead(200);
        response.end("\n");
    };

    this.sslConfig = {
        key: fs.readFileSync(settings.privateKey),
        cert: fs.readFileSync(settings.certificate)
    };

    this.listenOk = function()
    {
        try
        {
            process.setgid("users");
            process.setuid(settings.username);
        }
        catch (err)
        {
            console.log("It wasn't possible to drop root privileges!");
            process.exit(1);
        }
    };

    var broadcast = function(message)
    {
        var users = userManager.getUsers();

        for (var i = 0; i < users.size(); i++)
        {
            var user = users.getUser(users.getKeys()[i]);
            user.websocket.sendObject(message);
            console.log(user.toJson());
        }
    };

    var broadcastRooms = function()
    {
        broadcast({type: "list_rooms", rooms: roomManager.toJson()});
    }

    this.start = function()
    {
        var websocketServer = new ws.Server(
        {
            server: https.createServer(this.sslConfig, this.processRequest).listen(settings.port, null, this.listenOk)
        });

        websocketServer.on("connection", function(websocket)
        {
            websocket.sendObject = function(object)
            {
                if (this.readyState === this.CLOSED)
                {
                    return;
                }

                this.send(JSON.stringify(object));
            };

            var currentUser = userManager.createUser(websocket);
            websocket.sendObject({type: "welcome", user: currentUser.toJson()});

            console.log("USER " + currentUser.id + ": JOINED");

            function broadcastToRoom(message)
            {
                var room = roomManager.getRoomFromUser(currentUser);

                if (!room)
                {
                    return;
                }

                var roomUsers = room.getUsers();

                for (var i = 0; i < roomUsers.size(); i++)
                {
                    var user = roomUsers.getUser(roomUsers.getKeys()[i]);
                    user.websocket.sendObject(message);
                }
            }

            websocket.on("message", function(message)
            {
                console.log(message);

                message = JSON.parse(message);

                switch (message.type)
                {
                    case "change_name":
                        {
                            var oldName = currentUser.name;
                            currentUser.name = message.name;
                            broadcastToRoom({type: "change_name", oldName: oldName, newName: currentUser.name});
                        }
                        break;
                    case "create_room":
                        {
                            roomManager.createRoom(message.title);
                            broadcastRooms();
                        }
                        break;
                    case "list_rooms":
                        {
                            websocket.sendObject({type: "list_rooms", rooms: roomManager.toJson()});
                        }
                        break;
                    case "enter_room":
                        {
                            var room = roomManager.getRoom(message.roomId);
                            room.addUser(currentUser);
                            broadcastToRoom({type: "enter_room", user: currentUser.toJson()});
                        }
                        break;
                    case "text":
                        {
                            broadcastToRoom({type: "text", text: message.text, from: currentUser.toJson()});
                        }
                        break;
                    case "gif":
                        {
                            broadcastToRoom({type: "gif", gifId: message.gifId, from: currentUser.toJson()});
                        }
                        break;
                    case "leave_room":
                        {
                            broadcastToRoom({type: "leave_room", user: currentUser.toJson()});

                            var room = roomManager.getRoomFromUser(currentUser);
                            room.removeUser(currentUser);

                            if (room.getUsers().size() == 0)
                            {
                                roomManager.removeRoom(room);
                                broadcastRooms();
                            }
                        }
                        break;
                };
            });

            websocket.on("close", function(ws)
            {
                broadcastToRoom({type: "leave_room", user: currentUser.toJson()});

                userManager.removeUser(currentUser);
                roomManager.removeUser(currentUser);
                console.log("USER " + currentUser.id + ": LEFT");
            });
        });
    };
}

// entry point
var settings = JSON.parse(fs.readFileSync("settings.json").toString());
var webSocketChat = new WebSocketChat(settings);
webSocketChat.start();
