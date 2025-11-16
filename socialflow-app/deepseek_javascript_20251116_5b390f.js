class CircuitBreaker {
    constructor(options = {}) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttempt = Date.now();
        
        this.config = {
            failureThreshold: options.failureThreshold || 5,
            successThreshold: options.successThreshold || 3,
            timeout: options.timeout || 10000,
            resetTimeout: options.resetTimeout || 60000,
            ...options
        };
    }

    async execute(operation, context = {}) {
        if (this.state === 'OPEN') {
            if (Date.now() > this.nextAttempt) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error(`Circuit breaker is OPEN for ${context.operation || 'operation'}`);
            }
        }

        try {
            const result = await operation();
            this.onSuccess(context);
            return result;
        } catch (error) {
            this.onFailure(error, context);
            throw error;
        }
    }

    onSuccess(context) {
        this.failureCount = 0;
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= this.config.successThreshold) {
                this.state = 'CLOSED';
                this.successCount = 0;
            }
        }
    }

    onFailure(error, context) {
        this.failureCount++;
        if (this.state === 'HALF_OPEN') {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.config.timeout;
        } else if (this.failureCount >= this.config.failureThreshold && this.state === 'CLOSED') {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.config.timeout;
        }

        setTimeout(() => {
            if (this.state === 'OPEN' && Date.now() > this.nextAttempt + this.config.resetTimeout) {
                this.state = 'CLOSED';
                this.failureCount = 0;
            }
        }, this.config.resetTimeout);
    }

    getState() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            nextAttempt: this.nextAttempt
        };
    }
}

export class APICircuitBreaker extends CircuitBreaker {
    constructor() {
        super({
            failureThreshold: 5,
            timeout: 10000,
            resetTimeout: 60000
        });
    }
}