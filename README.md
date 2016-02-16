# WebSocket Chat

This is a sample (and simple) websocket powered chat. It requires Node.js and PHP on the server side.

Installation is really easy and only requires the **ws** package for Node.js. One may install it using **npm**.

```
npm install ws
```

Check the *settings.json* file in order to make changes to host, port as well as SSL settings.

The file *wschat.conf* is a sample upstart script for Ubuntu.

## The chat protocol

The chat protocol works with JSON messages. Sample data will be used to explain the protocol details. Notice that messages of type **list_rooms**, for example, can be used on both directions (SERVER -> CLIENT or CLIENT -> SERVER). So, despite they have the same name, they have different meanings.

- **welcome**: The SERVER sends the **welcome** message once a new CLIENT connects. The message contains the ID and a temporary name "User X" that can be changed anytime.

  ```json
  {
    "type": "welcome",
    "user": {
      "id": 3,
      "name": "User 3"
    }
  }
  ```

- **list_rooms**: The CLIENT asks the SERVER to list all avaialble rooms for chat.

  ```json
  {
    "type": "list_rooms"
  }
  ```

  Answer: The SERVER answers the client with the list of available rooms.

  ```json
  {
    "type": "list_rooms",
    "rooms": {
      "1": {
        "id": 1,
        "title": "Room 1",
        "users": {
          "2": {
            "id": 2,
            "name": "Some user"
          }
        }
      },
      "2": {
        "id": 2,
        "title": "Room 2",
        "users": {}
      },
      "3": {
        "id": 3,
        "title": "Room 3",
        "users": {}
      }
    }
  }
  ```

- **enter_room**: The CLIENT asks the SERVER to enter in a specific room, via roomId.

  ```json
  {
    "type": "enter_room",
    "roomId": "1"
  }
  ```

  Answer: The SERVER broadcasts the answer to every participant of the room. So they can be notified about the new user in the room.

  ```json
  {
    "type": "enter_room",
    "user": {
      "id": 5,
      "name": "User 5"
    }
  }
  ```

- **text**: The CLIENT sends a text message to the chat.

  ```json
  {
    "type": "text",
    "text": "some message"
  }
  ```

  Answer: The SERVER broadcasts the text to every participant of the room identifying the sender of the text message.

  ```json
  {
    "type": "text",
    "text": "some message",
    "from": {
      "id": 4,
      "name": "User 4"
    }
  }
  ```
- **gif**: The CLIENT sends a gif message to the chat, identified by a gifId.

  ```json
  {
    "type": "gif",
    "gifId": 3
  }
  ```

  Answer: The SERVER broadcasts the gif to every participant of the room identifying the sender of the gif.

  ```json
  {
    "type": "gif",
    "gifId": 3,
    "from": {
      "id": 4,
      "name": "User 4"
    }
  }
  ```

- **leave_room**: The CLIENT sends this message when he/she wants to leave the room.

  ```json
  {
    "type": "leave_room"
  }
  ```

  Answer: The SERVER broadcasts it to all participants of the room.

  ```json
  {
    "type": "leave_room",
    "user": {
      "id": 2,
      "name": "User 2"
    }
  }
  ```

- **create_room**: The CLIENT sends this message to the SERVER to create a new room.

  ```json
  {
    "type": "create_room",
    "title": "some new room"
  }
  ```

  Answer: The SERVER will broadcast **list_rooms** to all clients.

- **change_name**: The CLIENT can change his/her name.
  ```json
  {
    "type": "change_name",
    "name": "my new name"
  }
  ```

  Answer: The SERVER will broadcast **change_name** to all participants of the room only if the sender of the message is in room. Otherwise, nothing happens.

  ```json
  {
    "type": "change_name",
    "oldName": "My old name",
    "newName": "My new name"
  }
  ```
