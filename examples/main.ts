import { WebSocketServer } from "../src/server/WebSocketServer";

function main(): void {
  const server = new WebSocketServer({
    port: 3000,
  });
}

main();
