/**
 * Shared Utilities Module
 * @version 1.0.0
 */

/**
 * Shared Logger Class
 * Provides consistent, configuration-driven logging across modules.
 */
class Logger {
    /**
     * @param {object} config - The global FleetConfig object.
     */
    constructor(config) {
        this.config = config;
    }

    /**
     * Debug logging utility - only logs if debug mode is enabled.
     * @param {string} message - The message to log.
     * @param {...any} args - Additional arguments to log.
     */
    debugLog(message, ...args) {
        if (this.config && this.config.environment.debugMode) {
            const finalMessage = this.config.debug.showConsoleEmojis ?
                this._formatLogMessage(message, 'info') : message;
            console.log(finalMessage, ...args);
        }
    }

    /**
     * Debug warning utility - only logs if debug mode is enabled.
     * @param {string} message - The warning message to log.
     * @param {...any} args - Additional arguments to log.
     */
    debugWarn(message, ...args) {
        if (this.config && this.config.environment.debugMode) {
            const finalMessage = this.config.debug.showConsoleEmojis ?
                this._formatLogMessage(message, 'warn') : message;
            console.warn(finalMessage, ...args);
        }
    }

    /**
     * Error logging utility - always logs errors regardless of debug mode.
     * @param {string} message - The error message to log.
     * @param {...any} args - Additional arguments to log.
     */
    debugError(message, ...args) {
        const finalMessage = (this.config && this.config.debug.showConsoleEmojis) ?
            this._formatLogMessage(message, 'error') : message;
        console.error(finalMessage, ...args);
    }

    /**
     * Formats log messages with optional emojis based on keywords and type.
     * @private
     * @param {string} message - The message to format.
     * @param {string} type - The log type ('info', 'warn', 'error', 'success').
     * @returns {string} The formatted message.
     */
    _formatLogMessage(message, type = 'info') {
        if (!this.config || !this.config.debug.showConsoleEmojis) {
            return message;
        }

        // Emoji mapping based on type and content
        const emojiMap = {
            // System & Configuration
            'configuration': '⚙️', 'config': '⚙️', 'loading': '⏳', 'loaded': '✅',
            'initialized': '✅', 'complete': '✅', 'success': '✅', 'ready': '✅',
            // Data & Processing
            'processing': '🔄', 'extracting': '📤', 'parsing': '📋', 'validating': '🔍',
            'calculating': '🧮', 'data': '📊', 'records': '📊', 'payload': '🚛', 'fleet': '🚛',
            // Performance & Metrics
            'performance': '📈', 'timer': '⏱️', 'metrics': '📊', 'speed': '🚀',
            // Files & Export
            'file': '📁', 'pdf': '📄', 'excel': '📊', 'csv': '📝', 'export': '💾', 'import': '📤',
            // Errors & Warnings
            'error': '❌', 'failed': '❌', 'warning': '⚠️', 'alert': '⚠️',
            // UI & Interaction
            'filter': '🔍', 'search': '🔍', 'table': '📋', 'update': '🔄', 'render': '🎨',
            // Status
            'under': '🟡', 'optimal': '🟢', 'overload': '🔴', 'excavator': '🔧', 'dump truck': '🚛',
            // General
            'info': '💡', 'debug': '🐛', 'test': '🧪'
        };

        // Emojis for specific log types
        const typeEmojis = {
            'info': '💡', 'warn': '⚠️', 'error': '❌', 'success': '✅'
        };

        // Check if the message already contains an emoji
        const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
        if (emojiRegex.test(message)) {
            return message; // Message already has an emoji, do not add another.
        }

        // Find a suitable emoji based on message content keywords
        const lowerMessage = message.toLowerCase();
        for (const [keyword, emoji] of Object.entries(emojiMap)) {
            if (lowerMessage.includes(keyword)) {
                return `${emoji} ${message}`;
            }
        }

        // Fallback to an emoji based on the log type
        const typeEmoji = typeEmojis[type];
        if (typeEmoji) {
            return `${typeEmoji} ${message}`;
        }

        return message; // Return the original message if no emoji is found
    }
}

/**
 * Platform Detection Utilities
 */
class PlatformDetector {
    /**
     * Detects if the current device is a mobile device
     * @returns {boolean} True if mobile device
     */
    static isMobileDevice() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;

        // Check for mobile patterns in user agent
        const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;

        // Also check for touch capability and screen size
        const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth <= 768;

        return mobileRegex.test(userAgent) || (hasTouchScreen && isSmallScreen);
    }

    /**
     * Detects if the current platform is desktop
     * @returns {boolean} True if desktop
     */
    static isDesktop() {
        return !this.isMobileDevice();
    }

    /**
     * Gets the platform type
     * @returns {string} 'mobile' or 'desktop'
     */
    static getPlatformType() {
        return this.isMobileDevice() ? 'mobile' : 'desktop';
    }
}

// Expose classes to the global window object
window.Logger = Logger;
window.PlatformDetector = PlatformDetector;
