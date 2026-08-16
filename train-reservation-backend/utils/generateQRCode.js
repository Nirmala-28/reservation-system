const QRCode = require('qrcode');

const generateQRCode = async (data) => {
  try {
    // Create a simpler, more scannable QR code with minimal data
    // Use a URL format that can be easily scanned and parsed
    const qrString = `TR${data.pnr}|${data.trainNumber}|${data.date}|${data.class}`;
    
    const qrCode = await QRCode.toDataURL(qrString, {
      width: 400,
      margin: 3,
      errorCorrectionLevel: 'H', // High error correction for better scanning
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    
    console.log('[QR Code] Generated for PNR:', data.pnr);
    return qrCode;
  } catch (error) {
    console.error('QR Code generation error:', error);
    return null;
  }
};

module.exports = generateQRCode;