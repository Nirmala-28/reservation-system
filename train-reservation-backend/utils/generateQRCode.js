const QRCode = require('qrcode');

const generateQRCode = async (data) => {
  try {
    // Create a more structured QR code data with URL format
    const qrData = {
      type: 'TRAIN_TICKET',
      pnr: data.pnr,
      trainNumber: data.trainNumber,
      trainName: data.trainName,
      date: data.date,
      passenger: data.passenger,
      class: data.class,
      timestamp: new Date().toISOString(),
      // Add URL for web scanning
      url: `https://nepalrailway.com/ticket/${data.pnr}` // Placeholder URL
    };
    
    const qrString = JSON.stringify(qrData);
    const qrCode = await QRCode.toDataURL(qrString, {
      width: 300,
      margin: 2,
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