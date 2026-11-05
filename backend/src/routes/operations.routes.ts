import { Router, Request, Response } from 'express';

const router = Router();

export interface ResidentRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  bedCode: string;
  propertyName: string;
  monthlyRent: number;
  moveInDate: string;
  kycStatus: 'VERIFIED' | 'PENDING' | 'ACTION_REQUIRED';
  aadhaarNumber: string;
  emergencyContact: string;
}

export interface PaymentTransaction {
  id: string;
  residentName: string;
  bedCode: string;
  amount: number;
  type: 'TOKEN_RESERVATION' | 'MONTHLY_RENT' | 'SECURITY_DEPOSIT';
  status: 'SETTLED' | 'PENDING' | 'ESCROW';
  date: string;
  paymentMode: 'UPI' | 'NET_BANKING' | 'CREDIT_CARD';
  utrRef: string;
}

// In-memory data store for operations
let residents: ResidentRecord[] = [
  {
    id: 'res_1',
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
    id: 'res_2',
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
    id: 'res_3',
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
  },
  {
    id: 'res_4',
    name: 'Rohan Mehta',
    phone: '+91 98765 12345',
    email: 'rohan.m@techcorp.in',
    bedCode: '102-A',
    propertyName: 'Sunrise Luxury Boys PG',
    monthlyRent: 6500,
    moveInDate: '2026-11-05',
    kycStatus: 'PENDING',
    aadhaarNumber: 'XXXX-XXXX-7712',
    emergencyContact: '+91 98765 99887 (Mother)'
  }
];

let payments: PaymentTransaction[] = [
  {
    id: 'txn_101',
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
    id: 'txn_102',
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
    id: 'txn_103',
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
    id: 'txn_104',
    residentName: 'Harsh Vardhan',
    bedCode: '102-B',
    amount: 6500,
    type: 'MONTHLY_RENT',
    status: 'SETTLED',
    date: '2026-10-28',
    paymentMode: 'UPI',
    utrRef: 'UPI-RAZORPAY-771088'
  },
  {
    id: 'txn_105',
    residentName: 'Aman Verma',
    bedCode: '101-B',
    amount: 8500,
    type: 'MONTHLY_RENT',
    status: 'SETTLED',
    date: '2026-10-15',
    paymentMode: 'UPI',
    utrRef: 'UPI-RAZORPAY-112093'
  },
  {
    id: 'txn_106',
    residentName: 'Rohan Mehta',
    bedCode: '102-A',
    amount: 2000,
    type: 'TOKEN_RESERVATION',
    status: 'SETTLED',
    date: '2026-11-04',
    paymentMode: 'UPI',
    utrRef: 'UPI-RAZORPAY-440291'
  }
];

// GET: All residents
router.get('/residents', (req: Request, res: Response) => {
  res.json({ residents, count: residents.length });
});

// POST: Add new resident / check-in
router.post('/residents', (req: Request, res: Response) => {
  const { name, phone, email, bedCode, propertyName, monthlyRent, aadhaarNumber, emergencyContact } = req.body;

  if (!name || !phone || !bedCode) {
    return res.status(400).json({ error: 'Name, phone, and bed code are mandatory' });
  }

  const newRes: ResidentRecord = {
    id: 'res_' + Date.now(),
    name,
    phone,
    email: email || `${name.toLowerCase().replace(/\s+/g, '')}@student.edu`,
    bedCode,
    propertyName: propertyName || 'Sunrise Luxury Boys PG',
    monthlyRent: parseFloat(monthlyRent) || 7500,
    moveInDate: new Date().toISOString().split('T')[0],
    kycStatus: 'VERIFIED',
    aadhaarNumber: aadhaarNumber || 'XXXX-XXXX-' + Math.floor(1000 + Math.random() * 9000),
    emergencyContact: emergencyContact || '+91 98000 00000'
  };

  residents.unshift(newRes);
  res.status(201).json({ message: 'Resident registered and bed assigned', resident: newRes });
});

// DELETE: Check-out resident
router.delete('/residents/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const target = residents.find(r => r.id === id);
  if (!target) return res.status(404).json({ error: 'Resident not found' });

  residents = residents.filter(r => r.id !== id);
  res.json({ message: `Resident ${target.name} checked out. Bed ${target.bedCode} marked available.` });
});

// GET: All financial ledger records
router.get('/financials', (req: Request, res: Response) => {
  const totalTokens = payments.filter(p => p.type === 'TOKEN_RESERVATION').reduce((s, p) => s + p.amount, 0);
  const totalRentCollected = payments.filter(p => p.type === 'MONTHLY_RENT').reduce((s, p) => s + p.amount, 0);
  const totalSettled = payments.reduce((s, p) => s + p.amount, 0);

  res.json({
    payments,
    summary: {
      totalTokens,
      totalRentCollected,
      totalSettled,
      escrowDeposits: 85000,
      nextScheduledPayout: totalSettled * 0.98, // after 2% gateway cut
      payoutDate: '2026-11-05'
    }
  });
});

// POST: Record manual cash / UPI payment
router.post('/financials/record', (req: Request, res: Response) => {
  const { residentName, bedCode, amount, type, paymentMode } = req.body;

  const newTxn: PaymentTransaction = {
    id: 'txn_' + Date.now(),
    residentName: residentName || 'Resident',
    bedCode: bedCode || '101-A',
    amount: parseFloat(amount) || 2000,
    type: type || 'MONTHLY_RENT',
    status: 'SETTLED',
    date: new Date().toISOString().split('T')[0],
    paymentMode: paymentMode || 'UPI',
    utrRef: 'MANUAL-' + Date.now().toString().slice(-6)
  };

  payments.unshift(newTxn);
  res.status(201).json({ message: 'Payment entry recorded in ledger', transaction: newTxn });
});

export default router;

