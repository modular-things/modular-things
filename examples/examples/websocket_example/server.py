from SimpleWebSocketServer import SimpleWebSocketServer, WebSocket
import threading
import json
server = None
clients = []


data = [[i, i*i] for i in range(10)]
data_txt = json.dumps(data)


class SimpleWSServer(WebSocket):
    def handleConnected(self):
        print("New client")
        self.sendMessage(data_txt)
        clients.append(self)

    def handleClose(self):
        clients.remove(self)


def run_server():
    print("starting server")
    global server
    server = SimpleWebSocketServer('127.0.0.1', 9000, SimpleWSServer,
                                   selectInterval=(1000.0 / 15) / 1000)
    server.serveforever()

run_server()

# t = threading.Thread(target=run_server)
# t.start()
