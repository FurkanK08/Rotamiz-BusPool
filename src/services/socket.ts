import { io, Socket } from 'socket.io-client';

// Environment-based URL configuration
const getSocketUrl = () => {
    if (__DEV__) {
        return 'http://10.0.2.2:5000';
    }
    return process.env.SOCKET_URL || 'http://10.0.2.2:5000';
};

const SOCKET_URL = getSocketUrl();

class SocketService {
    socket: Socket | null = null;

    connect(token?: string) {
        if (!this.socket) {
            this.socket = io(SOCKET_URL, {
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
                auth: token ? { token } : undefined,
            });

            this.socket.on('connect', () => {
                console.log('Socket Connected:', this.socket?.id);
            });

            this.socket.on('disconnect', (reason) => {
                console.log('Socket Disconnected:', reason);
            });

            this.socket.on('reconnect_attempt', (attempt) => {
                console.log(`Socket reconnection attempt ${attempt}...`);
            });

            this.socket.on('reconnect_failed', () => {
                console.error('Socket reconnection failed after max attempts');
            });

            this.socket.on('connect_error', (error) => {
                console.warn('Socket connection error:', error.message);
            });
        }
    }

    joinService(serviceId: string) {
        this.socket?.emit('joinService', serviceId);
    }

    sendLocation(serviceId: string, location: any) {
        this.socket?.emit('sendLocation', { serviceId, location });
    }

    stopService(serviceId: string) {
        this.socket?.emit('stopService', { serviceId });
    }

    requestPassengerLocation(serviceId: string) {
        if (!this.socket) {
            console.warn('Socket not connected, cannot request location');
            return;
        }
        this.socket.emit('requestPassengerLocation', { serviceId });
    }

    sendPassengerLocation(serviceId: string, passengerId: string, location: any) {
        this.socket?.emit('passengerLocation', { serviceId, passengerId, location });
    }

    subscribeToLocationUpdates(callback: (location: any) => void) {
        this.socket?.on('receiveLocation', callback);
        return {
            unsubscribe: () => {
                this.socket?.off('receiveLocation', callback);
            }
        };
    }

    subscribeToServiceStop(callback: () => void) {
        this.socket?.on('serviceStopped', callback);
        return {
            unsubscribe: () => {
                this.socket?.off('serviceStopped', callback);
            }
        };
    }

    subscribeToLocationRequest(callback: () => void) {
        this.socket?.on('shareLocationRequest', callback);
        return {
            unsubscribe: () => {
                this.socket?.off('shareLocationRequest', callback);
            }
        };
    }

    subscribeToPassengerLocation(callback: (data: any) => void) {
        this.socket?.on('driverReceivePassengerLocation', callback);
        return {
            unsubscribe: () => {
                this.socket?.off('driverReceivePassengerLocation', callback);
            }
        };
    }

    // O4 FIX: Force reconnect with a new token
    reconnect(token?: string) {
        this.disconnect();
        this.connect(token);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export const socketService = new SocketService();
