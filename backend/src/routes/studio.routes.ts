import { Router, Request, Response } from 'express';
import { db, DBProperty, DBRoom, DBBed } from '../store/memoryStore';

const router = Router();

// In-memory conversations store for live demo chat
interface ChatMessage {
  id: string;
  sender: 'customer' | 'owner';
  senderName: string;
  text: string;
  time: string;
}

interface ChatConversation {
  id: string;
  customerName: string;
  customerPhone: string;
  propertyName: string;
  propertyRoom: string;
  unreadCount: number;
  lastMessage: string;
  lastTime: string;
  messages: ChatMessage[];
}

let conversations: ChatConversation[] = [
  {
    id: 'conv-1',
    customerName: 'Aman Verma',
    customerPhone: '+91 91234 56780',
    propertyName: 'Sunrise Luxury Boys PG',
    propertyRoom: 'Room 101 (Double Sharing)',
    unreadCount: 1,
    lastMessage: 'Is dinner available on Sundays too?',
    lastTime: '10:42 AM',
    messages: [
      { id: 'm1', sender: 'customer', senderName: 'Aman Verma', text: 'Hi! I saw Bed 101-A available on Hostelizer.', time: '10:30 AM' },
      { id: 'm2', sender: 'owner', senderName: 'Rajesh Sharma', text: 'Yes Aman! Bed 101-A is ready for immediate move-in with AC.', time: '10:35 AM' },
      { id: 'm3', sender: 'customer', senderName: 'Aman Verma', text: 'Is dinner available on Sundays too?', time: '10:42 AM' }
    ]
  },
  {
    id: 'conv-2',
    customerName: 'Rohan Mehta',
    customerPhone: '+91 98765 12345',
    propertyName: 'Sunrise Luxury Boys PG',
    propertyRoom: 'Room 102 (Triple Sharing)',
    unreadCount: 0,
    lastMessage: 'Can I visit the property today at 5:00 PM?',
    lastTime: 'Yesterday',
    messages: [
      { id: 'm4', sender: 'customer', senderName: 'Rohan Mehta', text: 'Hello, what are the entry/exit curfew timings for students?', time: 'Yesterday' },
      { id: 'm5', sender: 'owner', senderName: 'Rajesh Sharma', text: 'Main gate closes at 10:30 PM. Biometric night access is provided.', time: 'Yesterday' },
      { id: 'm6', sender: 'customer', senderName: 'Rohan Mehta', text: 'Can I visit the property today at 5:00 PM?', time: 'Yesterday' }
    ]
  },
  {
    id: 'conv-3',
    customerName: 'Priya Sharma',
    customerPhone: '+91 99887 66554',
    propertyName: 'Stanza Prime Girls PG',
    propertyRoom: 'Room 201 (Double AC)',
    unreadCount: 0,
    lastMessage: 'Thank you Rajesh ji, token payment done.',
    lastTime: '2 days ago',
    messages: [
      { id: 'm7', sender: 'customer', senderName: 'Priya Sharma', text: 'Hi sir, is high-speed Wi-Fi stable for WFH calls?', time: '2 days ago' },
      { id: 'm8', sender: 'owner', senderName: 'Rajesh Sharma', text: 'Yes Priya, we have dual Airtel & Jio 300 Mbps fiber lines with 24/7 power backup.', time: '2 days ago' },
      { id: 'm9', sender: 'customer', senderName: 'Priya Sharma', text: 'Thank you Rajesh ji, token payment done.', time: '2 days ago' }
    ]
  }
];

// Get all conversations for owner
router.get('/chat/conversations', (req: Request, res: Response) => {
  res.json({ conversations });
});

// Post a reply from Owner
router.post('/chat/conversations/:id/reply', (req: Request, res: Response) => {
  const { id } = req.params;
  const { text } = req.body;

  const conv = conversations.find(c => c.id === id);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  const newMsg: ChatMessage = {
    id: 'm_' + Date.now(),
    sender: 'owner',
    senderName: 'Rajesh Sharma (Owner)',
    text: text || 'Thank you for reaching out!',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  conv.messages.push(newMsg);
  conv.lastMessage = newMsg.text;
  conv.lastTime = newMsg.time;
  conv.unreadCount = 0;

  res.json({ message: 'Message sent', conversation: conv });
});

// Create full property listing with images, video, amenities, and room/bed config
router.post('/properties/create-full', (req: Request, res: Response) => {
  const {
    name,
    description,
    genderPreference,
    address,
    city,
    locality,
    pincode,
    startingRent,
    foodIncluded,
    videoUrl,
    images,
    amenities,
    rooms
  } = req.body;

  const propId = 'prop_' + Date.now();
  const ownerProfileId = 'owner-profile-1';

  // Process rooms & auto-generate individual beds
  const processedRooms: DBRoom[] = (rooms || []).map((r: any, rIdx: number) => {
    const roomId = `room_${propId}_${rIdx + 1}`;
    const cap = parseInt(r.capacity) || 2;
    const letters = ['A', 'B', 'C', 'D'];
    const beds: DBBed[] = [];

    for (let b = 0; b < cap; b++) {
      beds.push({
        id: `bed_${roomId}_${letters[b] || b + 1}`,
        roomId: roomId,
        bedCode: `${r.roomNumber || 100 + rIdx + 1}-${letters[b] || b + 1}`,
        status: 'AVAILABLE'
      });
    }

    return {
      id: roomId,
      propertyId: propId,
      roomNumber: r.roomNumber || String(101 + rIdx),
      roomType: r.roomType || 'DOUBLE',
      capacity: cap,
      hasAC: !!r.hasAC,
      monthlyRent: parseFloat(r.monthlyRent) || parseFloat(startingRent) || 7500,
      deposit: parseFloat(r.deposit) || parseFloat(r.monthlyRent) || 7500,
      beds
    };
  });

  const formattedImages = (images && images.length > 0)
    ? images.map((url: string, idx: number) => ({
        id: `img_${propId}_${idx}`,
        url,
        isCover: idx === 0,
        category: 'ROOM'
      }))
    : [
        { id: `img_${propId}_default`, url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80', isCover: true, category: 'ROOM' }
      ];

  const newProperty: DBProperty = {
    id: propId,
    ownerProfileId,
    name: name || 'Premier Co-Living Space',
    description: description || 'Equipped with all amenities, high-speed Wi-Fi and nutritious meals.',
    genderPreference: genderPreference || 'BOYS',
    status: 'PUBLISHED', // Instant demo publication
    address: address || 'Main Road',
    city: city || 'Indore',
    locality: locality || 'Vijay Nagar',
    pincode: pincode || '452010',
    latitude: 22.75,
    longitude: 75.89,
    monthlyRentStarting: parseFloat(startingRent) || 7500,
    foodIncluded: !!foodIncluded,
    amenities: amenities || ['Wi-Fi', 'Air Conditioning', 'Power Backup', 'Meals Included'],
    images: formattedImages,
    rooms: processedRooms.length > 0 ? processedRooms : [
      {
        id: `room_${propId}_default`,
        propertyId: propId,
        roomNumber: '101',
        roomType: 'DOUBLE',
        capacity: 2,
        hasAC: true,
        monthlyRent: parseFloat(startingRent) || 7500,
        deposit: parseFloat(startingRent) || 7500,
        beds: [
          { id: `bed_${propId}_101A`, roomId: `room_${propId}_default`, bedCode: '101-A', status: 'AVAILABLE' },
          { id: `bed_${propId}_101B`, roomId: `room_${propId}_default`, bedCode: '101-B', status: 'AVAILABLE' }
        ]
      }
    ],
    createdAt: new Date()
  };

  db.properties.unshift(newProperty);

  res.status(201).json({
    message: 'Property listing published successfully to marketplace!',
    property: newProperty
  });
});

export default router;

