import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'hostelizer-demo',
  api_key: process.env.CLOUDINARY_API_KEY || '987654321098765',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'demo_secret_key_mock_secure',
  secure: true
});

export default cloudinary;

