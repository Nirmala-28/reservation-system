// Currency Configuration for Nepal Train Reservation System
export const CURRENCY_CONFIG = {
  symbol: 'NPR ',         // Nepalese Rupee (NPR) - explicit for Nepal
  code: 'NPR',           // ISO currency code
  name: 'Nepalese Rupee', // Currency name
  taxName: 'VAT',        // Value Added Tax (Nepal)
  taxRate: 13,           // VAT rate in Nepal (13%)
  locale: 'ne-NP',       // Nepalese locale
  dateFormat: 'en-US',  // Date format preference
};

// Utility function to format currency consistently across the app
export const formatCurrency = (amount) => {
  const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return CURRENCY_CONFIG.symbol + numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Utility function to parse currency strings for calculations
export const parseCurrency = (priceString) => {
  if (typeof priceString === 'number') return priceString;
  return parseFloat(priceString.toString().replace(/[रूNPRRs.,\s]/g, '')) || 0;
};

// Tax calculation helper
export const calculateTax = (amount) => {
  return (amount * CURRENCY_CONFIG.taxRate) / 100;
};