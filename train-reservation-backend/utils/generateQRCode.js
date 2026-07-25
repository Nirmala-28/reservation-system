const QRCode = require('qrcode');

const generateQRCode = async (data) => {
  try {
    const qrString = JSON.stringify(data);
    const qrCode = await QRCode.toDataURL(qrString);
    return qrCode;
  } catch (error) {
    console.error('QR Code generation error:', error);
    return null;
  }
};

module.exports = generateQRCode;