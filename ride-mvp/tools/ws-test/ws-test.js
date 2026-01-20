import { io } from "socket.io-client";

const GATEWAY = process.env.GATEWAY || "http://localhost:8080";
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("Missing TOKEN env. Example: TOKEN=... node ws-test.js");
  process.exit(1);
}

const socket = io(GATEWAY, {
  transports: ["websocket"],
  auth: { token: TOKEN }
});

socket.on("connect", () => console.log("connected", socket.id));
socket.on("connected", (msg) => console.log("server says", msg));
socket.on("event", (evt) => console.log("EVENT:", evt));
socket.on("connect_error", (err) => console.error("connect_error", err.message));
