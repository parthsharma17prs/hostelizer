import mongoose from 'mongoose';
import { UserModel, PropertyModel, ResidentModel, PaymentModel } from './mongodb.models';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hostelizer';

export async function connectMongo() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`🍃 Connected to MongoDB: ${MONGODB_URI}`);
    await seedMongoIfEmpty();
  } catch (err) {
    console.warn(`⚠️ MongoDB connection warning (Falling back to in-memory store):`, err);
  }
}

async function seedMongoIfEmpty() {
  try {
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      console.log('🌱 Seeding MongoDB collections...');

      // Seed Owner
      await UserModel.create({
        name: 'Rajesh Sharma',
        email: 'rajesh@sunrisehostels.com',
        phone: '9876543210',
        passwordHash: '$2a$10$wT0X8u0c4oVp0g6FvUf8i.b5r8w2lJvQk7k4g3o2k1h1h1h1h1h1h', // 'admin123'
        role: 'OWNER',
        ownerStatus: 'APPROVED'
      });

      // Seed Student
      await UserModel.create({
        name: 'Aman Verma',
        email: 'aman.student@hostelizer.com',
        phone: '9123456780',
        passwordHash: '$2a$10$wT0X8u0c4oVp0g6FvUf8i.b5r8w2lJvQk7k4g3o2k1h1h1h1h1h1h',
        role: 'CUSTOMER'
      });

      // Seed Properties
      await PropertyModel.create([
        {
          name: 'Sunrise Luxury Boys PG & Co-living',
          description: 'Premium boys accommodation equipped with AC, high-speed Wi-Fi, nutritious meals, and 24/7 power backup near Vijay Nagar Square.',
          genderPreference: 'BOYS',
          status: 'PUBLISHED',
          address: 'Plot 42, Scheme 54, Near Vijay Nagar Square',
          city: 'Indore',
          locality: 'Vijay Nagar',
          pincode: '452010',
          monthlyRentStarting: 7500,
          foodIncluded: true,
          amenities: ['High-speed Wi-Fi', 'Air Conditioning', 'Meals Included', 'CCTV Security', 'Power Backup', 'Daily Housekeeping', 'Laundry'],
          images: [
            { url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1000&q=80', isCover: true },
            { url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80', isCover: false },
            { url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1000&q=80', isCover: false }
          ],
          rooms: [
            {
              roomNumber: '101',
              roomType: 'DOUBLE',
              capacity: 2,
              hasAC: true,
              monthlyRent: 8500,
              deposit: 8500,
              beds: [
                { bedCode: '101-A', status: 'AVAILABLE' },
                { bedCode: '101-B', status: 'OCCUPIED' }
              ]
            },
            {
              roomNumber: '102',
              roomType: 'TRIPLE',
              capacity: 3,
              hasAC: false,
              monthlyRent: 6500,
              deposit: 6500,
              beds: [
                { bedCode: '102-A', status: 'AVAILABLE' },
                { bedCode: '102-B', status: 'AVAILABLE' },
                { bedCode: '102-C', status: 'OCCUPIED' }
              ]
            }
          ]
        },
        {
          name: 'Stanza Prime Girls Co-living & Hostel',
          description: 'Modern, safe girls living space near Sony World Signal with biometric access, gym, Wi-Fi, and daily housekeeping.',
          genderPreference: 'GIRLS',
          status: 'PUBLISHED',
          address: '8th Main, 4th Block, Koramangala',
          city: 'Bangalore',
          locality: 'Koramangala',
          pincode: '560034',
          monthlyRentStarting: 11000,
          foodIncluded: true,
          amenities: ['High-speed Wi-Fi', 'Air Conditioning', 'Meals Included', 'Gym', 'Biometric Access', 'Power Backup'],
          images: [
            { url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1000&q=80', isCover: true },
            { url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80', isCover: false }
          ],
          rooms: [
            {
              roomNumber: '201',
              roomType: 'DOUBLE',
              capacity: 2,
              hasAC: true,
              monthlyRent: 12500,
              deposit: 15000,
              beds: [
                { bedCode: '201-A', status: 'AVAILABLE' },
                { bedCode: '201-B', status: 'AVAILABLE' }
              ]
            }
          ]
        }
      ]);

      // Seed Residents
      await ResidentModel.create([
        {
          name: 'Kavya Iyer',
          phone: '+91 99887 77665',
          email: 'kavya.iyer@gmail.com',
          bedCode: '201-A',
          propertyName: 'Stanza Prime Girls PG',
          monthlyRent: 12500,
          moveInDate: '2026-11-01',
          kycStatus: 'VERIFIED',
          aadhaarNumber: 'XXXX-XXXX-4812',
          emergencyContact: '+91 98111 22334 (Father)'
        },
        {
          name: 'Harsh Vardhan',
          phone: '+91 97766 55443',
          email: 'harsh.v@college.edu',
          bedCode: '102-B',
          propertyName: 'Sunrise Luxury Boys PG',
          monthlyRent: 6500,
          moveInDate: '2026-10-28',
          kycStatus: 'VERIFIED',
          aadhaarNumber: 'XXXX-XXXX-9021',
          emergencyContact: '+91 94250 11223 (Guardian)'
        },
        {
          name: 'Aman Verma',
          phone: '+91 91234 56780',
          email: 'aman.verma@gmail.com',
          bedCode: '101-B',
          propertyName: 'Sunrise Luxury Boys PG',
          monthlyRent: 8500,
          moveInDate: '2026-10-15',
          kycStatus: 'VERIFIED',
          aadhaarNumber: 'XXXX-XXXX-3341',
          emergencyContact: '+91 98223 55441 (Brother)'
        }
      ]);

      // Seed Payments
      await PaymentModel.create([
        {
          residentName: 'Kavya Iyer',
          bedCode: '201-A',
          amount: 2000,
          type: 'TOKEN_RESERVATION',
          status: 'SETTLED',
          date: '2026-11-03',
          paymentMode: 'UPI',
          utrRef: 'UPI-RAZORPAY-9938210'
        },
        {
          residentName: 'Kavya Iyer',
          bedCode: '201-A',
          amount: 12500,
          type: 'MONTHLY_RENT',
          status: 'SETTLED',
          date: '2026-11-01',
          paymentMode: 'NET_BANKING',
          utrRef: 'HDFC-RTGS-882190'
        },
        {
          residentName: 'Harsh Vardhan',
          bedCode: '102-B',
          amount: 2000,
          type: 'TOKEN_RESERVATION',
          status: 'SETTLED',
          date: '2026-10-28',
          paymentMode: 'UPI',
          utrRef: 'UPI-RAZORPAY-771029'
        }
      ]);

      console.log('✅ MongoDB database initialized & populated for MongoDB Compass!');
    }
  } catch (err) {
    console.error('Error seeding MongoDB:', err);
  }
}

