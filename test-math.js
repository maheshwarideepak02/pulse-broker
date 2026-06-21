const initialData = {
    weight: 100,
    rate: 5000,
    sBrokerage: 5000,
    pBrokerage: 5000
};
let pbType = 'FIXED';
let pbVal = initialData.weight && initialData.pBrokerage ? (initialData.pBrokerage / initialData.weight).toFixed(2) : '0';
let sbType = 'FIXED';
let sbVal = initialData.weight && initialData.sBrokerage ? (initialData.sBrokerage / initialData.weight).toFixed(2) : '0';

if (initialData.weight && initialData.rate) {
    const totalValue = initialData.weight * initialData.rate;
    if (initialData.pBrokerage > 0) {
        const pPercent = (initialData.pBrokerage / totalValue) * 100;
        console.log("pPercent:", pPercent, "rounded:", Math.round(pPercent * 100) / 100);
        if (Math.abs(Math.round(pPercent * 100) / 100 - pPercent) < 0.001) {
            pbType = 'PERCENT';
            pbVal = pPercent.toFixed(2);
        }
    }
    if (initialData.sBrokerage > 0) {
        const sPercent = (initialData.sBrokerage / totalValue) * 100;
        console.log("sPercent:", sPercent, "rounded:", Math.round(sPercent * 100) / 100);
        if (Math.abs(Math.round(sPercent * 100) / 100 - sPercent) < 0.001) {
            sbType = 'PERCENT';
            sbVal = sPercent.toFixed(2);
        }
    }
}
console.log({ pbType, pbVal, sbType, sbVal });
