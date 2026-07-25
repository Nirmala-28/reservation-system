// meals.js
const Meal = require('../models/Meal');

// @desc    Get meals by train number
// @route   GET /api/meals/train/:trainNumber
// @access  Public
exports.getMealsByTrain = async (req, res) => {
  try {
    const { trainNumber } = req.params;
    
    const meals = await Meal.find({ 
      trainNumber, 
      available: true 
    }).sort('category name');

    // Group meals by category
    const mealsByCategory = meals.reduce((acc, meal) => {
      if (!acc[meal.category]) {
        acc[meal.category] = [];
      }
      acc[meal.category].push(meal);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      count: meals.length,
      data: mealsByCategory,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};