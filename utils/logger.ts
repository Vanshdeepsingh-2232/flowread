type LogLevel = 'DEBUG' | 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';

interface LogConfig {
    enabled: boolean;
    logLevel: LogLevel;
    showTimestamps: boolean;
}

class Logger {
    private config: LogConfig = {
        enabled: (import.meta as any).env.DEV, // Only log in development by default
        logLevel: 'DEBUG',
        showTimestamps: true,
    };

    private levelPriority: Record<LogLevel, number> = {
        DEBUG: 0,
        INFO: 1,
        SUCCESS: 2,
        WARN: 3,
        ERROR: 4,
    };

    private getTimestamp(): string {
        const now = new Date();
        return now.toLocaleTimeString('en-US', { hour12: false });
    }

    private shouldLog(level: LogLevel): boolean {
        if (!this.config.enabled) return false;
        return this.levelPriority[level] >= this.levelPriority[this.config.logLevel];
    }

    /**
     * Removes sensitive fields like uid and email from objects before logging
     */
    private sanitize(data: any): any {
        if (!data || typeof data !== 'object') return data;
        if (data instanceof Error) return { message: data.message, code: (data as any).code };

        const sensitiveKeys = ['uid', 'email', 'password', 'photoURL', 'displayName'];
        const sanitized = Array.isArray(data) ? [...data] : { ...data };

        Object.keys(sanitized).forEach(key => {
            if (sensitiveKeys.includes(key)) {
                (sanitized as any)[key] = '[REDACTED]';
            } else if (typeof (sanitized as any)[key] === 'object') {
                (sanitized as any)[key] = this.sanitize((sanitized as any)[key]);
            }
        });

        return sanitized;
    }

    private log(level: LogLevel, service: string, message: string, data?: any): void {
        if (!this.shouldLog(level)) return;

        const timestamp = this.getTimestamp();
        const sanitizedData = this.sanitize(data);

        // Send to Vite Terminal Bridge safely via Fetch
        // This ensures NO application logs leak to the individual browser console
        fetch('/_log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors',
            body: JSON.stringify({
                level,
                service,
                message,
                data: sanitizedData,
                timestamp
            })
        }).catch(() => {
            // Silently fail if log bridge is unavailable (e.g. production)
        });
    }

    // Public API
    debug(service: string, message: string, data?: any): void {
        this.log('DEBUG', service, message, data);
    }

    info(service: string, message: string, data?: any): void {
        this.log('INFO', service, message, data);
    }

    success(service: string, message: string, data?: any): void {
        this.log('SUCCESS', service, message, data);
    }

    warn(service: string, message: string, data?: any): void {
        this.log('WARN', service, message, data);
    }

    error(service: string, message: string, error?: any): void {
        this.log('ERROR', service, message, error);
    }

    // Group logging for related operations
    group(service: string, message: string): void {
        this.log('INFO', service, `>>> Group: ${message}`);
    }

    groupEnd(): void {
        // Not implemented for bridge
    }

    // Performance timing
    private timers: Map<string, number> = new Map();

    time(label: string): void {
        this.timers.set(label, performance.now());
    }

    timeEnd(service: string, label: string): void {
        const start = this.timers.get(label);
        if (start === undefined) {
            this.warn('Logger', `No timer found for label: ${label}`);
            return;
        }

        const duration = ((performance.now() - start) / 1000).toFixed(2);
        this.info(service, `⏱️ ${label} completed in ${duration}s`);
        this.timers.delete(label);
    }

    // Configuration
    setConfig(config: Partial<LogConfig>): void {
        this.config = { ...this.config, ...config };
    }

    enable(): void {
        this.config.enabled = true;
    }

    disable(): void {
        this.config.enabled = false;
    }
}

// Export singleton instance
export const logger = new Logger();

// Make accessible in console for debugging only in DEV
if ((import.meta as any).env.DEV) {
    (window as any).__logger = logger;
    logger.info('Logger', 'Logging system redirected to Vite Terminal Bridge');
}
