class ComprehensiveErrorBoundary {
    constructor() {
        this.isActive = false;
        this.componentHandlers = new Map();
    }

    init() {
        this.isActive = true;
        console.log('Error Boundary initialized');
    }

    registerComponent(componentId, errorHandler, recoveryHandler = null) {
        this.componentHandlers.set(componentId, {
            errorHandler,
            recoveryHandler
        });
    }

    handleComponentError(componentId, error, context = {}) {
        const component = this.componentHandlers.get(componentId);
        if (component) {
            component.errorHandler(error, context);
        } else {
            this.handleGlobalError({ error });
        }
    }

    handleGlobalError(event) {
        console.error('Global error:', event.error);
        const errorBoundary = document.getElementById('errorBoundary');
        if (errorBoundary) {
            errorBoundary.classList.add('active');
        }
        return false;
    }

    handlePromiseRejection(event) {
        console.error('Unhandled promise rejection:', event.reason);
        return false;
    }

    cleanup() {
        this.componentHandlers.clear();
        this.isActive = false;
    }
}

export { ComprehensiveErrorBoundary };