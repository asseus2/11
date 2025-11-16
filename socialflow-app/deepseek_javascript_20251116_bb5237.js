class SecureAuthManager {
    constructor() {
        this.user = null;
        this.isDemoMode = false;
    }

    async init() {
        await this.checkAuthStatus();
    }

    async checkAuthStatus() {
        this.user = { 
            id: 'demo_user', 
            name: 'Demo User',
            email: 'demo@socialflow.com',
            avatar: 'https://picsum.photos/100/100?random=avatar'
        };
        return true;
    }

    enableDemoMode() {
        this.isDemoMode = true;
        this.user = { 
            id: 'demo_user', 
            name: 'Demo User',
            email: 'demo@socialflow.com',
            avatar: 'https://picsum.photos/100/100?random=avatar'
        };
    }

    get isAuthenticated() {
        return !!(this.user || this.isDemoMode);
    }

    get userInfo() {
        return this.user;
    }

    cleanup() {}
}

export { SecureAuthManager };