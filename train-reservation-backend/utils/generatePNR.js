const generatePNR = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PNR${timestamp.slice(-6)}${random}`;
};

module.exports = generatePNR;