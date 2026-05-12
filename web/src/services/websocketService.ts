export type WebSocketMessage = {
  status: string;
  data?: any;
  message?: string;
  completed_status_message?: string;
  current_status_message?: string;
};

class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: ((msg: WebSocketMessage) => void)[] = [];
  private clientId: string;

  constructor() {
    this.clientId = crypto.randomUUID();
  }

  connect(url: string) {
    if (this.ws) {
        this.ws.close();
    }
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data);
        this.listeners.forEach(listener => listener(msg));
      } catch (e) {
        console.error("Failed to parse websocket message", e);
      }
    };

    this.ws.onerror = (e) => {
        console.error("Websocket error", e);
    };

    this.ws.onclose = () => {
        console.log("Websocket closed");
    };
  }

  addListener(listener: (msg: WebSocketMessage) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn("WebSocket is not open. Trying to send:", data);
    }
  }

  disconnect() {
      if (this.ws) {
          this.ws.close();
          this.ws = null;
      }
  }
}

export const wsService = new WebSocketService();
