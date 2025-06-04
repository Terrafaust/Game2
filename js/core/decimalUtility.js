// js/core/decimalUtility.js

/**
 * @file decimalUtility.js
 * @description Provides a wrapper for Decimal.js (or a similar big number library like break_infinity.js)
 * to ensure consistent usage and to simplify common operations throughout the game.
 * All game logic involving numbers that can grow large (currencies, costs, production rates, etc.)
 * MUST use this utility.
 */

// Ensure Decimal is available (from break_infinity.js or similar)
if (typeof Decimal === 'undefined') {
    throw new Error("Decimal library (break_infinity.js or similar) is not loaded. Ensure it's included before decimalUtility.js.");
}

const decimalUtility = {
    /**
     * Creates a new Decimal instance from a value.
     * @param {number|string|Decimal} value - The value to convert to a Decimal.
     * @returns {Decimal} A new Decimal object.
     */
    new(value) {
        try {
            return new Decimal(value);
        } catch (error) {
            console.error(`Error creating Decimal from value: ${value}`, error);
            return new Decimal(0); // Return a safe default
        }
    },

    /**
     * Checks if a value is a Decimal instance.
     * @param {*} value - The value to check.
     * @returns {boolean} True if the value is a Decimal instance, false otherwise.
     */
    isDecimal(value) {
        return value instanceof Decimal;
    },

    /**
     * Adds two Decimal values.
     * @param {Decimal|number|string} a - The first value.
     * @param {Decimal|number|string} b - The second value.
     * @returns {Decimal} The sum of a and b.
     */
    add(a, b) {
        const decA = this.isDecimal(a) ? a : this.new(a);
        const decB = this.isDecimal(b) ? b : this.new(b);
        return decA.add(decB);
    },

    /**
     * Subtracts the second Decimal value from the first.
     * @param {Decimal|number|string} a - The value to subtract from.
     * @param {Decimal|number|string} b - The value to subtract.
     * @returns {Decimal} The difference of a and b.
     */
    subtract(a, b) {
        const decA = this.isDecimal(a) ? a : this.new(a);
        const decB = this.isDecimal(b) ? b : this.new(b);
        return decA.sub(decB);
    },

    /**
     * Multiplies two Decimal values.
     * @param {Decimal|number|string} a - The first value.
     * @param {Decimal|number|string} b - The second value.
     * @returns {Decimal} The product of a and b.
     */
    multiply(a, b) {
        const decA = this.isDecimal(a) ? a : this.new(a);
        const decB = this.isDecimal(b) ? b : this.new(b);
        return decA.mul(decB);
    },

    /**
     * Divides the first Decimal value by the second.
     * @param {Decimal|number|string} a - The dividend.
     * @param {Decimal|number|string} b - The divisor.
     * @returns {Decimal} The quotient of a and b. Returns Decimal(0) if divisor is 0.
     */
    divide(a, b) {
        const decA = this.isDecimal(a) ? a : this.new(a);
        const decB = this.isDecimal(b) ? b : this.new(b);
        if (decB.eq(0)) {
            // console.warn("decimalUtility.divide: Division by zero attempted. Returning 0.");
            // In many incremental games, dividing by zero (e.g. 0 production speed) should yield 0 effect.
            // For critical errors, throwing an error might be better, but for production, 0 is often fine.
            return this.new(0);
        }
        return decA.div(decB);
    },

    /**
     * Raises the first Decimal value to the power of the second.
     * @param {Decimal|number|string} base - The base value.
     * @param {Decimal|number|string|number} exponent - The exponent value.
     * @returns {Decimal} The result of base raised to the power of exponent.
     */
    power(base, exponent) {
        const decBase = this.isDecimal(base) ? base : this.new(base);
        // The exponent in break_infinity.js's pow method is typically a number, not a Decimal.
        const numExponent = this.isDecimal(exponent) ? exponent.toNumber() : parseFloat(exponent);
        if (isNaN(numExponent)) {
            console.error(`decimalUtility.power: Invalid exponent: ${exponent}. Using 1.`);
            return decBase.pow(1);
        }
        return decBase.pow(numExponent);
    },

    /**
     * Compares two Decimal values.
     * @param {Decimal|number|string} a - The first value.
     * @param {Decimal|number|string} b - The second value.
     * @returns {number} -1 if a < b, 0 if a == b, 1 if a > b.
     */
    compare(a, b) {
        const decA = this.isDecimal(a) ? a : this.new(a);
        const decB = this.isDecimal(b) ? b : this.new(b);
        return decA.cmp(decB);
    },

    /**
     * Checks if a < b.
     * @param {Decimal|number|string} a
     * @param {Decimal|number|string} b
     * @returns {boolean}
     */
    lt(a, b) {
        return this.compare(a, b) < 0;
    },

    /**
     * Checks if a <= b.
     * @param {Decimal|number|string} a
     * @param {Decimal|number|string} b
     * @returns {boolean}
     */
    lte(a, b) {
        return this.compare(a, b) <= 0;
    },

    /**
     * Checks if a > b.
     * @param {Decimal|number|string} a
     * @param {Decimal|number|string} b
     * @returns {boolean}
     */
    gt(a, b) {
        return this.compare(a, b) > 0;
    },

    /**
     * Checks if a >= b.
     * @param {Decimal|number|string} a
     * @param {Decimal|number|string} b
     * @returns {boolean}
     */
    gte(a, b) {
        return this.compare(a, b) >= 0;
    },

    /**
     * Checks if a == b.
     * @param {Decimal|number|string} a
     * @param {Decimal|number|string} b
     * @returns {boolean}
     */
    eq(a, b) {
        return this.compare(a, b) === 0;
    },

    /**
     * Checks if a != b.
     * @param {Decimal|number|string} a
     * @param {Decimal|number|string} b
     * @returns {boolean}
     */
    neq(a, b) {
        return this.compare(a, b) !== 0;
    },
    
    /**
     * Returns the absolute value of a Decimal.
     * @param {Decimal|number|string} value
     * @returns {Decimal}
     */
    abs(value) {
        const decValue = this.isDecimal(value) ? value : this.new(value);
        return decValue.abs();
    },

    /**
     * Returns the floor of a Decimal.
     * @param {Decimal|number|string} value
     * @returns {Decimal}
     */
    floor(value) {
        const decValue = this.isDecimal(value) ? value : this.new(value);
        return decValue.floor();
    },

    /**
     * Returns the ceiling of a Decimal.
     * @param {Decimal|number|string} value
     * @returns {Decimal}
     */
    ceil(value) {
        const decValue = this.isDecimal(value) ? value : this.new(value);
        return decValue.ceil();
    },

    /**
     * Returns the rounded value of a Decimal.
     * @param {Decimal|number|string} value
     * @returns {Decimal}
     */
    round(value) {
        const decValue = this.isDecimal(value) ? value : this.new(value);
        return decValue.round();
    },

    /**
     * Returns the natural logarithm (base E) of a Decimal.
     * @param {Decimal|number|string} value
     * @returns {Decimal}
     */
    ln(value) {
        const decValue = this.isDecimal(value) ? value : this.new(value);
        return decValue.ln();
    },

    /**
     * Returns the base-10 logarithm of a Decimal.
     * @param {Decimal|number|string} value
     * @returns {Decimal}
     */
    log10(value) {
        const decValue = this.isDecimal(value) ? value : this.new(value);
        return decValue.log10(); // or .log(10) if log10 is not direct
    },

    /**
     * Returns the base-2 logarithm of a Decimal.
     * @param {Decimal|number|string} value
     * @returns {Decimal}
     */
    log2(value) {
        const decValue = this.isDecimal(value) ? value : this.new(value);
        return decValue.log2(); // or .log(2)
    },

    /**
     * Formats a Decimal value to a string.
     * This is a basic version. A more advanced version would handle different notations (scientific, engineering, etc.)
     * and precision. break_infinity.js has its own `format` method or similar.
     * @param {Decimal|number|string} value - The Decimal value to format.
     * @param {number} [places=2] - Number of decimal places for numbers < 1000.
     * @param {number} [mantissaPlaces=2] - Number of decimal places for mantissa in scientific notation.
     * @returns {string} The formatted string representation of the Decimal.
     */
    format(value, places = 2, mantissaPlaces = 2) {
        const decValue = this.isDecimal(value) ? value : this.new(value);

        if (decValue.isNan || !decValue.isFinite()) {
            return decValue.toString(); // "NaN", "Infinity"
        }
        
        // For very large or very small numbers, break_infinity usually has a good formatter.
        // Example: using exponent threshold for scientific notation
        if (decValue.abs().lt(1e-6) && decValue.neq(0)) { // Very small non-zero
             return decValue.toExponential(mantissaPlaces);
        }
        if (decValue.abs().gte(1e9)) { // Large numbers
            // Standard scientific notation: 1.23e+9
            // break_infinity might have specific formatting options e.g. game.format(value, precision, smallPrecision)
            // For now, a simple approach:
            return decValue.toExponential(mantissaPlaces);
        }
        if (decValue.abs().lt(0.01) && decValue.neq(0)) {
             return decValue.toFixed(places + 2); // more precision for small numbers
        }

        // For numbers that are "reasonably" sized, use toFixed or a similar method.
        // The definition of "reasonably sized" can vary.
        // break_infinity.js often has a `format` method that handles this logic internally.
        // If we rely on its toString or toFixed, we need to be mindful of its default behavior.
        // This is a simplified formatting logic.
        if (decValue.lt(1000) && decValue.gt(-1000)) {
            // Check if it has decimal part
            if (decValue.neq(decValue.floor())) {
                 return decValue.toFixed(places);
            } else {
                 return decValue.toFixed(0); // No decimal places for whole numbers
            }
        }
        // Default to scientific for other cases not caught, or rely on Decimal's toString.
        // A more sophisticated formatting function (like OmegaNum.format or similar)
        // would handle various notations (scientific, engineering, standard abbreviations like K, M, B, T, etc.)
        // For now, we use a simplified version.
        // return decValue.toString(); // Fallback, might not be pretty.
        return decValue.toPrecision(mantissaPlaces + (decValue.exponent || 0).toString().length);


        // A more common approach in incremental games for numbers >= 1000:
        // if (decValue.gte(1000)) {
        //    return decValue.toExponential(mantissaPlaces); // or custom like 1.23K, 1.23M
        // }
        // return decValue.toFixed(places);
    },

    // Constants (can be useful)
    ZERO: new Decimal(0),
    ONE: new Decimal(1),
    TEN: new Decimal(10),
    // Add more constants as needed (e.g., for specific game mechanics)
};

// Make it available globally or export it if using modules in other files
// In main.js, we will import it.
export { decimalUtility };
