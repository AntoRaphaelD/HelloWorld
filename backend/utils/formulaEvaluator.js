/**
 * Evaluates dynamic formulas stored in InvoiceType
 * @param {string} formula - The string formula e.g. "([Rate]*[Kgs])"
 * @param {object} context - Values to inject e.g. { Rate: 250, Kgs: 500 }
 */
const evaluateFormula = (formula, context) => {
    if (!formula) return 0;

    try {
        let processed = formula;
        
        // 1. Replace Variables with values from context
        // Matches [Variable Name] and replaces with context['Variable Name']
        Object.keys(context).forEach(key => {
            const regex = new RegExp(`\\[${key}\\]`, 'g');
            processed = processed.replace(regex, context[key] || 0);
        });

        // 2. Support Excel-like Round() function
        processed = processed.replace(/Round\(/gi, 'Math.round(');

        // 3. Evaluate the math string
        // Note: In production, consider using 'mathjs' library instead of eval for safety
        return eval(processed) || 0;
    } catch (err) {
        console.error("Formula Eval Error:", err);
        return 0;
    }
};

/**
 * Main Calculation function for the Invoice Screen
 */
export const calculateInvoiceValues = (invoiceType, itemData) => {
    // Standard variables available for formulas
    const context = {
        "Rate / Kg": itemData.rate || 0,
        "Total Kgs": itemData.total_kgs || 0,
        "H": (itemData.rate || 0) * (itemData.total_kgs || 0), // Gross Amount
        "CharityRs": itemData.charity_rate || 0,
        "igstper": parseFloat(invoiceType.igst_val) || 0,
        // Add other variables like [A], [I] as needed
    };

    const results = {};

    // Calculate individual components based on stored formulas
    if (invoiceType.charity_checked) {
        results.charity = evaluateFormula(invoiceType.charity_formula, context);
        context["Charity"] = results.charity; // Make available for subsequent formulas
    }

    if (invoiceType.igst_checked) {
        results.igst = evaluateFormula(invoiceType.igst_formula, context);
        context["igstamt"] = results.igst;
    }

    // Final calculations
    results.assessable_value = evaluateFormula(invoiceType.assess_formula, context);
    context["I"] = results.assessable_value; // Often used in SubTotal

    results.sub_total = evaluateFormula(invoiceType.sub_total_formula, context);
    results.final_value = evaluateFormula(invoiceType.total_value_formula, context);

    return results;
};