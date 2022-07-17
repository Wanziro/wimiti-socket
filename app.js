const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);

let connectedUsers = [];
let calledUsers = [];

const addUser = (username, socketId) => {
  !connectedUsers.some((user) => user.username === username) &&
    connectedUsers.push({
      username,
      socketId,
    });
};

const callUser = (participants) => {
  !calledUsers.some(
    (user) =>
      user.callee === participants.callee && user.caller === participants.caller
  ) &&
    calledUsers.push({
      caller: participants.caller,
      callee: participants.callee,
      callerImage: participants.callerImage,
    });
};

const removeCallUser = (participants) => {
  calledUsers = calledUsers.filter(
    (user) =>
      user.callee === participants.callee && user.caller === participants.caller
  );
};

const findUser = (username) => {
  return connectedUsers.find((user) => user.username === username);
};

const removeUser = (socketId) => {
  connectedUsers = connectedUsers.filter((user) => user.socketId !== socketId);
};

io.on("connection", (socket) => {
  console.log("A user connected");

  //take connected user's id
  socket.on("addUser", (username) => {
    console.log("user added");
    addUser(username, socket.id);
    io.emit("getAllOnlineUsers", connectedUsers);
  });

  socket.on("callUser", (participants) => {
    console.log("calling " + participants.callee);
    callUser(participants);
    // socket.emit("calledUsers", calledUsers);
    socket.broadcast.emit("calledUsers", calledUsers);
  });

  socket.on("callRejection", (participants) => {
    console.log("Call rejected by " + participants.doer);
    removeCallUser({ callee: participants.doer, caller: participants.seer });
    removeCallUser({ caller: participants.doer, callee: participants.seer });
    socket.broadcast.emit("callRejectionList", participants);
    socket.broadcast.emit("calledUsers", calledUsers);
  });

  socket.on("callAccepted", (participants) => {
    console.log("call accepted by " + participants.doer);
    // const socketId = connectedUsers.find(
    //   (item) => item.username == participants.seer
    // );
    // if (socketId) {
    //   io.to(socketId).emit("UserAcceptedCall", "true");
    // }
    socket.broadcast.emit("UserAcceptedCall", {
      seer: participants.seer,
      doer: participants.doer,
    });
  });

  socket.on("sendMessage", (message) => {
    console.log("sent message");
    console.log(message);
    const user = findUser(message.receiver);
    console.log("user", user);
    console.log("users list", connectedUsers);
    if (user !== undefined) {
      io.to(user.socketId).emit("getMessage", message);
      console.log("sent message to receiver");
    }
  });

  socket.on("markMessagesAsSeen", ({ sender, receiver }) => {
    const user = findUser(sender);
    if (user !== undefined) {
      io.to(user.socketId).emit("getMessagesSeen", receiver);
      console.log("Message seen notification sent to " + receiver);
    }
  });

  //send to all users
  socket.on("disconnect", () => {
    console.log("A user disconnected");
    removeUser(socket.id);
    io.emit("getAllOnlineUsers", connectedUsers);
  });
});

app.get("/", (req, res) => {
  res.send("<h1>Wimiti socket</h1>");
});

const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
