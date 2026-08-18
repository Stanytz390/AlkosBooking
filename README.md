# 🏡 ALKOS Apartments Booking System

Premium apartment booking and management system built for ALKOS Apartments, Geita, Tanzania.

## ✨ Features

- 🏠 Premium apartment showcase
- 📅 Apartment availability checking
- 🛏️ Direct online booking
- 👥 Guest capacity management
- 📲 Automatic WhatsApp booking notifications
- 🟢 Available / 🔴 Booked apartment status
- 🖼️ Property image gallery
- ⭐ Customer reviews
- 📍 Google Maps location
- 📞 Direct phone contact
- 🌐 English & Swahili
- 🔐 Secure admin dashboard
- 📊 Booking management
- 🏢 Apartment/unit management
- 🖼️ Gallery management
- ⭐ Review management
- ⚙️ Website settings management
- 📱 Fully responsive mobile design
- 🗄️ MongoDB database
- 🚀 Heroku deployment ready

---

## 🏡 About ALKOS Apartments

ALKOS Apartments is located in Mseto, Geita, Tanzania.

The property provides comfortable self-contained apartments suitable for short and extended stays.

### Amenities

- 🏊 Swimming pool
- 🏋️ Modern gym
- 🧖 Smart sauna
- ❄️ Air conditioning
- 🚿 Hot water
- 📺 Large flat-screen TV
- 📡 DStv / Azam decoder
- 🍳 Smart open kitchen
- 📶 Free high-speed Wi-Fi
- ⚡ 24-hour electricity
- 🚗 Secure parking
- 📹 24-hour CCTV security

---

## 💰 Pricing

Apartment rates generally range from:

**TZS 200,000 – 250,000 per day**

Prices may vary depending on the selected unit and package.

---

## 👨‍👩‍👧‍👦 Guest Capacity

Each apartment can accommodate up to:

**6 guests**

The system allows the property administrator to configure apartment capacity and availability.

---

## 📲 WhatsApp Booking

When a guest submits a booking request, the system prepares a WhatsApp message containing booking details.

Example:

Guest Name  
Phone Number  
Apartment  
Check-in Date  
Check-out Date  
Number of Guests  
Total Nights  
Estimated Amount  

The guest can then send the booking request directly through WhatsApp.

---

## 🔐 Admin Dashboard

Administrators can manage:

- Bookings
- Apartments
- Prices
- Availability
- Gallery
- Reviews
- Contact information
- WhatsApp number
- Google Maps location
- Website settings

---

## 🗄️ Database

The application uses MongoDB.

MongoDB stores:

- Apartments
- Bookings
- Reviews
- Gallery images
- Website settings
- Availability information

MongoDB makes it possible to maintain the application's data independently from the application server.

---

## 🚀 Deployment

This project is designed to be deployed easily using Heroku.

### Requirements

You need:

- GitHub account
- Heroku account
- MongoDB database
- Node.js application

### Environment Variables

The application uses:

```env
MONGODB_URI=
SESSION_SECRET=
ADMIN_PASSWORD=
ADMIN_EMAIL=
NODE_ENV=production
SHOP_NAME=
WHATSAPP_NUMBER=
CONTACT_PHONE=
GOOGLE_MAPS_URL=

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://www.heroku.com/deploy?template=https://github.com/Stanytz390/AlkosBooking)
