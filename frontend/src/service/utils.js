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
    const name = String(partyName || '').toUpperCase().trim();
    if (name === 'DEPOT - MUMBAI') {
        return 'DM-';
    } else if (name.includes('KAYAAR EXPORTS PRIVATE LIMITED')) {
        return 'DI-';
    }
    return '';
};

export const getNextDepotInvoiceSequence = (history, depotName, partyName) => {
    const currentDepot = String(depotName || '').toUpperCase().trim();
    const currentParty = String(partyName || '').toUpperCase().trim();

    const isCurrentMumbai = currentDepot === 'DEPOT - MUMBAI';
    const isCurrentKayaar = currentParty.includes('KAYAAR EXPORTS PRIVATE LIMITED');

    const maxNo = history.reduce((max, item) => {
        const invNo = String(item.invoice_no || '').trim();
        const cleanNo = invNo.replace(/\D/g, '');
        const numVal = parseInt(cleanNo, 10);
        if (isNaN(numVal)) return max;

        const itemDepot = String(item.Depot?.account_name || '').toUpperCase().trim();
        const itemParty = String(item.Party?.account_name || '').toUpperCase().trim();

        const itemIsMumbai = itemDepot === 'DEPOT - MUMBAI';
        const itemIsKayaar = itemParty.includes('KAYAAR EXPORTS PRIVATE LIMITED');

        if (isCurrentMumbai) {
            if (itemIsMumbai) {
                return Math.max(max, numVal);
            }
        } else if (isCurrentKayaar) {
            if (itemIsKayaar) {
                return Math.max(max, numVal);
            }
        } else {
            if (!itemIsMumbai && !itemIsKayaar) {
                return Math.max(max, numVal);
            }
        }
        return max;
    }, 0);

    return maxNo + 1;
};

