export const getNextInvoiceSequence = (history, prefix) => {
    const maxNo = history.reduce((max, item) => {
        const invNo = String(item.invoice_no || '').trim();
        if (prefix === 'DM-') {
            if (invNo.startsWith('DM-')) {
                const cleanNo = invNo.substring(3);
                const numVal = parseInt(cleanNo, 10);
                return Math.max(max, isNaN(numVal) ? 0 : numVal);
            }
        } else if (prefix === 'DI-') {
            if (invNo.startsWith('DI-')) {
                const cleanNo = invNo.substring(3);
                const numVal = parseInt(cleanNo, 10);
                return Math.max(max, isNaN(numVal) ? 0 : numVal);
            }
        } else {
            if (!invNo.startsWith('DM-') && !invNo.startsWith('DI-')) {
                const numVal = parseInt(invNo, 10);
                return Math.max(max, isNaN(numVal) ? 0 : numVal);
            }
        }
        return max;
    }, 0);
    return maxNo + 1;
};

export const getPrefixForParty = (partyName) => {
    const name = String(partyName || '').toUpperCase();
    if (name.includes('BHIWANDI')) {
        return 'DM-';
    } else if (name.includes('ICHAL')) {
        return 'DI-';
    }
    return '';
};
