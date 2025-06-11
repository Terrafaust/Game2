// js/core/decimalUtility.js (v2 - Calculation Utilities)
// Adds generic calculation functions to avoid code duplication.

if (typeof Decimal === 'undefined') {
    throw new Error("Decimal library (break_infinity.js or similar) is not loaded.");
}

const decimalUtility = {
    // --- Existing Functions ---
    new(value) {
        try { return new Decimal(value); } catch (error) { console.error(`Error creating Decimal from value: ${value}`, error); return new Decimal(0); }
    },
    isDecimal(value) { return value instanceof Decimal; },
    add(a, b) { return this.new(a).add(this.new(b)); },
    subtract(a, b) { return this.new(a).sub(this.new(b)); },
    multiply(a, b) { return this.new(a).mul(this.new(b)); },
    divide(a, b) { const decB = this.new(b); if (decB.eq(0)) return this.new(0); return this.new(a).div(decB); },
    power(base, exponent) { const numExponent = this.isDecimal(exponent) ? exponent.toNumber() : parseFloat(exponent); if (isNaN(numExponent)) { console.error(`decimalUtility.power: Invalid exponent: ${exponent}.`); return this.new(base); } return this.new(base).pow(numExponent); },
    compare(a, b) { return this.new(a).cmp(this.new(b)); },
    lt(a, b) { return this.compare(a, b) < 0; },
    lte(a, b) { return this.compare(a, b) <= 0; },
    gt(a, b) { return this.compare(a, b) > 0; },
    gte(a, b) { return this.compare(a, b) >= 0; },
    eq(a, b) { return this.compare(a, b) === 0; },
    neq(a, b) { return this.compare(a, b) !== 0; },
    abs(value) { return this.new(value).abs(); },
    floor(value) { return this.new(value).floor(); },
    ceil(value) { return this.new(value).ceil(); },
    round(value) { return this.new(value).round(); },
    ln(value) { return this.new(value).ln(); },
    log10(value) { return this.new(value).log10(); },
    log2(value) { return this.new(value).log2(); },
    max(a, b) { return Decimal.max(this.new(a), this.new(b)); },
    min(a, b) { return Decimal.min(this.new(a), this.new(b)); },
    format(value, places = 2, mantissaPlaces = 2) { const decValue = this.new(value); if (decValue.isNan || decValue.isInfinite) { return decValue.toString(); } if (decValue.abs().lt(1e-6) && decValue.neq(0)) { return decValue.toExponential(mantissaPlaces); } if (decValue.abs().gte(1e9)) { return decValue.toExponential(mantissaPlaces); } if (decValue.abs().lt(0.01) && decValue.neq(0)) { return decValue.toFixed(places + 2); } if (decValue.lt(1000) && decValue.gt(-1000)) { if (decValue.neq(decValue.floor())) { return decValue.toFixed(places); } else { return decValue.toFixed(0); } } return decValue.toPrecision(mantissaPlaces + (decValue.exponent || 0).toString().length); },
    ZERO: new Decimal(0),
    ONE: new Decimal(1),
    TEN: new Decimal(10),

    // --- NEW FUNCTIONS START ---

    /**
     * Calculates the total cost for N items in a geometric series.
     * C_total = C_base * ( (R^N - 1) / (R - 1) ) * R^owned
     * @param {Decimal} baseCost - The cost of the first item.
     * @param {Decimal} growthFactor - The cost multiplier per item (e.g., 1.05).
     * @param {Decimal} ownedCount - How many items are already owned.
     * @param {Decimal} quantity - How many items to purchase.
     * @returns {Decimal} The total cost for the batch.
     */
    getGeometricSeriesCost(baseCost, growthFactor, ownedCount, quantity) {
        if (this.eq(growthFactor, 1)) {
            return this.multiply(baseCost, quantity);
        }
        
        const R_pow_n = this.power(growthFactor, quantity);
        const numerator = this.subtract(R_pow_n, 1);
        const denominator = this.subtract(growthFactor, 1);
        const costFor_n_Items = this.multiply(baseCost, this.divide(numerator, denominator));
        
        const priceIncreaseFromOwned = this.power(growthFactor, ownedCount);
        return this.multiply(costFor_n_Items, priceIncreaseFromOwned);
    },

    /**
     * Calculates the maximum buyable quantity of an item with a geometric cost.
     * N = floor( log_R( (Available * (R-1)) / (C_base * R^owned) + 1 ) )
     * @param {Decimal} availableCurrency - The amount of currency the player has.
     * @param {Decimal} baseCost - The cost of the first item.
     * @param {Decimal} growthFactor - The cost multiplier per item (e.g., 1.05).
     * @param {Decimal} ownedCount - How many items are already owned.
     * @returns {Decimal} The maximum number of items that can be purchased.
     */
    getMaxBuyableGeometric(availableCurrency, baseCost, growthFactor, ownedCount) {
        if (this.lte(availableCurrency, 0) || this.lte(baseCost, 0)) return this.ZERO;

        const costOfNext = this.multiply(baseCost, this.power(growthFactor, ownedCount));
        if (this.gt(costOfNext, availableCurrency)) return this.ZERO;
        
        if (this.eq(growthFactor, 1)) {
            return this.floor(this.divide(availableCurrency, baseCost));
        }

        const R = growthFactor;
        const R_minus_1 = this.subtract(R, 1);

        const term = this.divide(this.multiply(availableCurrency, R_minus_1), costOfNext);
        const LHS = this.add(term, 1);
        if (this.lte(LHS, 1)) return this.ZERO;

        const log_LHS = this.ln(LHS);
        const log_R = this.ln(R);
        if (this.lte(log_R, 0)) return this.ZERO;
        
        const max_n = this.floor(this.divide(log_LHS, log_R));
        return this.max(max_n, 0);
    }
    // --- NEW FUNCTIONS END ---
};

export { decimalUtility };
