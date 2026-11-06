import mongoose from 'mongoose';
import { 
  UserModel, 
  PropertyModel, 
  ResidentModel, 
  PaymentModel,
  BookingModel,
  MaintenanceTicketModel,
  ReviewModel,
  NoticeBoardModel
} from './mongodb.models';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hostelizer';

export async function connectMongo() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`🍃 Connected to MongoDB: ${MONGODB_URI}`);
    await populateComprehensiveSeedData();
  } catch (err) {
    console.warn(`⚠️ MongoDB connection warning (Falling back to in-memory store):`, err);
  }
}

export async function populateComprehensiveSeedData(forceRefresh = false) {
  try {
    const propertyCount = await PropertyModel.countDocuments();
    const bookingCount = await BookingModel.countDocuments();

    if (propertyCount > 0 && bookingCount > 0 && !forceRefresh) {
      console.log('⚡ MongoDB already populated with comprehensive collections.');
      return;
    }

    console.log('🌱 Populating complete enterprise schemas in MongoDB Compass...');

    // 1. Clear existing collections if forceRefresh is requested
    if (forceRefresh) {
      await Promise.all([
        UserModel.deleteMany({}),
        PropertyModel.deleteMany({}),
        ResidentModel.deleteMany({}),
        PaymentModel.deleteMany({}),
        BookingModel.deleteMany({}),
        MaintenanceTicketModel.deleteMany({}),
        ReviewModel.deleteMany({}),
        NoticeBoardModel.deleteMany({})
      ]);
    }

    // 2. Seed Users (Owners, Students, Admins)
    const ownerRajesh = await UserModel.findOneAndUpdate(
      { email: 'rajesh@sunrisehostels.com' },
      {
        name: 'Rajesh Sharma',
        email: 'rajesh@sunrisehostels.com',
        phone: '+91 98765 43210',
        passwordHash: '$2a$10$wT0X8u0c4oVp0g6FvUf8i.b5r8w2lJvQk7k4g3o2k1h1h1h1h1h1h', // 'admin123'
        role: 'OWNER',
        ownerStatus: 'APPROVED',
        createdAt: new Date('2026-01-10')
      },
      { upsert: true, new: true }
    );

    const ownerPriya = await UserModel.findOneAndUpdate(
      { email: 'priya.nair@stanzaprime.com' },
      {
        name: 'Priya Nair',
        email: 'priya.nair@stanzaprime.com',
        phone: '+91 98450 11223',
        passwordHash: '$2a$10$wT0X8u0c4oVp0g6FvUf8i.b5r8w2lJvQk7k4g3o2k1h1h1h1h1h1h',
        role: 'OWNER',
        ownerStatus: 'APPROVED',
        createdAt: new Date('2026-02-15')
      },
      { upsert: true, new: true }
    );

    const studentAman = await UserModel.findOneAndUpdate(
      { email: 'aman.verma@hostelizer.com' },
      {
        name: 'Aman Verma',
        email: 'aman.verma@hostelizer.com',
        phone: '+91 91234 56780',
        passwordHash: '$2a$10$wT0X8u0c4oVp0g6FvUf8i.b5r8w2lJvQk7k4g3o2k1h1h1h1h1h1h',
        role: 'CUSTOMER',
        createdAt: new Date('2026-08-01')
      },
      { upsert: true, new: true }
    );

    const studentKavya = await UserModel.findOneAndUpdate(
      { email: 'kavya.iyer@gmail.com' },
      {
        name: 'Kavya Iyer',
        email: 'kavya.iyer@gmail.com',
        phone: '+91 99887 77665',
        passwordHash: '$2a$10$wT0X8u0c4oVp0g6FvUf8i.b5r8w2lJvQk7k4g3o2k1h1h1h1h1h1h',
        role: 'CUSTOMER',
        createdAt: new Date('2026-08-05')
      },
      { upsert: true, new: true }
    );

    const superAdmin = await UserModel.findOneAndUpdate(
      { email: 'compliance@hostelizer.com' },
      {
        name: 'Hostelizer Audit Admin',
        email: 'compliance@hostelizer.com',
        phone: '+91 80000 11111',
        passwordHash: '$2a$10$wT0X8u0c4oVp0g6FvUf8i.b5r8w2lJvQk7k4g3o2k1h1h1h1h1h1h',
        role: 'ADMIN',
        ownerStatus: 'APPROVED'
      },
      { upsert: true, new: true }
    );

    // 3. Seed Properties with Structured Cloudinary Assets
    const propSunrise = await PropertyModel.findOneAndUpdate(
      { name: 'Sunrise Luxury Boys PG & Co-living' },
      {
        name: 'Sunrise Luxury Boys PG & Co-living',
        description: 'Elite boys accommodation equipped with AC, high-speed optical fiber, organic home-style meals, gym, and 24/7 power backup near Vijay Nagar Square.',
        genderPreference: 'BOYS',
        status: 'PUBLISHED',
        address: 'Plot 42, Scheme 54, Near Vijay Nagar Square',
        city: 'Indore',
        locality: 'Vijay Nagar',
        pincode: '452010',
        monthlyRentStarting: 7500,
        foodIncluded: true,
        amenities: ['High-speed Wi-Fi', 'Air Conditioning', 'Meals Included', 'CCTV Security', 'Power Backup', 'Daily Housekeeping', 'Gym Facility', 'RO Water'],
        images: [
          { url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80', isCover: true, category: 'BEDROOM' },
          { url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80', isCover: false, category: 'COMMON_AREA' },
          { url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80', isCover: false, category: 'WASHROOM' }
        ],
        cloudinaryAssets: [
          {
            publicId: 'hostelizer/properties/prop_sunrise/bedroom/deluxe_101',
            url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
            secureUrl: 'https://res.cloudinary.com/cwswmc7c/image/upload/f_auto,q_auto/v1/hostelizer/properties/prop_sunrise/bedroom/deluxe_101',
            format: 'webp',
            resourceType: 'image',
            bytes: 482000,
            width: 1920,
            height: 1080,
            folder: 'hostelizer/properties/prop_sunrise/bedroom',
            category: 'BEDROOM',
            tags: ['ac_room', 'balcony', 'attached_bath', 'prop_sunrise'],
            isCover: true,
            uploadedAt: new Date()
          },
          {
            publicId: 'hostelizer/properties/prop_sunrise/common_area/study_hall',
            url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
            secureUrl: 'https://res.cloudinary.com/cwswmc7c/image/upload/f_auto,q_auto/v1/hostelizer/properties/prop_sunrise/common_area/study_hall',
            format: 'webp',
            resourceType: 'image',
            bytes: 320000,
            width: 1920,
            height: 1080,
            folder: 'hostelizer/properties/prop_sunrise/common_area',
            category: 'COMMON_AREA',
            tags: ['study_desk', 'silent_zone', 'highspeed_wifi'],
            isCover: false,
            uploadedAt: new Date()
          }
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
              { bedCode: '102-B', status: 'OCCUPIED' },
              { bedCode: '102-C', status: 'OCCUPIED' }
            ]
          },
          {
            roomNumber: '201',
            roomType: 'SINGLE',
            capacity: 1,
            hasAC: true,
            monthlyRent: 12000,
            deposit: 12000,
            beds: [
              { bedCode: '201-A', status: 'AVAILABLE' }
            ]
          }
        ]
      },
      { upsert: true, new: true }
    );

    const propStanza = await PropertyModel.findOneAndUpdate(
      { name: 'Stanza Prime Girls Co-living & Hostel' },
      {
        name: 'Stanza Prime Girls Co-living & Hostel',
        description: 'Biometric secured luxury living exclusively for female students & working professionals in Koramangala. Includes chef-curated meals, zumba sessions, and rooftop lounge.',
        genderPreference: 'GIRLS',
        status: 'PUBLISHED',
        address: '8th Main, 4th Block, Koramangala',
        city: 'Bangalore',
        locality: 'Koramangala',
        pincode: '560034',
        monthlyRentStarting: 11000,
        foodIncluded: true,
        amenities: ['High-speed Wi-Fi', 'Air Conditioning', 'Meals Included', 'Gym', 'Biometric Access', 'Power Backup', 'CCTV 24/7', 'Yoga Deck'],
        images: [
          { url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80', isCover: true, category: 'BEDROOM' },
          { url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80', isCover: false, category: 'COMMON_AREA' }
        ],
        cloudinaryAssets: [
          {
            publicId: 'hostelizer/properties/prop_stanza/bedroom/premium_double_201',
            url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80',
            secureUrl: 'https://res.cloudinary.com/cwswmc7c/image/upload/f_auto,q_auto/v1/hostelizer/properties/prop_stanza/bedroom/premium_double_201',
            format: 'webp',
            resourceType: 'image',
            bytes: 512000,
            width: 1920,
            height: 1080,
            folder: 'hostelizer/properties/prop_stanza/bedroom',
            category: 'BEDROOM',
            tags: ['spacious', 'wardrobe', 'prop_stanza'],
            isCover: true,
            uploadedAt: new Date()
          }
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
              { bedCode: '201-A', status: 'OCCUPIED' },
              { bedCode: '201-B', status: 'AVAILABLE' }
            ]
          },
          {
            roomNumber: '301',
            roomType: 'SINGLE',
            capacity: 1,
            hasAC: true,
            monthlyRent: 17500,
            deposit: 20000,
            beds: [
              { bedCode: '301-A', status: 'AVAILABLE' }
            ]
          }
        ]
      },
      { upsert: true, new: true }
    );

    const propAura = await PropertyModel.findOneAndUpdate(
      { name: 'Aura Heights Co-ed Residency & Student Hub' },
      {
        name: 'Aura Heights Co-ed Residency & Student Hub',
        description: 'New-age co-ed student residence near Christ University Central Campus. Features private study pods, amphitheater, coffee cafe, and smart laundry.',
        genderPreference: 'COED',
        status: 'PUBLISHED',
        address: 'Bannerghatta Main Road, Near Diary Circle',
        city: 'Bangalore',
        locality: 'BTM Layout',
        pincode: '560029',
        monthlyRentStarting: 13500,
        foodIncluded: true,
        amenities: ['Optical Wi-Fi', 'Cafeteria', 'Biometric Turnstiles', 'Study Pods', 'Power Backup', 'Air Conditioning', 'Elevator', 'Gaming Zone'],
        images: [
          { url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80', isCover: true, category: 'BEDROOM' }
        ],
        cloudinaryAssets: [
          {
            publicId: 'hostelizer/properties/prop_aura/bedroom/pod_single',
            url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
            secureUrl: 'https://res.cloudinary.com/cwswmc7c/image/upload/f_auto,q_auto/v1/hostelizer/properties/prop_aura/bedroom/pod_single',
            format: 'webp',
            resourceType: 'image',
            bytes: 440000,
            width: 1920,
            height: 1080,
            folder: 'hostelizer/properties/prop_aura/bedroom',
            category: 'BEDROOM',
            tags: ['study_pod', 'coed', 'prop_aura'],
            isCover: true,
            uploadedAt: new Date()
          }
        ],
        rooms: [
          {
            roomNumber: '401',
            roomType: 'DOUBLE',
            capacity: 2,
            hasAC: true,
            monthlyRent: 13500,
            deposit: 15000,
            beds: [
              { bedCode: '401-A', status: 'AVAILABLE' },
              { bedCode: '401-B', status: 'AVAILABLE' }
            ]
          }
        ]
      },
      { upsert: true, new: true }
    );

    // 4. Seed Residents
    await ResidentModel.deleteMany({});
    await ResidentModel.create([
      {
        name: 'Kavya Iyer',
        phone: '+91 99887 77665',
        email: 'kavya.iyer@gmail.com',
        bedCode: '201-A',
        propertyName: 'Stanza Prime Girls Co-living & Hostel',
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
        propertyName: 'Sunrise Luxury Boys PG & Co-living',
        monthlyRent: 6500,
        moveInDate: '2026-10-28',
        kycStatus: 'VERIFIED',
        aadhaarNumber: 'XXXX-XXXX-9021',
        emergencyContact: '+91 94250 11223 (Guardian)'
      },
      {
        name: 'Aman Verma',
        phone: '+91 91234 56780',
        email: 'aman.verma@hostelizer.com',
        bedCode: '101-B',
        propertyName: 'Sunrise Luxury Boys PG & Co-living',
        monthlyRent: 8500,
        moveInDate: '2026-10-15',
        kycStatus: 'VERIFIED',
        aadhaarNumber: 'XXXX-XXXX-3341',
        emergencyContact: '+91 98223 55441 (Brother)'
      },
      {
        name: 'Rohan Mehra',
        phone: '+91 98334 22119',
        email: 'rohan.m@techcorp.in',
        bedCode: '102-C',
        propertyName: 'Sunrise Luxury Boys PG & Co-living',
        monthlyRent: 6500,
        moveInDate: '2026-09-01',
        kycStatus: 'VERIFIED',
        aadhaarNumber: 'XXXX-XXXX-7119',
        emergencyContact: '+91 98221 00998 (Mother)'
      }
    ]);

    // 5. Seed Payments (Transactions Ledger)
    await PaymentModel.deleteMany({});
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
      },
      {
        residentName: 'Aman Verma',
        bedCode: '101-B',
        amount: 8500,
        type: 'MONTHLY_RENT',
        status: 'SETTLED',
        date: '2026-11-01',
        paymentMode: 'UPI',
        utrRef: 'UPI-ICICI-664421'
      },
      {
        residentName: 'Rohan Mehra',
        bedCode: '102-C',
        amount: 6500,
        type: 'MONTHLY_RENT',
        status: 'SETTLED',
        date: '2026-11-01',
        paymentMode: 'GOOGLE_PAY',
        utrRef: 'UPI-GPAY-441199'
      }
    ]);

    // 6. Seed Table: Bookings & Scheduled Visits
    await BookingModel.deleteMany({});
    await BookingModel.create([
      {
        userId: studentAman._id,
        userName: 'Aman Verma',
        userPhone: '+91 91234 56780',
        propertyId: propSunrise._id,
        propertyName: 'Sunrise Luxury Boys PG & Co-living',
        roomNumber: '101',
        bedCode: '101-A',
        bookingType: 'TOKEN_BOOKING',
        visitDate: '2026-11-08',
        visitSlot: '11:00 AM - 12:00 PM',
        status: 'CONFIRMED',
        tokenAmountPaid: 2000,
        paymentRef: 'UPI-TOKEN-559922'
      },
      {
        userId: studentKavya._id,
        userName: 'Kavya Iyer',
        userPhone: '+91 99887 77665',
        propertyId: propStanza._id,
        propertyName: 'Stanza Prime Girls Co-living & Hostel',
        roomNumber: '201',
        bedCode: '201-B',
        bookingType: 'SCHEDULED_VISIT',
        visitDate: '2026-11-07',
        visitSlot: '4:30 PM - 5:30 PM',
        status: 'PENDING',
        tokenAmountPaid: 0
      },
      {
        userId: studentAman._id,
        userName: 'Rhea Sen',
        userPhone: '+91 98112 33445',
        propertyId: propAura._id,
        propertyName: 'Aura Heights Co-ed Residency & Student Hub',
        roomNumber: '401',
        bedCode: '401-A',
        bookingType: 'INSTANT_LOCK',
        visitDate: '2026-11-09',
        visitSlot: '2:00 PM - 3:00 PM',
        status: 'CONFIRMED',
        tokenAmountPaid: 3000,
        paymentRef: 'RAZORPAY-INSTA-88221'
      }
    ]);

    // 7. Seed Table: Maintenance & Complaint Tickets
    await MaintenanceTicketModel.deleteMany({});
    await MaintenanceTicketModel.create([
      {
        propertyId: propSunrise._id,
        propertyName: 'Sunrise Luxury Boys PG & Co-living',
        residentName: 'Aman Verma',
        bedCode: '101-B',
        category: 'WIFI_INTERNET',
        priority: 'HIGH',
        issueDescription: '5GHz Wi-Fi router on 1st floor drops packets during online classes and coding tests.',
        status: 'IN_PROGRESS',
        ownerRemarks: 'Technician dispatched for fiber node reboot.'
      },
      {
        propertyId: propSunrise._id,
        propertyName: 'Sunrise Luxury Boys PG & Co-living',
        residentName: 'Harsh Vardhan',
        bedCode: '102-B',
        category: 'PLUMBING',
        priority: 'MEDIUM',
        issueDescription: 'Hot water geyser takes over 20 minutes to heat in morning rush.',
        status: 'OPEN',
        ownerRemarks: 'Scheduled inspection by electrician on Saturday.'
      },
      {
        propertyId: propStanza._id,
        propertyName: 'Stanza Prime Girls Co-living & Hostel',
        residentName: 'Kavya Iyer',
        bedCode: '201-A',
        category: 'CLEANING',
        priority: 'LOW',
        issueDescription: 'Request deep balcony cleaning after dust storm.',
        status: 'RESOLVED',
        resolvedAt: new Date('2026-11-04'),
        ownerRemarks: 'Housekeeping team completed deep clean.'
      }
    ]);

    // 8. Seed Table: Verified Reviews & Ratings
    await ReviewModel.deleteMany({});
    await ReviewModel.create([
      {
        propertyId: propSunrise._id,
        propertyName: 'Sunrise Luxury Boys PG & Co-living',
        residentName: 'Harsh Vardhan',
        ratingOverall: 5,
        cleanlinessScore: 5,
        foodQualityScore: 5,
        wifiScore: 4,
        safetyScore: 5,
        title: 'Best food and peaceful study atmosphere!',
        comment: 'Living here for 3 months now. Food quality is hygienic like home, CCTV security is always active, and Rajesh sir resolves issues promptly.',
        isVerifiedTenant: true
      },
      {
        propertyId: propSunrise._id,
        propertyName: 'Sunrise Luxury Boys PG & Co-living',
        residentName: 'Aman Verma',
        ratingOverall: 4,
        cleanlinessScore: 4,
        foodQualityScore: 4,
        wifiScore: 5,
        safetyScore: 5,
        title: 'Very convenient location for college & coaching',
        comment: 'Walking distance to metro and library. Power backup is instant during summer outages.',
        isVerifiedTenant: true
      },
      {
        propertyId: propStanza._id,
        propertyName: 'Stanza Prime Girls Co-living & Hostel',
        residentName: 'Kavya Iyer',
        ratingOverall: 5,
        cleanlinessScore: 5,
        foodQualityScore: 5,
        wifiScore: 5,
        safetyScore: 5,
        title: 'Safe, premium, and very secure for girls',
        comment: 'Biometric gate entry, 24/7 female warden, and excellent Wi-Fi make this the best PG in Koramangala.',
        isVerifiedTenant: true
      }
    ]);

    // 9. Seed Table: Notice / Announcement Board
    await NoticeBoardModel.deleteMany({});
    await NoticeBoardModel.create([
      {
        propertyId: propSunrise._id,
        propertyName: 'Sunrise Luxury Boys PG & Co-living',
        title: 'Festive Sunday Special Dinner Menu',
        content: 'Special Biryani, Paneer Lababdar, and Gulab Jamun served from 8:00 PM to 10:30 PM this Sunday.',
        category: 'FOOD_MENU',
        isImportant: true,
        postedBy: 'Rajesh Sharma (Owner)'
      },
      {
        propertyId: propSunrise._id,
        propertyName: 'Sunrise Luxury Boys PG & Co-living',
        title: 'Routine Water Tank Disinfection',
        content: 'Overhead water tanks will undergo UV & chlorinated cleaning on Saturday 10:00 AM - 1:00 PM. Please store emergency water.',
        category: 'MAINTENANCE_DOWNTIME',
        isImportant: true,
        postedBy: 'Operations Manager'
      },
      {
        propertyId: propStanza._id,
        propertyName: 'Stanza Prime Girls Co-living & Hostel',
        title: 'Free Weekend Yoga & Wellness Session',
        content: 'Complimentary morning Yoga class on the rooftop terrace from 7:00 AM to 8:15 AM with certified instructor.',
        category: 'EVENT',
        isImportant: false,
        postedBy: 'Priya Nair (Owner)'
      }
    ]);

    console.log('✅ All 8 Collections successfully populated with enterprise seed data in MongoDB Compass!');
  } catch (err) {
    console.error('Error seeding MongoDB:', err);
  }
}
