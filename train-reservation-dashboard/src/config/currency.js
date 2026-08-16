// Currency Configuration for Nepal Train Reservation System - Admin Dashboard
export const CURRENCY_CONFIG = {
  symbol: 'Rs.',          // Nepalese Rupee symbol (more compatible than रू)
  code: 'NPR',           // ISO currency code
  name: 'Nepalese Rupee', // Currency name
  taxName: 'VAT',        // Value Added Tax (Nepal)
  taxRate: 13,           // VAT rate in Nepal (13%)
  locale: 'ne-NP',       // Nepalese locale
};

// Utility function to format currency consistently across the admin dashboard
export const formatCurrency = (amount) => {
  if (!amount) return CURRENCY_CONFIG.symbol + '0';
  const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return CURRENCY_CONFIG.symbol + numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};