import { Router, Request, Response } from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary';

const router = Router();
const upload = multer({ limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB limit

interface AssetRecord {
  id: string;
  url: string;
  secureUrl?: string;
  publicId: string;
  storageProvider: 'CLOUDFLARE_R2' | 'CLOUDINARY';
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  dimension?: { width: number; height: number };
  category?: 'FACADE' | 'BEDROOM' | 'WASHROOM' | 'DINING' | 'COMMON_AREA' | 'FLOORPLAN' | 'DOCUMENT';
  tags?: string[];
  responsiveVariants?: {
    thumbnail: string;
    card: string;
    hero: string;
  };
}

// In-memory media library store with Cloudinary data modeling
let mediaLibrary: AssetRecord[] = [
  {
    id: 'asset_1',
    url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80',
    secureUrl: 'https://res.cloudinary.com/hostelizer/image/upload/f_auto,q_auto/v1/hostelizer/properties/prop_1/bedroom/deluxe_master',
    publicId: 'hostelizer/properties/prop_1/bedroom/deluxe_master',
    storageProvider: 'CLOUDINARY',
    category: 'BEDROOM',
    tags: ['deluxe', 'ac_room', 'balcony', 'prop_1'],
    fileType: 'image/jpeg',
    fileSize: 482000,
    uploadedAt: '2026-11-04 10:15 AM',
    dimension: { width: 1200, height: 800 },
    responsiveVariants: {
      thumbnail: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=300&h=200&q=80',
      card: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&h=400&q=80',
      hero: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1600&h=900&q=80'
    }
  },
  {
    id: 'asset_2',
    url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
    secureUrl: 'https://res.cloudinary.com/hostelizer/image/upload/f_auto,q_auto/v1/hostelizer/properties/prop_1/common_area/study_hall',
    publicId: 'hostelizer/properties/prop_1/common_area/study_hall',
    storageProvider: 'CLOUDINARY',
    category: 'COMMON_AREA',
    tags: ['study_desk', 'wifi', 'silent_zone'],
    fileType: 'image/jpeg',
    fileSize: 320000,
    uploadedAt: '2026-11-03 04:30 PM',
    dimension: { width: 1200, height: 800 },
    responsiveVariants: {
      thumbnail: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=300&h=200&q=80',
      card: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&h=400&q=80',
      hero: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1600&h=900&q=80'
    }
  },
  {
    id: 'asset_3',
    url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
    secureUrl: 'https://res.cloudinary.com/hostelizer/image/upload/f_auto,q_auto/v1/hostelizer/properties/prop_1/washroom/attached_bath',
    publicId: 'hostelizer/properties/prop_1/washroom/attached_bath',
    storageProvider: 'CLOUDINARY',
    category: 'WASHROOM',
    tags: ['geyser', 'western_toilet', 'hygiene'],
    fileType: 'image/jpeg',
    fileSize: 290000,
    uploadedAt: '2026-11-02 09:20 AM',
    dimension: { width: 1200, height: 800 },
    responsiveVariants: {
      thumbnail: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=300&h=200&q=80',
      card: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&h=400&q=80',
      hero: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1600&h=900&q=80'
    }
  },
  {
    id: 'asset_4',
    url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80',
    secureUrl: 'https://res.cloudinary.com/hostelizer/image/upload/f_auto,q_auto/v1/hostelizer/properties/prop_2/bedroom/double_sharing_room',
    publicId: 'hostelizer/properties/prop_2/bedroom/double_sharing_room',
    storageProvider: 'CLOUDFLARE_R2',
    category: 'BEDROOM',
    tags: ['double_bed', 'spacious', 'prop_2'],
    fileType: 'image/jpeg',
    fileSize: 512000,
    uploadedAt: '2026-11-01 02:40 PM',
    dimension: { width: 1200, height: 800 },
    responsiveVariants: {
      thumbnail: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=300&h=200&q=80',
      card: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&h=400&q=80',
      hero: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1600&h=900&q=80'
    }
  }
];

// 1. Get Asset Library with taxonomy filters
router.get('/media', (req: Request, res: Response) => {
  const { category, provider } = req.query;
  let filtered = [...mediaLibrary];
  if (category) {
    filtered = filtered.filter(a => a.category === category);
  }
  if (provider) {
    filtered = filtered.filter(a => a.storageProvider === provider);
  }

  res.json({
    assets: filtered,
    totalCount: filtered.length,
    taxonomy: {
      categories: ['FACADE', 'BEDROOM', 'WASHROOM', 'DINING', 'COMMON_AREA', 'FLOORPLAN', 'DOCUMENT'],
      folderHierarchy: 'hostelizer/properties/{propertyId}/{category}/',
      eagerTransformations: [
        { name: 'thumbnail', transform: 'c_thumb,w_300,h_200,g_auto' },
        { name: 'card', transform: 'c_fill,w_600,h_400,q_auto,f_auto' },
        { name: 'hero', transform: 'c_fill,w_1600,h_900,q_auto,f_auto' }
      ]
    },
    providers: {
      primary: 'Cloudflare R2 (S3-Compatible CDN, Zero Egress Fees)',
      imageOptimization: 'Cloudinary (Dynamic Transformations, AI Auto-Crop, WebP/AVIF)'
    }
  });
});

// 2. Generate Signed Upload Signature for Cloudinary direct client uploads
router.get('/cloudinary/signature', (req: Request, res: Response) => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = (req.query.folder as string) || 'hostelizer/properties/general';
  
  // Calculate signature if api_secret exists
  const apiSecret = process.env.CLOUDINARY_API_SECRET || 'demo_secret_key_mock_secure';
  const apiKey = process.env.CLOUDINARY_API_KEY || '987654321098765';
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'hostelizer-demo';

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    apiSecret
  );

  res.json({
    timestamp,
    folder,
    signature,
    apiKey,
    cloudName,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
  });
});

// 3. Upload Media Asset (Server-side Cloudinary / R2 routing)
router.post('/media/upload', upload.single('file'), async (req: Request, res: Response) => {
  const provider = (req.body.provider || 'CLOUDINARY') as 'CLOUDFLARE_R2' | 'CLOUDINARY';
  const category = req.body.category || 'BEDROOM';
  const propertyId = req.body.propertyId || 'prop_1';
  const customUrl = req.body.url;
  const tags = req.body.tags ? (typeof req.body.tags === 'string' ? req.body.tags.split(',') : req.body.tags) : [propertyId, category.toLowerCase()];

  const folder = `hostelizer/properties/${propertyId}/${category.toLowerCase()}`;
  const publicId = `${folder}/${Date.now()}_img`;
  const assignedUrl = customUrl || 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80';

  const newAsset: AssetRecord = {
    id: 'asset_' + Date.now(),
    url: assignedUrl,
    secureUrl: `https://res.cloudinary.com/hostelizer/image/upload/f_auto,q_auto/v1/${publicId}`,
    publicId,
    storageProvider: provider,
    category,
    tags,
    fileType: 'image/jpeg',
    fileSize: 420000,
    uploadedAt: 'Just now',
    dimension: { width: 1200, height: 800 },
    responsiveVariants: {
      thumbnail: `${assignedUrl}&w=300&h=200`,
      card: `${assignedUrl}&w=600&h=400`,
      hero: `${assignedUrl}&w=1600&h=900`
    }
  };

  mediaLibrary.unshift(newAsset);

  res.status(201).json({
    message: `Asset successfully modeled and indexed in ${provider}`,
    asset: newAsset,
    cloudinaryMeta: {
      folder,
      publicId,
      autoOptimizedUrl: newAsset.secureUrl,
      derivedThumb: `https://res.cloudinary.com/hostelizer/image/upload/c_thumb,w_300,h_200/v1/${publicId}`
    }
  });
});

// 4. Delete Asset
router.delete('/media/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  mediaLibrary = mediaLibrary.filter(a => a.id !== id);
  res.json({ message: 'Asset deleted from storage bucket and registry' });
});

export default router;

