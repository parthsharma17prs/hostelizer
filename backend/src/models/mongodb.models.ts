import mongoose, { Schema, Document } from 'mongoose';

// 1. User & Auth Schema
export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: 'CUSTOMER' | 'OWNER' | 'ADMIN' | 'VERIFICATION_ADMIN';
  ownerStatus?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['CUSTOMER', 'OWNER', 'ADMIN', 'VERIFICATION_ADMIN'], default: 'CUSTOMER' },
  ownerStatus: { type: String, default: 'APPROVED' },
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

