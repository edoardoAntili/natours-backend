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
  const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');

  if (!frontendUrl) {
    throw new AppError('Frontend URL is not configured', 500);
  }

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    success_url: `${frontendUrl}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}&bookedDate=${req.body.bookedDate}`,
    cancel_url: `${frontendUrl}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    metadata: {
      bookedDate: req.body.bookedDate,
    },
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

const createBookingCheckout = async (session) => {
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const bookedDate = session.metadata.bookedDate;
  const price =
    session.amount_total / 100 ||
    session.line_items[0].price_data.unit_amount / 100;
  await Booking.create({ tour, user, bookedDate, price });
};

exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed')
    createBookingCheckout(event.data.object);

  res.status(200).json({ received: true });
};

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

exports.createBooking = factory.createOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.getBooking = factory.getOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
