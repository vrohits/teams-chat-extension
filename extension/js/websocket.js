/**
 * Teams Chat Board - Native WebSocket STOMP Client
 * Lightweight STOMP 1.1/1.2 client over native WebSocket.
 * Zero external dependencies, fully compatible with Chrome Extension Manifest V3 CSP.
 */
class StompClient {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.subscriptions = new Map(); // id -> callback
        this.subCounter = 0;
        this.reconnectTimer = null;
        this.onConnectCallback = null;
        this.onErrorCallback = null;
        this.onDisconnectCallback = null;
        this.serverUrl = '';
    }

    connect(serverBaseUrl, onConnect, onError, onDisconnect) {
        this.serverUrl = serverBaseUrl;
        this.onConnectCallback = onConnect;
        this.onErrorCallback = onError;
        this.onDisconnectCallback = onDisconnect;

        // Convert http(s) to ws(s)
        let wsUrl = serverBaseUrl.replace(/^http/, 'ws');
        // Point to Spring Boot native WebSocket endpoint
        wsUrl = wsUrl.replace(/\/+$/, '') + '/ws-chat-native';

        try {
            if (this.ws) {
                this.ws.close();
            }
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                // Send STOMP CONNECT frame
                const connectFrame = "CONNECT\naccept-version:1.1,1.2\nheart-beat:10000,10000\n\n\0";
                this.ws.send(connectFrame);
            };

            this.ws.onmessage = (event) => {
                this._handleRawMessage(event.data);
            };

            this.ws.onerror = (err) => {
                console.warn('[STOMP] WebSocket error:', err);
                if (this.onErrorCallback) this.onErrorCallback(err);
            };

            this.ws.onclose = (event) => {
                this.connected = false;
                console.log('[STOMP] Connection closed. Code:', event.code);
                if (this.onDisconnectCallback) this.onDisconnectCallback(event);
                this._scheduleReconnect();
            };
        } catch (e) {
            console.error('[STOMP] Exception opening WebSocket:', e);
            if (this.onErrorCallback) this.onErrorCallback(e);
            this._scheduleReconnect();
        }
    }

    _scheduleReconnect() {
        if (this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (!this.connected && this.serverUrl) {
                console.log('[STOMP] Attempting reconnection...');
                this.connect(this.serverUrl, this.onConnectCallback, this.onErrorCallback, this.onDisconnectCallback);
            }
        }, 5000);
    }

    _handleRawMessage(data) {
        if (!data || data === '\n' || data === '\r\n') {
            // Heartbeat
            return;
        }

        // Parse STOMP frames
        const frames = data.split('\0');
        for (const rawFrame of frames) {
            const frameStr = rawFrame.trim();
            if (!frameStr) continue;

            const lines = frameStr.split('\n');
            const command = lines[0].trim();
            const headers = {};
            let bodyIndex = -1;

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line === '') {
                    bodyIndex = i + 1;
                    break;
                }
                const colonIdx = line.indexOf(':');
                if (colonIdx !== -1) {
                    const key = line.substring(0, colonIdx).trim();
                    const val = line.substring(colonIdx + 1).trim();
                    headers[key] = val;
                }
            }

            const body = bodyIndex !== -1 ? lines.slice(bodyIndex).join('\n') : '';

            if (command === 'CONNECTED') {
                this.connected = true;
                console.log('[STOMP] CONNECTED successfully!');
                if (this.onConnectCallback) this.onConnectCallback();
            } else if (command === 'MESSAGE') {
                const subId = headers['subscription'];
                if (subId && this.subscriptions.has(subId)) {
                    try {
                        const parsedBody = body ? JSON.parse(body) : null;
                        this.subscriptions.get(subId)(parsedBody, headers);
                    } catch (e) {
                        console.error('[STOMP] Error parsing message body:', e);
                    }
                }
            }
        }
    }

    subscribe(destination, callback) {
        const subId = 'sub-' + (++this.subCounter);
        this.subscriptions.set(subId, callback);

        if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            const frame = `SUBSCRIBE\nid:${subId}\ndestination:${destination}\n\n\0`;
            this.ws.send(frame);
        }

        return {
            id: subId,
            unsubscribe: () => {
                this.subscriptions.delete(subId);
                if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
                    const unsubFrame = `UNSUBSCRIBE\nid:${subId}\n\n\0`;
                    this.ws.send(unsubFrame);
                }
            }
        };
    }

    send(destination, payload = {}) {
        const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
        if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            const frame = `SEND\ndestination:${destination}\ncontent-type:application/json\n\n${body}\0`;
            this.ws.send(frame);
            return true;
        }
        return false;
    }

    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.connected = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

window.StompClient = StompClient;
