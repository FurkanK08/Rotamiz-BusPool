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

    connect() {
        if (!this.socket) {
            this.socket = io(SOCKET_URL);

            this.socket.on('connect', () => {
                console.log('Socket Connected:', this.socket?.id);
            });

            this.socket.on('disconnect', () => {
                console.log('Socket Disconnected');
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
        this.socket?.emit('requestPassengerLocation', { serviceId });
    }

    sendPassengerLocation(serviceId: string, passengerId: string, location: any) {
        this.socket?.emit('passengerLocation', { serviceId, passengerId, location });
    }

    subscribeToLocationUpdates(callback: (location: any) => void) {
        this.socket?.on('receiveLocation', callback);
    }

    subscribeToServiceStop(callback: () => void) {
        this.socket?.on('serviceStopped', callback);
    }

    subscribeToLocationRequest(callback: () => void) {
        this.socket?.on('shareLocationRequest', callback);
    }

    subscribeToPassengerLocation(callback: (data: any) => void) {
        this.socket?.on('driverReceivePassengerLocation', callback);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export const socketService = new SocketService();
