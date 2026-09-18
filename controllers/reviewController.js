const Review = require('../models/reviewModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const APIFeatures = require('../utils/apiFeatures');

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
exports.getMyReviews = catchAsync(async (req, res) => {
  const userFilter = { user: req.user.id };
  const features = new APIFeatures(
    Review.find(userFilter).populate({ path: 'tour', select: 'name slug' }),
    { page: req.query.page, limit: req.query.limit },
  )
    .sort()
    .paginate();

  const [reviews, totalResults] = await Promise.all([
    features.query,
    Review.countDocuments(userFilter),
  ]);
  const totalPages = Math.ceil(totalResults / features.limit);

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    pagination: {
      page: features.page,
      limit: features.limit,
      totalResults,
      totalPages,
      hasNextPage: features.page < totalPages,
    },
    data: {
      data: reviews.map((review) => ({
        _id: review.id,
        review: review.review,
        rating: review.rating,
        createdAt: review.createdAt,
        tour: review.tour
          ? { name: review.tour.name, slug: review.tour.slug }
          : null,
      })),
    },
  });
});
exports.createReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.getReview = factory.getOne(Review);
