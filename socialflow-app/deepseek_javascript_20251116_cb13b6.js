class SecurityManager {
    constructor() {
        this.trustedTypesPolicy = null;
        this.initTrustedTypes();
    }

    async init() {
        return Promise.resolve();
    }

    initTrustedTypes() {
        if (window.trustedTypes && window.trustedTypes.createPolicy) {
            try {
                this.trustedTypesPolicy = trustedTypes.createPolicy('socialflowPolicy', {
                    createHTML: (html) => this.sanitizeHTML(html)
                });
            } catch (error) {
                console.warn('Trusted Types policy creation failed:', error);
            }
        }
    }

    sanitizeHTML(html) {
        if (!html) return '';
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Remove dangerous elements
        const dangerousTags = ['script', 'iframe', 'object', 'embed', 'link', 'form', 'meta'];
        dangerousTags.forEach(tag => {
            doc.querySelectorAll(tag).forEach(el => el.remove());
        });
        
        // Remove dangerous attributes
        const dangerousAttrs = ['onload', 'onerror', 'onclick', 'onmouseover', 'href', 'src', 'action'];
        dangerousAttrs.forEach(attr => {
            doc.querySelectorAll(`[${attr}]`).forEach(el => {
                if (attr === 'src' || attr === 'href') {
                    const value = el.getAttribute(attr);
                    if (!this.isSafeURL(value)) {
                        el.removeAttribute(attr);
                    }
                } else {
                    el.removeAttribute(attr);
                }
            });
        });

        return doc.body.innerHTML;
    }

    isSafeURL(url) {
        if (!url) return false;
        try {
            const parsed = new URL(url, window.location.origin);
            return !parsed.protocol.startsWith('javascript:') && 
                   !parsed.protocol.startsWith('data:') &&
                   !parsed.protocol.startsWith('vbscript:');
        } catch {
            return false;
        }
    }

    verifySecurityHeaders() {
        return true;
    }
}

export const securityManager = new SecurityManager();

export const strictSanitizeHTML = (strings, ...values) => {
    const fullHTML = String.raw(strings, ...values);
    if (securityManager.trustedTypesPolicy) {
        return securityManager.trustedTypesPolicy.createHTML(fullHTML);
    }
    return securityManager.sanitizeHTML(fullHTML);
};