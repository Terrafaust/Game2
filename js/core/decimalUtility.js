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

    lt(a, b) { return this.compare(a, b) < 0; },
    lte(a, b) { return this.compare(a, b) <= 0; },
    gt(a, b) { return this.compare(a, b) > 0; },
    gte(a, b) { return this.compare(a, b) >= 0; },
    eq(a, b) { return this.compare(a, b) === 0; },
    neq(a, b) { return this.compare(a, b) !== 0; },
    
    abs(value) {
        const decValue = this.isDecimal(value) ? value : this.new(value);
        return decValue.abs();
    },

    floor(value) {
        const decValue = this.isDecimal(value) ? value : this.new(value);
        return decValue.floor();
    },

    ceil(value) {
        const decValue = this.isDecimal(value) ? value : this.new(value);
        return decValue.ceil();
    },

    round(value) {
        const decValue = this.isDecimal(value) ? value : this.new(value);
        return decValue.round();
    },

    ln(value) {
        const decValue = this.isDecimal(value) ? value : this.new(value);
        return decValue.ln();
    },

    log10(value) {
        const decValue = this.isDecimal(value) ? value : this.new(value);
        return decValue.log10();
    },

    log2(value) {
        const decValue = this.isDecimal(value) ? value : this.new(value);
        return decValue.log2();
    },

    /**
     * NEW: Returns the larger of two Decimal values.
     * @param {Decimal|number|string} a
     * @param {Decimal|number|string} b
     * @returns {Decimal}
     */
    max(a, b) {
        const decA = this.isDecimal(a) ? a : this.new(a);
        const decB = this.isDecimal(b) ? b : this.new(b);
        return Decimal.max(decA, decB);
    },

    /**
     * NEW: Returns the smaller of two Decimal values.
     * @param {Decimal|number|string} a
     * @param {Decimal|number|string} b
     * @returns {Decimal}
     */
    min(a, b) {
        const decA = this.isDecimal(a) ? a : this.new(a);
        const decB = this.isDecimal(b) ? b : this.new(b);
        return Decimal.min(decA, decB);
    },

    format(value, places = 2, mantissaPlaces = 2) {
        // ... (Formatting logic is unchanged)
        const decValue = this.isDecimal(value) ? value : this.new(value);
        if (decValue.isNan || decValue.isInfinite) { return decValue.toString(); }
        if (decValue.abs().lt(1e-6) && decValue.neq(0)) { return decValue.toExponential(mantissaPlaces); }
        if (decValue.abs().gte(1e9)) { return decValue.toExponential(mantissaPlaces); }
        if (decValue.abs().lt(0.01) && decValue.neq(0)) { return decValue.toFixed(places + 2); }
        if (decValue.lt(1000) && decValue.gt(-1000)) {
            if (decValue.neq(decValue.floor())) { return decValue.toFixed(places); }
            else { return decValue.toFixed(0); }
        }
        return decValue.toPrecision(mantissaPlaces + (decValue.exponent || 0).toString().length);
    },

    ZERO: new Decimal(0),
    ONE: new Decimal(1),
    TEN: new Decimal(10),
};

export { decimalUtility };
