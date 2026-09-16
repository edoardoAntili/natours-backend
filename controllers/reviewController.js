const Review = require('../models/reviewModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.setTourUserIds = (req, res, next) => {
  req.body.tour = req.params.tourId;
  req.body.user = req.user.id;
  next();
};

exports.hasUserReviewedTour = catchAsync(async (req, res, next) => {
  const alreadyReviewed = await Review.exists({
    tour: req.params.tourId,
    user: req.user._id,
  });

  if (!alreadyReviewed) return next();

  throw new AppError('This tour was already reviewed by you!', 403);
});

exports.getAllReviews = factory.getAll(Review);
exports.createReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.getReview = factory.getOne(Review);
