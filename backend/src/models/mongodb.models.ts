import mongoose, { Schema, Document } from 'mongoose';

// 1. User & Auth Schema
export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  authProvider: 'LOCAL' | 'GOOGLE' | 'OTP';
  googleId?: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  role: 'CUSTOMER' | 'OWNER' | 'ADMIN' | 'VERIFICATION_ADMIN';
  ownerStatus?: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  orgId?: string;
  isArchived?: boolean;
  jobProfile?: {
    title?: string;
    company?: string;
    isVerified?: boolean;
  };
  kycDocuments?: {
    panCardUrl?: string;
    aadhaarUrl?: string;
    maskedPan?: string;
    maskedAadhaar?: string;
    propertyDeedUrl?: string;
    verifiedAt?: Date;
  };
  lastLoginAt?: Date;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  passwordHash: { type: String, required: true },
  authProvider: { type: String, enum: ['LOCAL', 'GOOGLE', 'OTP'], default: 'LOCAL' },
  googleId: { type: String },
  avatarUrl: { type: String },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  role: { type: String, enum: ['CUSTOMER', 'OWNER', 'ADMIN', 'VERIFICATION_ADMIN'], default: 'CUSTOMER' },
  ownerStatus: { type: String, enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'], default: 'APPROVED' },
  orgId: { type: String },
  isArchived: { type: Boolean, default: false },
  jobProfile: {
    title: String,
    company: String,
    isVerified: { type: Boolean, default: false }
  },
  kycDocuments: {
    panCardUrl: String,
    aadhaarUrl: String,
    maskedPan: String,
    maskedAadhaar: String,
    propertyDeedUrl: String,
    verifiedAt: Date
  },
  lastLoginAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

// 2. Bed Sub-Schema
const BedSchema = new Schema({
  bedCode: { type: String, required: true },
  status: { type: String, enum: ['AVAILABLE', 'HELD', 'OCCUPIED', 'MAINTENANCE'], default: 'AVAILABLE' }
});

// 3. Room Sub-Schema
const RoomSchema = new Schema({
  roomNumber: { type: String, required: true },
  roomType: { type: String, default: 'DOUBLE' },
  capacity: { type: Number, default: 2 },
  hasAC: { type: Boolean, default: true },
  monthlyRent: { type: Number, required: true },
  deposit: { type: Number, default: 7500 },
  beds: [BedSchema]
});

// Cloudinary Asset Model definition
export interface ICloudinaryAsset {
  publicId: string;
  url: string;
  secureUrl: string;
  format?: string;
  resourceType: 'image' | 'video' | 'raw';
  bytes?: number;
  width?: number;
  height?: number;
  folder: string;
  category: 'FACADE' | 'BEDROOM' | 'WASHROOM' | 'DINING' | 'COMMON_AREA' | 'FLOORPLAN' | 'DOCUMENT' | 'AMENITY';
  tags?: string[];
  isCover?: boolean;
  uploadedAt: Date;
}

export const CloudinaryAssetSchema = new Schema<ICloudinaryAsset>({
  publicId: { type: String, required: true },
  url: { type: String, required: true },
  secureUrl: { type: String, required: true },
  format: { type: String },
  resourceType: { type: String, enum: ['image', 'video', 'raw'], default: 'image' },
  bytes: { type: Number },
  width: { type: Number },
  height: { type: Number },
  folder: { type: String, default: 'hostelizer/properties' },
  category: { 
    type: String, 
    enum: ['FACADE', 'BEDROOM', 'WASHROOM', 'DINING', 'COMMON_AREA', 'FLOORPLAN', 'DOCUMENT', 'AMENITY'], 
    default: 'BEDROOM' 
  },
  tags: [{ type: String }],
  isCover: { type: Boolean, default: false },
  uploadedAt: { type: Date, default: Date.now }
});

// 4. Property Schema
export interface IProperty extends Document {
  name: string;
  description: string;
  genderPreference: 'BOYS' | 'GIRLS' | 'COED';
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PUBLISHED' | 'REJECTED';
  address: string;
  city: string;
  locality: string;
  pincode: string;
  monthlyRentStarting: number;
  foodIncluded: boolean;
  amenities: string[];
  images: { id?: string; url: string; isCover: boolean; category?: string }[];
  cloudinaryAssets?: ICloudinaryAsset[];
  rooms: any[];
  createdAt: Date;
}

const PropertySchema = new Schema<IProperty>({
  name: { type: String, required: true },
  description: { type: String },
  genderPreference: { type: String, enum: ['BOYS', 'GIRLS', 'COED'], default: 'BOYS' },
  status: { type: String, default: 'PUBLISHED' },
  address: { type: String, required: true },
  city: { type: String, default: 'Indore' },
  locality: { type: String, default: 'Vijay Nagar' },
  pincode: { type: String, default: '452010' },
  monthlyRentStarting: { type: Number, default: 7500 },
  foodIncluded: { type: Boolean, default: true },
  amenities: [{ type: String }],
  images: [{
    url: String,
    isCover: Boolean,
    category: String
  }],
  cloudinaryAssets: [CloudinaryAssetSchema],
  rooms: [RoomSchema],
  createdAt: { type: Date, default: Date.now }
});

export const PropertyModel = mongoose.models.Property || mongoose.model<IProperty>('Property', PropertySchema);

// 5. Resident Schema
export interface IResident extends Document {
  name: string;
  phone: string;
  email: string;
  bedCode: string;
  propertyName: string;
  monthlyRent: number;
  moveInDate: string;
  kycStatus: string;
  aadhaarNumber: string;
  emergencyContact: string;
  createdAt: Date;
}

const ResidentSchema = new Schema<IResident>({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  bedCode: { type: String, required: true },
  propertyName: { type: String, default: 'Sunrise Luxury Boys PG' },
  monthlyRent: { type: Number, default: 7500 },
  moveInDate: { type: String },
  kycStatus: { type: String, default: 'VERIFIED' },
  aadhaarNumber: { type: String, default: 'XXXX-XXXX-4812' },
  emergencyContact: { type: String, default: '+91 98000 00000' },
  createdAt: { type: Date, default: Date.now }
});

export const ResidentModel = mongoose.models.Resident || mongoose.model<IResident>('Resident', ResidentSchema);

// 6. Payment Transaction Schema
export interface IPayment extends Document {
  residentName: string;
  bedCode: string;
  amount: number;
  type: string;
  status: string;
  date: string;
  paymentMode: string;
  utrRef: string;
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  residentName: { type: String, required: true },
  bedCode: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, default: 'MONTHLY_RENT' },
  status: { type: String, default: 'SETTLED' },
  date: { type: String },
  paymentMode: { type: String, default: 'UPI' },
  utrRef: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const PaymentModel = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

// 7. Booking / Visit Request Schema (Student -> Property Visit & Bed Token Lock)
export interface IBooking extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userPhone: string;
  propertyId: mongoose.Types.ObjectId;
  propertyName: string;
  roomNumber?: string;
  bedCode?: string;
  bookingType: 'SCHEDULED_VISIT' | 'TOKEN_BOOKING' | 'INSTANT_LOCK';
  visitDate?: string;
  visitSlot?: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  tokenAmountPaid?: number;
  paymentRef?: string;
  createdAt: Date;
}

const BookingSchema = new Schema<IBooking>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userPhone: { type: String, required: true },
  propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
  propertyName: { type: String, required: true },
  roomNumber: { type: String },
  bedCode: { type: String },
  bookingType: { type: String, enum: ['SCHEDULED_VISIT', 'TOKEN_BOOKING', 'INSTANT_LOCK'], default: 'SCHEDULED_VISIT' },
  visitDate: { type: String },
  visitSlot: { type: String, default: '4:00 PM - 5:00 PM' },
  status: { type: String, enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'], default: 'PENDING' },
  tokenAmountPaid: { type: Number, default: 0 },
  paymentRef: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const BookingModel = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

// 8. Maintenance / Complaint Ticket Schema
export interface IMaintenanceTicket extends Document {
  propertyId: mongoose.Types.ObjectId;
  propertyName: string;
  residentName: string;
  bedCode: string;
  category: 'PLUMBING' | 'ELECTRICAL' | 'WIFI_INTERNET' | 'CLEANING' | 'FOOD_MESS' | 'CARPENTRY' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  issueDescription: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  resolvedAt?: Date;
  ownerRemarks?: string;
  createdAt: Date;
}

const MaintenanceTicketSchema = new Schema<IMaintenanceTicket>({
  propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
  propertyName: { type: String, required: true },
  residentName: { type: String, required: true },
  bedCode: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['PLUMBING', 'ELECTRICAL', 'WIFI_INTERNET', 'CLEANING', 'FOOD_MESS', 'CARPENTRY', 'OTHER'], 
    default: 'WIFI_INTERNET' 
  },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'], default: 'MEDIUM' },
  issueDescription: { type: String, required: true },
  status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], default: 'OPEN' },
  resolvedAt: { type: Date },
  ownerRemarks: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const MaintenanceTicketModel = mongoose.models.MaintenanceTicket || mongoose.model<IMaintenanceTicket>('MaintenanceTicket', MaintenanceTicketSchema);

// 9. Verified Review & Rating Schema (Social Proof & Trust Engine)
export interface IReview extends Document {
  propertyId: mongoose.Types.ObjectId;
  propertyName: string;
  residentName: string;
  ratingOverall: number; // 1 to 5
  cleanlinessScore: number;
  foodQualityScore: number;
  wifiScore: number;
  safetyScore: number;
  title: string;
  comment: string;
  isVerifiedTenant: boolean;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>({
  propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
  propertyName: { type: String, required: true },
  residentName: { type: String, required: true },
  ratingOverall: { type: Number, required: true, min: 1, max: 5 },
  cleanlinessScore: { type: Number, default: 5, min: 1, max: 5 },
  foodQualityScore: { type: Number, default: 4, min: 1, max: 5 },
  wifiScore: { type: Number, default: 5, min: 1, max: 5 },
  safetyScore: { type: Number, default: 5, min: 1, max: 5 },
  title: { type: String, required: true },
  comment: { type: String, required: true },
  isVerifiedTenant: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export const ReviewModel = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);

// 10. Notice / Announcement Board Schema
export interface INoticeBoard extends Document {
  propertyId: mongoose.Types.ObjectId;
  propertyName: string;
  title: string;
  content: string;
  category: 'FOOD_MENU' | 'EVENT' | 'MAINTENANCE_DOWNTIME' | 'REGULATION' | 'GENERAL';
  isImportant: boolean;
  postedBy: string;
  expiresAt?: Date;
  createdAt: Date;
}

const NoticeBoardSchema = new Schema<INoticeBoard>({
  propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
  propertyName: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['FOOD_MENU', 'EVENT', 'MAINTENANCE_DOWNTIME', 'REGULATION', 'GENERAL'], 
    default: 'GENERAL' 
  },
  isImportant: { type: Boolean, default: false },
  postedBy: { type: String, default: 'Property Manager' },
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

export const NoticeBoardModel = mongoose.models.NoticeBoard || mongoose.model<INoticeBoard>('NoticeBoard', NoticeBoardSchema);

// 11. Multi-Tenant Organisation (ORG) Schema
export interface IOrganisationMember {
  userId: string;
  name: string;
  email: string;
  role: 'ORG_ADMIN' | 'ORG_MANAGER' | 'ORG_STAFF';
  joinedAt: Date;
}

export interface IOrganisation extends Document {
  name: string;
  slug: string;
  legalName: string;
  registrationNumber?: string;
  panNumber?: string;
  gstNumber?: string;
  ownerId: string;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'ARCHIVED';
  members: IOrganisationMember[];
  domain?: string;
  address: string;
  city: string;
  isVerified: boolean;
  createdAt: Date;
}

const OrganisationSchema = new Schema<IOrganisation>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  legalName: { type: String, required: true },
  registrationNumber: { type: String },
  panNumber: { type: String },
  gstNumber: { type: String },
  ownerId: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'APPROVED', 'SUSPENDED', 'ARCHIVED'], 
    default: 'PENDING' 
  },
  members: [{
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, enum: ['ORG_ADMIN', 'ORG_MANAGER', 'ORG_STAFF'], default: 'ORG_STAFF' },
    joinedAt: { type: Date, default: Date.now }
  }],
  domain: { type: String },
  address: { type: String, required: true },
  city: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const OrganisationModel = mongoose.models.Organisation || mongoose.model<IOrganisation>('Organisation', OrganisationSchema);

// 12. System Audit & Activity Logs Schema (/log, /dashboard/logs)
export interface IAuditLog extends Document {
  timestamp: Date;
  userId?: string;
  userName?: string;
  userEmail?: string;
  orgId?: string;
  orgName?: string;
  action: string;
  resource: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  ipAddress?: string;
  details?: string;
}

const AuditLogSchema = new Schema<IAuditLog>({
  timestamp: { type: Date, default: Date.now, index: true },
  userId: { type: String },
  userName: { type: String },
  userEmail: { type: String },
  orgId: { type: String, index: true },
  orgName: { type: String },
  action: { type: String, required: true, index: true },
  resource: { type: String, required: true },
  status: { type: String, enum: ['SUCCESS', 'FAILURE', 'WARNING'], default: 'SUCCESS' },
  ipAddress: { type: String, default: '127.0.0.1' },
  details: { type: String }
});

export const AuditLogModel = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);



