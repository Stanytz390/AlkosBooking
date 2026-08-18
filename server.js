require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const PROPERTY_WHATSAPP = String(process.env.PROPERTY_WHATSAPP || "255797796163").replace(/\D/g, "");
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "admin@alkosapartments.com").trim().toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "change-me-now");

const DEFAULT_SETTINGS = {
  propertyName: "ALKOS Apartments",
  tagline: "Your private stay in the heart of Geita.",
  location: "Mseto, Geita, Tanzania",
  description: "Premium self-contained apartments designed for short and extended stays. Enjoy privacy, comfort, fast Wi-Fi, a swimming pool, gym, sauna and secure parking in a calm central location.",
  phone: "+255 797 796 163",
  whatsapp: PROPERTY_WHATSAPP,
  instagram: "",
  mapUrl: "https://maps.app.goo.gl/vrpbJNvEGuGo4KGn7",
  checkIn: "14:00",
  checkOut: "11:00",
  maxGuests: 6,
  currency: "TZS"
};

const DEFAULT_UNITS = [
  {
    name: "Premium One Bedroom",
    floor: "Ground Floor",
    price: 200000,
    capacity: 6,
    bedrooms: 1,
    bathrooms: 1,
    status: "available",
    active: true,
    description: "Private one-bedroom apartment with living room, smart open kitchen and everything you need for an independent stay.",
    amenities: ["Air conditioning", "Hot water", "Smart TV", "DStv / Azam", "Kitchen", "Free Wi-Fi", "Parking"],
    images: ["/images/living-1.jpg", "/images/bed.jpg", "/images/bedroom.jpg"]
  },
  {
    name: "Executive One Bedroom",
    floor: "Upper Floor",
    price: 250000,
    capacity: 6,
    bedrooms: 1,
    bathrooms: 1,
    status: "available",
    active: true,
    description: "A refined upper-floor apartment with modern interiors, spacious lounge and premium comfort.",
    amenities: ["Air conditioning", "Hot water", "Smart TV", "DStv / Azam", "Kitchen", "Free Wi-Fi", "Parking"],
    images: ["/images/living-2.jpg", "/images/bed.jpg", "/images/bedroom.jpg"]
  }
];

const settingsSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

const unitSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  floor: { type: String, default: "" },
  price: { type: Number, required: true, min: 0 },
  capacity: { type: Number, default: 6, min: 1, max: 20 },
  bedrooms: { type: Number, default: 1, min: 1 },
  bathrooms: { type: Number, default: 1, min: 1 },
  status: { type: String, enum: ["available", "maintenance", "hidden"], default: "available" },
  active: { type: Boolean, default: true },
  description: { type: String, default: "" },
  amenities: { type: [String], default: [] },
  images: { type: [String], default: [] }
}, { timestamps: true });

const bookingSchema = new mongoose.Schema({
  reference: { type: String, unique: true, index: true },
  unit: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", required: true },
  unitName: { type: String, required: true },
  guestName: { type: String, required: true, trim: true },
  guestPhone: { type: String, required: true, trim: true },
  guests: { type: Number, required: true, min: 1, max: 20 },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  nights: { type: Number, required: true, min: 1 },
  pricePerNight: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  note: { type: String, default: "" },
  status: { type: String, enum: ["pending", "confirmed", "cancelled", "completed"], default: "pending", index: true },
  source: { type: String, default: "website" },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const reviewSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, required: true, trim: true },
  approved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const gallerySchema = new mongoose.Schema({
  title: { type: String, default: "" },
  imageUrl: { type: String, required: true },
  category: { type: String, default: "Property" },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const Settings = mongoose.model("Settings", settingsSchema);
const Unit = mongoose.model("Unit", unitSchema);
const Booking = mongoose.model("Booking", bookingSchema);
const Review = mongoose.model("Review", reviewSchema);
const Gallery = mongoose.model("Gallery", gallerySchema);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public"), { maxAge: "7d" }));

app.disable("x-powered-by");

let sessionMiddleware = null;
app.use((req, res, next) => {
  if (!sessionMiddleware) return res.status(503).send("Service is starting. Please refresh in a moment.");
  return sessionMiddleware(req, res, next);
});
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

function money(n) {
  return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function normalizeDate(value) {
  const d = new Date(String(value || ""));
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateOnly(value) {
  const d = normalizeDate(value);
  if (!d) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function nightsBetween(checkIn, checkOut) {
  return Math.ceil((checkOut - checkIn) / 86400000);
}

function ref() {
  return "ALK-" + Date.now().toString(36).toUpperCase() + "-" + crypto.randomBytes(2).toString("hex").toUpperCase();
}

function waMessage(settings, booking) {
  const lines = [
    `Hello ${settings.propertyName},`,
    "",
    `I would like to book an apartment.`,
    `Booking Ref: ${booking.reference}`,
    `Apartment: ${booking.unitName}`,
    `Guest: ${booking.guestName}`,
    `Phone: ${booking.guestPhone}`,
    `Guests: ${booking.guests}`,
    `Check-in: ${booking.checkIn.toLocaleDateString("en-GB")}`,
    `Check-out: ${booking.checkOut.toLocaleDateString("en-GB")}`,
    `Nights: ${booking.nights}`,
    `Rate: ${money(booking.pricePerNight)} ${settings.currency}/night`,
    `Estimated total: ${money(booking.total)} ${settings.currency}`,
    booking.note ? `Note: ${booking.note}` : "",
    "",
    "Please confirm availability and booking details."
  ].filter(Boolean);
  return lines.join("\n");
}

async function ensureSettings() {
  let doc = await Settings.findOne({ key: "property" });
  if (!doc) doc = await Settings.create({ key: "property", data: DEFAULT_SETTINGS });
  return { ...DEFAULT_SETTINGS, ...(doc.data || {}) };
}

async function ensureSessionSecret() {
  let doc = await Settings.findOne({ key: "session-secret" });
  if (!doc || !doc.data?.secret) {
    const secret = crypto.randomBytes(48).toString("base64url");
    if (doc) {
      doc.data = { secret };
      await doc.save();
    } else {
      await Settings.create({ key: "session-secret", data: { secret } });
    }
    console.log("Generated a new MongoDB-backed session secret.");
    return secret;
  }
  return doc.data.secret;
}

async function seed() {
  const settings = await ensureSettings();
  if (await Unit.countDocuments() === 0) await Unit.insertMany(DEFAULT_UNITS);
  if (await Gallery.countDocuments() === 0) {
    await Gallery.insertMany([
      { title: "Swimming Pool", imageUrl: "/images/pool.jpg", category: "Pool" },
      { title: "Modern Living Room", imageUrl: "/images/living-1.jpg", category: "Living Room" },
      { title: "Bedroom", imageUrl: "/images/bed.jpg", category: "Bedroom" },
      { title: "Bedroom Detail", imageUrl: "/images/bedroom.jpg", category: "Bedroom" },
      { title: "Premium Lounge", imageUrl: "/images/living-2.jpg", category: "Living Room" }
    ]);
  }
  return settings;
}

async function isAvailable(unitId, checkIn, checkOut, excludeId = null) {
  const query = {
    unit: unitId,
    status: { $in: ["pending", "confirmed"] },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn }
  };
  if (excludeId) query._id = { $ne: excludeId };
  return !(await Booking.exists(query));
}

async function adminAuth(req, res, next) {
  if (!req.session.admin) return res.redirect("/admin/login");
  next();
}

app.use(async (req, res, next) => {
  try {
    res.locals.lang = req.query.lang === "sw" ? "sw" : (req.session.lang || "en");
    if (req.query.lang === "en" || req.query.lang === "sw") req.session.lang = req.query.lang;
    res.locals.money = money;
    res.locals.admin = req.session.admin || null;
    res.locals.whatsapp = PROPERTY_WHATSAPP;
    res.locals.settings = await ensureSettings();
    next();
  } catch (e) {
    next(e);
  }
});

app.get("/", async (req, res) => {
  const settings = res.locals.settings;
  const units = await Unit.find({ active: true, status: { $ne: "hidden" } }).sort({ price: 1 }).lean();
  const gallery = await Gallery.find({ active: true }).sort({ createdAt: -1 }).lean();
  const reviews = await Review.find({ approved: true }).sort({ createdAt: -1 }).limit(8).lean();
  res.render("home", { units, gallery, reviews });
});

app.get("/availability", async (req, res) => {
  const checkIn = dateOnly(req.query.checkIn);
  const checkOut = dateOnly(req.query.checkOut);
  const guests = Number(req.query.guests || 1);
  if (!checkIn || !checkOut || checkOut <= checkIn) return res.status(400).json({ error: "Invalid dates." });
  const units = await Unit.find({ active: true, status: "available", capacity: { $gte: guests } }).lean();
  const results = [];
  for (const unit of units) {
    results.push({ ...unit, available: await isAvailable(unit._id, checkIn, checkOut) });
  }
  res.json({ units: results });
});

app.get("/book/:id", async (req, res) => {
  const unit = await Unit.findOne({ _id: req.params.id, active: true }).lean();
  if (!unit) return res.status(404).render("error", { title: "Not found", message: "Apartment not found." });
  res.render("book", { unit });
});

app.post("/book", async (req, res) => {
  try {
    const unit = await Unit.findOne({ _id: req.body.unitId, active: true, status: "available" });
    if (!unit) return res.status(404).render("error", { title: "Unavailable", message: "This apartment is not available." });

    const guestName = String(req.body.guestName || "").trim();
    const guestPhone = String(req.body.guestPhone || "").trim();
    const guests = Number(req.body.guests);
    const checkIn = dateOnly(req.body.checkIn);
    const checkOut = dateOnly(req.body.checkOut);
    const note = String(req.body.note || "").trim();

    if (!guestName || !guestPhone || !checkIn || !checkOut || checkOut <= checkIn || guests < 1 || guests > unit.capacity) {
      return res.status(400).render("error", { title: "Check your details", message: `Please provide valid booking details. Maximum guests for this unit: ${unit.capacity}.` });
    }

    if (!(await isAvailable(unit._id, checkIn, checkOut))) {
      return res.status(409).render("error", { title: "Dates unavailable", message: "Those dates are already reserved. Please choose another date or apartment." });
    }

    const nights = nightsBetween(checkIn, checkOut);
    const booking = await Booking.create({
      reference: ref(),
      unit: unit._id,
      unitName: unit.name,
      guestName,
      guestPhone,
      guests,
      checkIn,
      checkOut,
      nights,
      pricePerNight: unit.price,
      total: unit.price * nights,
      note,
      status: "pending"
    });

    const settings = res.locals.settings;
    const message = waMessage(settings, booking);
    const waUrl = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(message)}`;

    res.render("confirmation", { booking: booking.toObject(), waUrl });
  } catch (e) {
    console.error(e);
    res.status(500).render("error", { title: "Booking error", message: "Something went wrong while creating your booking request." });
  }
});

app.post("/reviews", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const text = String(req.body.text || "").trim();
  const rating = Number(req.body.rating);
  if (!name || !text || rating < 1 || rating > 5) return res.redirect("/#reviews");
  await Review.create({ name, text, rating, approved: false });
  res.redirect("/?review=received#reviews");
});

app.get("/admin/login", (req, res) => {
  if (req.session.admin) return res.redirect("/admin");
  res.render("admin-login", { error: null });
});

app.post("/admin/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).render("admin-login", { error: "Invalid administrator credentials." });
  }
  req.session.admin = { email };
  res.redirect("/admin");
});

app.post("/admin/logout", adminAuth, (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

app.get("/admin", adminAuth, async (req, res) => {
  const [units, bookings, pending, approvedReviews, recentBookings] = await Promise.all([
    Unit.find().sort({ createdAt: -1 }).lean(),
    Booking.countDocuments(),
    Booking.countDocuments({ status: "pending" }),
    Review.countDocuments({ approved: true }),
    Booking.find().sort({ createdAt: -1 }).limit(12).lean()
  ]);
  const revenueAgg = await Booking.aggregate([
    { $match: { status: { $in: ["confirmed", "completed"] } } },
    { $group: { _id: null, total: { $sum: "$total" } } }
  ]);
  res.render("admin-dashboard", {
    units, totalBookings: bookings, pending, approvedReviews,
    revenue: revenueAgg[0]?.total || 0, recentBookings
  });
});

app.get("/admin/bookings", adminAuth, async (req, res) => {
  const bookings = await Booking.find().sort({ createdAt: -1 }).lean();
  res.render("admin-bookings", { bookings });
});

app.post("/admin/bookings/:id/status", adminAuth, async (req, res) => {
  const status = ["pending", "confirmed", "cancelled", "completed"].includes(req.body.status) ? req.body.status : "pending";
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.redirect("/admin/bookings");

  if (status === "confirmed") {
    const ok = await isAvailable(booking.unit, booking.checkIn, booking.checkOut, booking._id);
    if (!ok) return res.status(409).send("Cannot confirm: dates overlap another active booking.");
  }
  booking.status = status;
  await booking.save();
  res.redirect("/admin/bookings");
});

app.post("/admin/bookings/:id/delete", adminAuth, async (req, res) => {
  await Booking.findByIdAndDelete(req.params.id);
  res.redirect("/admin/bookings");
});

app.get("/admin/units", adminAuth, async (req, res) => {
  const units = await Unit.find().sort({ createdAt: -1 }).lean();
  res.render("admin-units", { units });
});

app.post("/admin/units", adminAuth, async (req, res) => {
  const images = String(req.body.images || "").split("\n").map(s => s.trim()).filter(Boolean);
  const amenities = String(req.body.amenities || "").split(",").map(s => s.trim()).filter(Boolean);
  await Unit.create({
    name: req.body.name, floor: req.body.floor, price: Number(req.body.price),
    capacity: Number(req.body.capacity || 6), bedrooms: Number(req.body.bedrooms || 1),
    bathrooms: Number(req.body.bathrooms || 1), description: req.body.description || "",
    amenities, images, status: req.body.status || "available", active: req.body.active === "on"
  });
  res.redirect("/admin/units");
});

app.post("/admin/units/:id", adminAuth, async (req, res) => {
  const unit = await Unit.findById(req.params.id);
  if (!unit) return res.redirect("/admin/units");
  unit.name = req.body.name;
  unit.floor = req.body.floor;
  unit.price = Number(req.body.price);
  unit.capacity = Number(req.body.capacity || 6);
  unit.bedrooms = Number(req.body.bedrooms || 1);
  unit.bathrooms = Number(req.body.bathrooms || 1);
  unit.description = req.body.description || "";
  unit.amenities = String(req.body.amenities || "").split(",").map(s => s.trim()).filter(Boolean);
  unit.images = String(req.body.images || "").split("\n").map(s => s.trim()).filter(Boolean);
  unit.status = req.body.status || "available";
  unit.active = req.body.active === "on";
  await unit.save();
  res.redirect("/admin/units");
});

app.post("/admin/units/:id/delete", adminAuth, async (req, res) => {
  await Unit.findByIdAndDelete(req.params.id);
  res.redirect("/admin/units");
});

app.get("/admin/gallery", adminAuth, async (req, res) => {
  const gallery = await Gallery.find().sort({ createdAt: -1 }).lean();
  res.render("admin-gallery", { gallery });
});

app.post("/admin/gallery", adminAuth, async (req, res) => {
  await Gallery.create({
    title: req.body.title || "",
    imageUrl: req.body.imageUrl,
    category: req.body.category || "Property",
    active: req.body.active === "on"
  });
  res.redirect("/admin/gallery");
});

app.post("/admin/gallery/:id/delete", adminAuth, async (req, res) => {
  await Gallery.findByIdAndDelete(req.params.id);
  res.redirect("/admin/gallery");
});

app.get("/admin/reviews", adminAuth, async (req, res) => {
  const reviews = await Review.find().sort({ createdAt: -1 }).lean();
  res.render("admin-reviews", { reviews });
});

app.post("/admin/reviews/:id/toggle", adminAuth, async (req, res) => {
  const r = await Review.findById(req.params.id);
  if (r) { r.approved = !r.approved; await r.save(); }
  res.redirect("/admin/reviews");
});

app.post("/admin/reviews/:id/delete", adminAuth, async (req, res) => {
  await Review.findByIdAndDelete(req.params.id);
  res.redirect("/admin/reviews");
});

app.get("/admin/settings", adminAuth, async (req, res) => {
  res.render("admin-settings");
});

app.post("/admin/settings", adminAuth, async (req, res) => {
  const data = {
    ...res.locals.settings,
    propertyName: req.body.propertyName,
    tagline: req.body.tagline,
    location: req.body.location,
    description: req.body.description,
    phone: req.body.phone,
    whatsapp: String(req.body.whatsapp || PROPERTY_WHATSAPP).replace(/\D/g, ""),
    instagram: req.body.instagram || "",
    mapUrl: req.body.mapUrl,
    checkIn: req.body.checkIn,
    checkOut: req.body.checkOut,
    maxGuests: Number(req.body.maxGuests || 6),
    currency: req.body.currency || "TZS"
  };
  await Settings.findOneAndUpdate({ key: "property" }, { data }, { upsert: true });
  res.redirect("/admin/settings?saved=1");
});

app.get("/health", (req, res) => res.json({ ok: true, service: "ALKOS Apartments" }));

app.use((req, res) => res.status(404).render("error", { title: "404", message: "The page you requested could not be found." }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error", { title: "Server error", message: "An unexpected error occurred. Please try again." });
});

(async () => {
  try {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing.");
    await mongoose.connect(process.env.MONGODB_URI);
    const sessionSecret = await ensureSessionSecret();
    await seed();

    sessionMiddleware = session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: "alkos_sessions",
        ttl: 60 * 60 * 24 * 7
      }),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7
      }
    });

    // Session-dependent middleware/routes must be mounted before listening.
    app.listen(PORT, () => console.log(`ALKOS Apartments running on port ${PORT}`));
  } catch (e) {
    console.error("Startup failed:", e.message);
    process.exit(1);
  }
})();
