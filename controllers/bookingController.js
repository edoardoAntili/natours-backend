const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const StartDate = require('../models/startDateModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const APIFeatures = require('../utils/apiFeatures');
const AppError = require('../utils/appError');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    success_url: `${req.protocol}://${process.env.FRONTEND_URL}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}&bookedDate=${req.body.bookedDate}`,
    cancel_url: `${req.protocol}://${process.env.FRONTEND_URL}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: tour.price * 100,
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`https://natours.dev/img/tours/${tour.imageCover}`],
          },
        },
        quantity: 1,
      },
    ],
  });

  // 3) Create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  const { tour, user, price, bookedDate } = req.query;

  if (!tour || !user || !price || !bookedDate) return next();

  if (!req.user)
    throw new AppError('You must be logged in to complete a booking', 401);

  if (req.user.role !== 'user')
    throw new AppError(
      'You do not have permission to complete this booking',
      403,
    );

  await Booking.create({
    tour,
    user: req.user.id,
    bookedDate,
    price,
  });

  const date = await StartDate.findOne({ tour, date: new Date(bookedDate) });

  if (date.soldOut)
    throw new AppError(
      'This date is sold out, please choose another date!',
      400,
    );

  date.participants += 1;
  await date.save();

  res.redirect(req.originalUrl.split('?')[0]);
});

exports.hasUserBookedTour = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const tourId = req.params.tourId || req.body.tour;

  const bookings = await Booking.find({ user: userId, tour: tourId });

  if (bookings.length > 0) {
    req.bookings = bookings;
    return next();
  }
  throw new AppError(`Tours which haven't been booked cannot be reviewed`, 403);
});

exports.hasBookedDatePassed = catchAsync(async (req, res, next) => {
  if (
    req.bookings.some(
      ({ bookedDate }) => new Date(bookedDate.date) < new Date(),
    )
  )
    return next();

  throw new AppError(
    `This tour has been booked but no booking has a date which has already passed.`,
    403,
  );
});

exports.createBooking = factory.createOne(Booking);
exports.getMyBookings = catchAsync(async (req, res) => {
  const userFilter = { user: req.user.id };
  const features = new APIFeatures(Booking.find(userFilter), {
    page: req.query.page,
    limit: req.query.limit,
  })
    .sort()
    .paginate();

  const [bookings, totalResults] = await Promise.all([
    features.query,
    Booking.countDocuments(userFilter),
  ]);
  const totalPages = Math.ceil(totalResults / features.limit);

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    pagination: {
      page: features.page,
      limit: features.limit,
      totalResults,
      totalPages,
      hasNextPage: features.page < totalPages,
    },
    data: {
      data: bookings.map((booking) => ({
        _id: booking.id,
        tour: booking.tour ? { name: booking.tour.name } : null,
        bookedDate: booking.bookedDate
          ? { date: booking.bookedDate.date }
          : null,
        price: booking.price,
        createdAt: booking.createdAt,
        paid: booking.paid,
      })),
    },
  });
});
exports.getAllBookings = factory.getAll(Booking);
exports.getBooking = factory.getOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
