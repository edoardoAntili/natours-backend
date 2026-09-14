const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const StartDate = require('../models/startDateModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const [tour] = await Tour.findOne({ slug: req.params.slug });

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.slug}&user=${req.user.id}&price=${tour.price}&bookedDate=${req.body.bookedDate}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
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

  await Booking.create({
    tour,
    user,
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

  const userBookings = await Booking.find({ user: userId });
  const userBookingsTourIDs = userBookings.map((booking) => booking.tour.id);

  if (userBookingsTourIDs.includes(tourId)) return next();
  throw new AppError(`Tours which haven't been booked cannot be reviewed`, 403);
});

exports.createBooking = factory.createOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.getBooking = factory.getOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
