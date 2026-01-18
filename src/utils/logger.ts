class AppLogger {
    private static logs: string[] = [];
    private static maxLogs = 500;

    static log(category: string, message: string, data?: any) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${category}] ${message}`;
        const fullLog = data ? `${logEntry}\nData: ${JSON.stringify(data, null, 2)}` : logEntry;

        console.log(fullLog);
        this.logs.push(fullLog);

        // Keep only last N logs
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
    }

    static getLogs() {
        return this.logs.join('\n\n');
    }

    static clearLogs() {
        this.logs = [];
    }

    // Specific logging methods
    static startup(message: string) {
        this.log('STARTUP', message);
    }

    static navigation(screen: string, params?: any) {
        this.log('NAVIGATION', `Navigating to: ${screen}`, params);
    }

    static apiRequest(method: string, url: string, body?: any) {
        this.log('API-REQUEST', `${method} ${url}`, body);
    }

    static apiResponse(url: string, status: number, data?: any) {
        this.log('API-RESPONSE', `${url} - Status: ${status}`, data);
    }

    static apiError(url: string, error: any) {
        this.log('API-ERROR', `${url}`, {
            message: error.message,
            stack: error.stack
        });
    }

    static socket(event: string, data?: any) {
        this.log('SOCKET', event, data);
    }

    static error(category: string, error: any) {
        this.log('ERROR', `${category}: ${error.message}`, {
            stack: error.stack
        });
    }
}

export default AppLogger;
