// js/core/staticDataAggregator.js

/**
 * @file staticDataAggregator.js
 * @description Centralizes static definitions (base costs, production rates, UI text keys, etc.)
 * from different game modules. This allows for a single point of access for such data
 * and helps in managing game balance and definitions.
 */

import { loggingSystem } from './loggingSystem.js';
// decimalUtility might be needed if static data includes default Decimal values,
// though typically static data might be numbers/strings that are then converted to Decimals by the consuming system.
// import { decimalUtility } from './decimalUtility.js';

const aggregatedData = {
    // Structure to hold data categorized by type or module
    // Example:
    // resources: {
    //     studyPoints: { name: "Study Points", initialValue: 0, ... },
    //     knowledge: { name: "Knowledge", ... }
    // },
    // producers: {
    //     student: { baseCost: 10, baseProduction: 0.5, resource: 'studyPoints', ... }
    // },
    // uiText: {
    //     button_study: "Study Diligently",
    //     resource_studyPoints_name: "Study Points"
    // }
};

const staticDataAggregator = {
    /**
     * Registers static data from a module or system.
     * The data should be an object, and it will be merged into the aggregatedData.
     * It's recommended to namespace data by module ID or data type to avoid conflicts.
     *
     * @param {string} sourceId - A unique identifier for the source of the data (e.g., 'studies_module', 'core_resources').
     * @param {object} dataObject - The static data object to register.
     */
    registerStaticData(sourceId, dataObject) {
        if (typeof sourceId !== 'string' || sourceId.trim() === '') {
            loggingSystem.warn("StaticDataAggregator", "registerStaticData: sourceId must be a non-empty string.");
            return;
        }
        if (typeof dataObject !== 'object' || dataObject === null) {
            loggingSystem.warn("StaticDataAggregator", `registerStaticData: dataObject for '${sourceId}' must be a non-null object.`);
            return;
        }

        if (aggregatedData[sourceId]) {
            // Deep merge if the sourceId already exists, to allow modules to register data in parts
            // A simple merge for now; more complex merging might be needed if deep objects conflict.
            // For true deep merge: Object.assign(aggregatedData[sourceId], dataObject); // but this is shallow for nested.
            // A proper deep merge utility would be better if complex nested structures are common.
            // For now, let's assume modules provide distinct keys or overwrite is intended for simple cases.
            // A safer approach for deep merge:
            // aggregatedData[sourceId] = { ...aggregatedData[sourceId], ...dataObject }; // Shallow merge for top-level keys in dataObject
            // This simple assignment overwrites or adds. If a module calls this multiple times for the same sourceId,
            // it should ensure it's providing the complete data or manage its own internal merging.
            // A common pattern is for a module to register all its static data in one go.
            Object.keys(dataObject).forEach(key => {
                if (aggregatedData[sourceId][key] && typeof aggregatedData[sourceId][key] === 'object' && typeof dataObject[key] === 'object') {
                    // Basic deep merge for one level of nesting if both are objects
                    aggregatedData[sourceId][key] = { ...aggregatedData[sourceId][key], ...dataObject[key] };
                } else {
                    aggregatedData[sourceId][key] = dataObject[key];
                }
            });
            loggingSystem.debug("StaticDataAggregator", `Static data updated for source '${sourceId}'.`);
        } else {
            aggregatedData[sourceId] = { ...dataObject }; // Store a copy
            loggingSystem.debug("StaticDataAggregator", `Static data registered for source '${sourceId}'.`);
        }
    },

    /**
     * Retrieves static data for a specific source.
     * @param {string} sourceId - The identifier of the data source.
     * @returns {object | undefined} The static data object for the source, or undefined if not found. Returns a copy.
     */
    getDataBySource(sourceId) {
        if (aggregatedData[sourceId]) {
            return { ...aggregatedData[sourceId] }; // Return a shallow copy
        }
        loggingSystem.warn("StaticDataAggregator", `No static data found for source '${sourceId}'.`);
        return undefined;
    },

    /**
     * Retrieves a specific piece of data using a path-like string (e.g., 'producers.student.baseCost').
     * Note: This is a simple implementation. For deep paths, a more robust utility might be needed.
     * @param {string} dataPath - The path to the desired data item (e.g., 'sourceId.key.subkey').
     * @param {any} [defaultValue=undefined] - Value to return if data is not found.
     * @returns {any} The requested data item, or defaultValue if not found.
     */
    getData(dataPath, defaultValue = undefined) {
        if (typeof dataPath !== 'string') return defaultValue;

        const pathParts = dataPath.split('.');
        let current = aggregatedData;

        for (const part of pathParts) {
            if (typeof current !== 'object' || current === null || !Object.prototype.hasOwnProperty.call(current,part)) {
                loggingSystem.debug("StaticDataAggregator", `Data not found at path '${dataPath}'. Part '${part}' missing.`);
                return defaultValue;
            }
            current = current[part];
        }
        // If the result is an object, return a shallow copy to prevent direct modification of static data.
        // If it's a primitive, it's returned by value anyway.
        return (typeof current === 'object' && current !== null) ? { ...current } : current;
    },

    /**
     * Retrieves all aggregated static data.
     * @returns {object} A deep copy of all static data.
     */
    getAllData() {
        // Return a deep copy to prevent modification of the original static data.
        // JSON stringify/parse is a common way for simple objects.
        try {
            return JSON.parse(JSON.stringify(aggregatedData));
        } catch (e) {
            loggingSystem.error("StaticDataAggregator", "Error deep copying all static data", e);
            return {}; // Return empty object on error
        }
    },

    /**
     * Clears all registered static data. Useful for testing or full game resets.
     */
    clearAllData() {
        Object.keys(aggregatedData).forEach(key => delete aggregatedData[key]);
        loggingSystem.info("StaticDataAggregator", "All static data has been cleared.");
    }
};

// Initialize (no specific initialization needed beyond object creation)
loggingSystem.info("StaticDataAggregator", "Static Data Aggregator initialized.");

export { staticDataAggregator };
