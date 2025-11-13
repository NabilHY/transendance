"use strict";
import Fastify from "fastify";
import Websocket from "@fastify/websocket";
import Database from "better-sqlite3";
import crypto from "crypto";
import { SocketAddress } from "net";
import metricsPlugin from "../plugins/metrics/index.js";
import config from "../config.js";

const PORT = Number(config.PORT) || 8006;
// const DATABASE = process.env.DATABASE_PATH;
const DATABASE = "/usr/src/app/db/shared.sqlite";
// const DATABASE = "";


const fastify = Fastify();

const db = new Database(DATABASE);

const connectedUsers = new Map();

await fastify.register(Websocket);

await fastify.register(metricsPlugin);

fastify.decorate("db", db);

const channelMembers = {
  ch1: ["u1", "u2", "u3", "u4"],
  ch2: ["u1", "u2", "u3"],
  ch3: ["u1", "u2"],
};

function sendPendingMessages(socket, userId) {
  
  try {

    const pendingMessages = db
      .prepare("SELECT * FROM Messages WHERE receiver_id = ? AND delivered = 0")
      .all(userId);

    if (!pendingMessages.length) {
      console.log("no messages for ", userId);
      return;
    }

    for (const msg of pendingMessages) {
      console.log("Sending pending message to user:", userId);
      socket.send(JSON.stringify(msg));
    }

    // db.prepare("UPDATE Messages SET delivered = 0 WHERE receiver_id = ?").run(userId);
  } catch (err) {
    console.error("Error fetching pending messages:", err);
  }
}

function storeMessage(msg, delivered) {
  console.log("last thing");
  console.log("channel: ", msg.channel_id);
  
  console.log("delivered: ", delivered);

  try {
    db.prepare(`
      INSERT INTO Messages (id, sender_id, receiver_id, channel_id, content, sent_at, delivered)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      msg.sender_id,
      msg.receiver_id,
      msg.channel_id,
      msg.message_content,
      new Date().toISOString(),
      delivered ? 1 : 0
    );
  } catch (err) {
    // ! * WARNING: handle if the channel not found
    console.log("channel not found");
    
  }
}

function getChannelMembers(channel_id) {
  const members = db.prepare("SELECT * FROM ChannelMembers WHERE channel_id = ?").all(channel_id);
  if (!members || members.length === 0) {
    console.warn(`No members found for channel: ${channel_id}`);
    return [];
  }
  
  return members.map(member => member.user_id);
}

function sendToReceiver(message) {
  const receiverSocket = connectedUsers.get(message.receiver_id);
  const isOnline = receiverSocket && receiverSocket.readyState === 1;

  if (isOnline) {
    receiverSocket.send(JSON.stringify(message));
  }

  storeMessage(message, isOnline);
}

function sendToChannel(message) {
  const members = getChannelMembers(message.channel_id);
  for (const memberId of members) {
    if (memberId === message.sender_id) continue;
    if (!not_blocked(memberId, message.sender_id)) {
      console.log("user_id  ", memberId, "blocked the user ", message.sender_id);

      continue;
    } 

    message.receiver_id = memberId;

    sendToReceiver(message);
    // const memberSocket = connectedUsers.get(memberId);
    // if (memberSocket && memberSocket.readyState === 1) {
    //   memberSocket.send(JSON.stringify(message));
    // }
  }
}

function not_blocked(sender_id, receiver_id) {
  try {
    const blocked = db.prepare("SELECT * FROM BlockedUsers WHERE user_id = ? AND blocked_user_id = ?").get(receiver_id, sender_id);
    return !blocked;
  } catch (err) {
    console.error("Error checking block status:", err);
    return false;
  }
}

function isPrivateChannel(channelId) {
  console.log("channelId: ", channelId);
  
  try {
    const channel = db.prepare("SELECT * FROM Channels WHERE id = ? AND is_private = 1").get(channelId);
    // console.log("channel: ", channel);
    return true;
  } catch (err) {
    console.log("cannot find the channel");
    return false;
  }
}

fastify.get("/health", async (request, reply) => {
  return reply.send({ status: "ok" });
});

fastify.get("/ws", { websocket: true }, (socket, req) => {
  const userId = req.query.userId;
  if (!userId) {
    console.warn("Missing userId in query params");
    socket.close();
    return;
  }

  connectedUsers.set(userId, socket);

  sendPendingMessages(socket, userId);

  socket.on("message", (rawMsg) => {
    try {

      const msg = JSON.parse(rawMsg.toString());
      if (isPrivateChannel(msg.channel_id)) {
        console.log("------------------------------- PRIVATE -----------------------------------");
        if (msg.receiver_id && not_blocked(msg.sender_id, msg.receiver_id)) {
          console.log("not blocked user");
          sendToReceiver(msg);
        } else if (msg.receiver_id && !not_blocked(msg.sender_id, msg.receiver_id)) {
          console.log("* PRIVATE CHANNEL: user_id  ", msg.receiver_id, "blocked the user ", msg.sender_id);
          socket.send(JSON.stringify({ error: "You are blocked by the user." })); 
        }
      } else {
        console.log("------------------------------- CHANNEL -----------------------------------");
        console.log("group");
        console.log("Group message to channel:", msg.channel_id);
        sendToChannel(msg);
      }
    } catch (err) {
      console.error("Error handling message:", err);
    }
  });

  socket.on("close", () => {
    console.log(`User disconnected: ${userId}`);
    connectedUsers.delete(userId);
  });
});

fastify.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error("Error starting server:", err);
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`Server running on port ${PORT}`);
  console.log("Zaba w chta sabba");
});
