const Review = require('../models/reviewModel');
const User = require('../models/userModel');
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
exports.getAdminReviews = catchAsync(async (req, res) => {
  const query =
    typeof req.query.query === 'string' ? req.query.query.trim() : '';
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const requestedPage = Number(req.query.page);
  const requestedLimit = Number(req.query.limit);
  const limit =
    Number.isSafeInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 100)
      : 10;

  let reviewFilter = {};
  if (escapedQuery) {
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: escapedQuery, $options: 'i' } },
        { email: { $regex: escapedQuery, $options: 'i' } },
      ],
    }).select('_id');
    reviewFilter = { user: { $in: matchingUsers.map((user) => user._id) } };
  }

  const totalResults = await Review.countDocuments(reviewFilter);
  const totalPages = Math.ceil(totalResults / limit);
  const page = Math.min(
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1,
    Math.max(totalPages, 1),
  );
  const reviews = await Review.find(reviewFilter)
    .populate({ path: 'user', select: 'name email' })
    .populate({ path: 'tour', select: 'name slug' })
    .sort('-createdAt _id')
    .skip((page - 1) * limit)
    .limit(limit);

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    pagination: {
      page,
      limit,
      totalResults,
      totalPages,
      hasNextPage: page < totalPages,
    },
    data: {
      data: reviews.map((review) => ({
        _id: review.id,
        review: review.review,
        user: review.user
          ? { name: review.user.name, email: review.user.email }
          : null,
        tour: review.tour
          ? { name: review.tour.name, slug: review.tour.slug }
          : null,
      })),
    },
  });
});
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
exports.deleteReview = catchAsync(async (req, res, next) => {
  const filter = { _id: req.params.id };
  if (req.user.role !== 'admin') filter.user = req.user.id;

  const review = await Review.findOneAndDelete(filter);
  if (!review) {
    const reviewExists = await Review.countDocuments({ _id: req.params.id });
    if (reviewExists)
      return next(new AppError("You cannot delete another user's review", 403));
    return next(new AppError('No document found with that ID', 404));
  }

  res.status(204).json({ status: 'success', data: null });
});
exports.updateReview = factory.updateOne(Review);
exports.getReview = factory.getOne(Review);
