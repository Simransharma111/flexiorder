export const money = value => value === null || value === undefined ? 'Not recorded' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value / 100);
