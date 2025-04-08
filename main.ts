import { WebSocketServer } from "./src/server/WebsocketServer";

function main(): void {
  new WebSocketServer({
    port: 3000,
    version: 13,
  });
}

main();
