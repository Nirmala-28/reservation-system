// coupons.js
const Coupon = require('../models/Coupon');

// @desc    Apply coupon
// @route   POST /api/coupons/apply
// @access  Private
exports.applyCoupon = async (req, res) => {
  try {
    const { code, totalAmount } = req.body;

    // Find the coupon
    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(),
      active: true,
    });

    if (!coupon) {
      return res.status(404).json({ message: 'Invalid coupon code' });
    }

    // Check if coupon is still valid
    if (coupon.validTo < new Date()) {
      return res.status(400).json({ message: 'Coupon has expired' });
    }

    // Check if coupon has usage left
    if (coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ message: 'Coupon usage limit exceeded' });
    }

    // Check minimum order value
    if (totalAmount < coupon.minOrderValue) {
      return res.status(400).json({ 
        message: `Minimum order value for this coupon is Rs.${coupon.minOrderValue}` 
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (totalAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    const finalAmount = totalAmount - discountAmount;

    res.status(200).json({
      success: true,
      data: {
        couponCode: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        originalAmount: totalAmount,
        finalAmount,
        description: coupon.description,
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Validate coupon
// @route   POST /api/coupons/validate
// @access  Private
exports.validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;

    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(),
      active: true,
    });

    if (!coupon) {
      return res.status(404).json({ 
        success: false,
        message: 'Invalid coupon code' 
      });
    }

    // Check if coupon is still valid
    if (coupon.validTo < new Date()) {
      return res.status(400).json({ 
        success: false,
        message: 'Coupon has expired' 
      });
    }

    // Check if coupon has usage left
    if (coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ 
        success: false,
        message: 'Coupon usage limit exceeded' 
      });
    }

    res.status(200).json({
      success: true,
      data: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderValue: coupon.minOrderValue,
        maxDiscount: coupon.maxDiscount,
        validTo: coupon.validTo,
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};