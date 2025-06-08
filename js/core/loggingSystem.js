// js/core/loggingSystem.js (v2.0 - Notification History)

/**
 * @file loggingSystem.js
 * @description Provides a simple logging utility for the game.
 * Allows for different log levels and can be configured to show/hide logs.
 * v2.0: Added separate history for UI notifications.
 */

const LOG_LEVELS = {
    NONE: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4,
    VERBOSE: 5,
};

let currentLogLevel = LOG_LEVELS.INFO; // Default log level
let showTimestamp = true;
let logHistory = []; // For console/debug logs
const MAX_HISTORY_LENGTH = 100;

// --- FEATURE: Added Notification History ---
let notificationHistory = [];
const MAX_NOTIFICATION_HISTORY = 50; // Max number of UI notifications to keep
// --- END FEATURE ---


const loggingSystem = {
    levels: LOG_LEVELS,

    setLogLevel(level) {
        if (Object.values(LOG_LEVELS).includes(level)) {
            currentLogLevel = level;
        } else {
            console.error(`[Logging] Invalid log level: ${level}. Keeping current level: ${currentLogLevel}`);
        }
    },

    setShowTimestamp(show) {
        showTimestamp = !!show;
    },

    _log(level, tag, ...messages) {
        if (level <= currentLogLevel) {
            const timestamp = showTimestamp ? `[${new Date().toLocaleTimeString()}]` : '';
            const tagString = tag ? `[${tag}]` : '';
            const levelString = `[${Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level) || 'LOG'}]`;
            
            const logEntry = {
                timestamp: new Date(),
                level: levelString,
                tag: tag,
                messages: messages.map(m => (typeof m === 'object' ? JSON.stringify(m, null, 2) : m)),
            };

            logHistory.unshift(logEntry);
            if (logHistory.length > MAX_HISTORY_LENGTH) {
                logHistory.pop();
            }

            const consoleArgs = [`${timestamp}${levelString}${tagString}`, ...messages];
            switch (level) {
                case LOG_LEVELS.ERROR:
                    console.error(...consoleArgs);
                    break;
                case LOG_LEVELS.WARN:
                    console.warn(...consoleArgs);
                    break;
                case LOG_LEVELS.INFO:
                    console.info(...consoleArgs);
                    break;
                case LOG_LEVELS.DEBUG:
                case LOG_LEVELS.VERBOSE:
                    console.debug(...consoleArgs);
                    break;
                default:
                    console.log(...consoleArgs);
            }
        }
    },

    error(tag, ...messages) {
        this._log(LOG_LEVELS.ERROR, tag, ...messages);
    },

    warn(tag, ...messages) {
        this._log(LOG_LEVELS.WARN, tag, ...messages);
    },

    info(tag, ...messages) {
        this._log(LOG_LEVELS.INFO, tag, ...messages);
    },

    debug(tag, ...messages) {
        this._log(LOG_LEVELS.DEBUG, tag, ...messages);
    },

    verbose(tag, ...messages) {
        this._log(LOG_LEVELS.VERBOSE, tag, ...messages);
    },

    getLogHistory() {
        return [...logHistory];
    },

    clearLogHistory() {
        logHistory = [];
        this.info("LoggingSystem", "Log history cleared.");
    },

    // --- FEATURE: Functions for Notification History ---
    /**
     * Records a UI notification to its own history. This should be called by coreUIManager.showNotification.
     * @param {string} message The notification message.
     * @param {string} type The type of notification (e.g., 'success', 'error').
     */
    recordNotification(message, type = 'info') {
        const notificationEntry = {
            timestamp: new Date(),
            message: message,
            type: type,
        };

        notificationHistory.unshift(notificationEntry);
        if (notificationHistory.length > MAX_NOTIFICATION_HISTORY) {
            notificationHistory.pop();
        }
        // This doesn't log to console, it just records for the in-game log viewer.
    },

    /**
     * Retrieves the UI notification history.
     * @returns {Array<object>} An array of notification entry objects.
     */
    getNotificationHistory() {
        return [...notificationHistory];
    }
    // --- END FEATURE ---
};

loggingSystem.setLogLevel(LOG_LEVELS.DEBUG); 

export { loggingSystem };
