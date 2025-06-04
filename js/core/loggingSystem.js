// js/core/loggingSystem.js

/**
 * @file loggingSystem.js
 * @description Provides a simple logging utility for the game.
 * Allows for different log levels and can be configured to show/hide logs.
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
let logHistory = []; // Optional: to store logs for display in UI
const MAX_HISTORY_LENGTH = 100; // Max number of log entries to keep

const loggingSystem = {
    levels: LOG_LEVELS,

    /**
     * Sets the current logging level.
     * Messages with a level higher than this will not be displayed.
     * @param {number} level - One of the LOG_LEVELS values.
     */
    setLogLevel(level) {
        if (Object.values(LOG_LEVELS).includes(level)) {
            currentLogLevel = level;
            // console.log(`[Logging] Log level set to: ${Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level)} (${level})`);
        } else {
            console.error(`[Logging] Invalid log level: ${level}. Keeping current level: ${currentLogLevel}`);
        }
    },

    /**
     * Enables or disables showing timestamps in log messages.
     * @param {boolean} show - True to show timestamps, false otherwise.
     */
    setShowTimestamp(show) {
        showTimestamp = !!show;
    },

    /**
     * Internal log function.
     * @param {number} level - The log level of the message.
     * @param {string} tag - A tag for the message (e.g., module name).
     * @param {...any} messages - The messages to log.
     */
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

            // Store in history
            logHistory.unshift(logEntry);
            if (logHistory.length > MAX_HISTORY_LENGTH) {
                logHistory.pop();
            }

            // Output to console
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
                    console.debug(...consoleArgs); // console.debug might not be styled differently in all browsers, console.log is an alternative
                    break;
                default:
                    console.log(...consoleArgs);
            }
        }
    },

    /**
     * Logs an error message.
     * @param {string} tag - A tag for the message.
     * @param {...any} messages - The messages to log.
     */
    error(tag, ...messages) {
        this._log(LOG_LEVELS.ERROR, tag, ...messages);
    },

    /**
     * Logs a warning message.
     * @param {string} tag - A tag for the message.
     * @param {...any} messages - The messages to log.
     */
    warn(tag, ...messages) {
        this._log(LOG_LEVELS.WARN, tag, ...messages);
    },

    /**
     * Logs an informational message.
     * @param {string} tag - A tag for the message.
     * @param {...any} messages - The messages to log.
     */
    info(tag, ...messages) {
        this._log(LOG_LEVELS.INFO, tag, ...messages);
    },

    /**
     * Logs a debug message.
     * @param {string} tag - A tag for the message.
     * @param {...any} messages - The messages to log.
     */
    debug(tag, ...messages) {
        this._log(LOG_LEVELS.DEBUG, tag, ...messages);
    },

    /**
     * Logs a verbose message (most detailed).
     * @param {string} tag - A tag for the message.
     * @param {...any} messages - The messages to log.
     */
    verbose(tag, ...messages) {
        this._log(LOG_LEVELS.VERBOSE, tag, ...messages);
    },

    /**
     * Retrieves the log history.
     * @returns {Array<object>} An array of log entry objects.
     */
    getLogHistory() {
        return [...logHistory]; // Return a copy
    },

    /**
     * Clears the log history.
     */
    clearLogHistory() {
        logHistory = [];
        this.info("LoggingSystem", "Log history cleared.");
    }
};

// Example: Set default log level for development
// In a production environment, you might want to set this to LOG_LEVELS.ERROR or LOG_LEVELS.NONE
loggingSystem.setLogLevel(LOG_LEVELS.DEBUG); 
// loggingSystem.setShowTimestamp(false); // Uncomment to hide timestamps

export { loggingSystem };
