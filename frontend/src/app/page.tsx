'use client';
import React, { useState, useEffect } from 'react';
import { 
  Building2, Search, Sparkles, MapPin, ShieldCheck, Users, 
  Bed, CheckCircle2, Star, PlusCircle, Award, UserCheck, Zap,
  RefreshCw, LogOut, Phone, Mail, Check, LayoutDashboard,
  MessageSquare, Image as ImageIcon, Video, DollarSign, Calendar,
  TrendingUp, PieChart as PieChartIcon, CheckSquare, Clock, Send,
  Sliders, Eye, ArrowUpRight, ChevronRight, X, AlertCircle, Home,
  FolderOpen, CreditCard, UserPlus, Settings, FileText, UploadCloud,
  CheckCircle, ArrowRight, ShieldAlert, Sparkle, Cloud, Layers,
  Trash2, UserMinus, Plus, FileUp, AlertTriangle, ArrowLeft
} from 'lucide-react';

interface BedItem {
  id: string;
  bedCode: string;
  status: 'AVAILABLE' | 'HELD' | 'OCCUPIED' | 'MAINTENANCE';
}

interface RoomItem {
  id: string;
  roomNumber: string;
  roomType: string;
  capacity: number;
  hasAC: boolean;
  monthlyRent: number;
  beds: BedItem[];
}

interface Property {
  id: string;
  name: string;
  description: string;
  genderPreference: 'BOYS' | 'GIRLS' | 'COED';
  status: string;
  address: string;
  city: string;
  locality: string;
  monthlyRentStarting: number;
  foodIncluded: boolean;
  amenities: string[];
  images: { id: string; url: string; isCover: boolean }[];
  rooms: RoomItem[];
}

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

interface MediaAsset {
  id: string;
  url: string;
  publicId: string;
  storageProvider: 'CLOUDFLARE_R2' | 'CLOUDINARY';
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  dimension?: { width: number; height: number };
}

interface ResidentRecord {
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

interface PaymentTransaction {
  id: string;
  residentName: string;
  bedCode: string;
  amount: number;
  type: string;
  status: string;
  date: string;
  paymentMode: string;
  utrRef: string;
}

export default function App() {
  // Authentication & View States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  // Auth Screen Mode: 'login' | 'signup' | 'apply-approval' | 'portal'
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'apply-approval' | 'portal'>('login');
  const [authRole, setAuthRole] = useState<'OWNER' | 'CUSTOMER'>('OWNER');

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('rajesh@sunrisehostels.com');
  const [loginPassword, setLoginPassword] = useState('admin123');

  // Signup Form States
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    businessName: ''
  });

  // Owner Application for Approval Form States
  const [ownerApplication, setOwnerApplication] = useState({
    businessName: 'Sunrise Co-Living & Hostels',
    ownerName: 'Rajesh Sharma',
    contactNumber: '+91 98765 43210',
    propertyAddress: 'Plot 42, Scheme 54, Near Vijay Nagar Square, Indore',
    city: 'Indore',
    panNumber: 'ABCDE1234F',
    aadhaarNumber: '9876-5432-1098',
    propertyType: 'COMMERCIAL_PG_LEASE',
    bankAccountNumber: '98765432109876',
    ifscCode: 'HDFC0001234',
    documents: [
      { type: 'PAN_CARD', name: 'owner_pan_card.pdf', status: 'UPLOADED' },
      { type: 'PROPERTY_TAX_OR_LEASE', name: 'municipal_tax_receipt_2026.pdf', status: 'UPLOADED' },
      { type: 'AADHAAR_FRONT_BACK', name: 'aadhaar_card_verified.pdf', status: 'UPLOADED' }
    ],
    status: 'PENDING' as 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'
  });

  // Section Navigation inside Portal
  const [activeSection, setActiveSection] = useState<
    'dashboard' | 'listings' | 'add-listing' | 'assets' | 'chat' | 'residents' | 'financials'
  >('dashboard');
  
  // Search state inside Portal
  const [searchQuery, setSearchQuery] = useState('');

  // Listings State
  const [properties, setProperties] = useState<Property[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  // Asset Library State (Cloudflare R2 + Cloudinary)
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadUrlInput, setUploadUrlInput] = useState('');
  const [uploadProvider, setUploadProvider] = useState<'CLOUDFLARE_R2' | 'CLOUDINARY'>('CLOUDFLARE_R2');

  // Studio Chat States
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [chatReplyText, setChatReplyText] = useState('');

  // Residents State & Modal
  const [residents, setResidents] = useState<ResidentRecord[]>([]);
  const [showAddResidentModal, setShowAddResidentModal] = useState(false);
  const [newResidentForm, setNewResidentForm] = useState({
    name: '',
    phone: '',
    email: '',
    bedCode: '101-A',
    propertyName: 'Sunrise Luxury Boys PG',
    monthlyRent: '8500',
    aadhaarNumber: 'XXXX-XXXX-8921',
    emergencyContact: '+91 98111 44556'
  });

  // Financials State & Modal
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any>({
    totalTokens: 6000,
    totalRentCollected: 27500,
    totalSettled: 33500,
    escrowDeposits: 85000,
    nextScheduledPayout: 32830,
    payoutDate: '2026-11-05'
  });
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [newPaymentForm, setNewPaymentForm] = useState({
    residentName: 'Kavya Iyer',
    bedCode: '201-A',
    amount: '12500',
    type: 'MONTHLY_RENT',
    paymentMode: 'UPI'
  });

  // Add Listing Wizard States
  const [newProp, setNewProp] = useState({
    name: '',
    genderPreference: 'BOYS',
    city: 'Indore',
    locality: 'Vijay Nagar',
    address: '',
    pincode: '452010',
    startingRent: '7500',
    foodIncluded: true,
    videoUrl: 'https://youtube.com/watch?v=sample-hostel-tour',
    description: '',
    amenities: ['High-speed Wi-Fi', 'Air Conditioning', 'Meals Included', 'CCTV Security', 'Power Backup', 'Daily Housekeeping', 'Laundry'],
    images: [
      'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1000&q=80'
    ],
    roomNumber: '101',
    roomType: 'DOUBLE',
    capacity: 2,
    hasAC: true
  });

  // Kanban Leads State
  const [leads, setLeads] = useState([
    { id: 'l1', name: 'Rohan Mehta', phone: '+91 98765 12345', need: 'Single AC Room (Bhopal)', status: 'NEW_ENQUIRY', time: '10m ago' },
    { id: 'l2', name: 'Tanmay Saxena', phone: '+91 91234 56789', need: 'Double Sharing with Meals', status: 'NEW_ENQUIRY', time: '1h ago' },
    { id: 'l3', name: 'Aman Verma', phone: '+91 98223 34455', need: 'Scheduled Visit for 4:30 PM Tomorrow', status: 'VISIT_SCHEDULED', time: 'Today' },
    { id: 'l4', name: 'Siddharth Dave', phone: '+91 94250 88990', need: 'Scheduled Physical Inspection', status: 'VISIT_SCHEDULED', time: 'Oct 30' },
    { id: 'l5', name: 'Kavya Iyer', phone: '+91 99887 77665', need: 'Bed 201-A Confirmed (₹2,000 Token Paid)', status: 'CONVERTED', time: 'Yesterday' },
    { id: 'l6', name: 'Harsh Vardhan', phone: '+91 97766 55443', need: 'Bed 102-B Booked (Move-in Nov 10)', status: 'CONVERTED', time: 'Oct 28' },
  ]);

  const showNotify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch properties from backend
  const loadProperties = async () => {
    try {
      const res = await fetch('/api/properties');
      const data = await res.json();
      if (data.properties) {
        setProperties(data.properties);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch conversations
  const loadConversations = async () => {
    try {
      const res = await fetch('/api/studio/chat/conversations');
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
        if (!selectedConversation && data.conversations.length > 0) {
          setSelectedConversation(data.conversations[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Asset Management Library (Cloudflare R2 + Cloudinary)
  const loadAssets = async () => {
    try {
      const res = await fetch('/api/assets/media');
      const data = await res.json();
      if (data.assets) {
        setAssets(data.assets);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Residents
  const loadResidents = async () => {
    try {
      const res = await fetch('/api/operations/residents');
      const data = await res.json();
      if (data.residents) {
        setResidents(data.residents);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Financials
  const loadFinancials = async () => {
    try {
      const res = await fetch('/api/operations/financials');
      const data = await res.json();
      if (data.payments) {
        setPayments(data.payments);
        if (data.summary) setFinancialSummary(data.summary);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadProperties();
    loadConversations();
    loadAssets();
    loadResidents();
    loadFinancials();
  }, []);

  // One-click Demo Login
  const handleQuickDemoLogin = async (role: 'OWNER' | 'ADMIN' | 'CUSTOMER' = 'OWNER') => {
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        setToken(data.token);
        setIsLoggedIn(true);
        setAuthMode('portal');
        showNotify(`Welcome back, ${data.user.name}!`);
      }
    } catch (e) {
      alert('Login error');
    }
  };

  // Standard Login Submit
  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        setToken(data.token);
        setIsLoggedIn(true);
        setAuthMode('portal');
        showNotify(`Logged in successfully as ${data.user.name}`);
      } else {
        alert(data.error || 'Invalid credentials');
      }
    } catch (err) {
      alert('Login failed. Please check connection.');
    }
  };

  // Standard Signup Submit
  const handleStandardSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...signupForm,
          role: authRole
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        setToken(data.token);
        setIsLoggedIn(true);
        showNotify(`Registration successful! Welcome ${data.user.name}`);
        if (authRole === 'OWNER') {
          // Send to Application for Approval
          setAuthMode('apply-approval');
        } else {
          setAuthMode('portal');
        }
      } else {
        alert(data.error || 'Signup failed');
      }
    } catch (err) {
      alert('Registration error');
    }
  };

  // Submit Application for Approval
  const handleSubmitOwnerApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerApplication({ ...ownerApplication, status: 'UNDER_REVIEW' });
    showNotify('Application submitted for Super Admin review!');
  };

  // Admin / Instant Demo Approval Action
  const handleApproveApplication = () => {
    setOwnerApplication({ ...ownerApplication, status: 'APPROVED' });
    showNotify('Super Admin verified & approved your owner account!');
  };

  // Send message in Chat
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatReplyText.trim() || !selectedConversation) return;

    try {
      const res = await fetch(`/api/studio/chat/conversations/${selectedConversation.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chatReplyText })
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedConversation(data.conversation);
        setChatReplyText('');
        loadConversations();
        showNotify('Message dispatched to resident');
      }
    } catch (err) {
      alert('Failed to send reply');
    }
  };

  // Move Lead Status
  const moveLead = (leadId: string, newStatus: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    showNotify('Lead pipeline updated');
  };

  // Create Listing Submit
  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProp.name || !newProp.address) {
      alert('Please fill out Property Name and Address');
      return;
    }

    try {
      const res = await fetch('/api/studio/properties/create-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProp,
          rooms: [
            {
              roomNumber: newProp.roomNumber,
              roomType: newProp.roomType,
              capacity: newProp.capacity,
              hasAC: newProp.hasAC,
              monthlyRent: newProp.startingRent
            }
          ]
        })
      });

      const data = await res.json();
      if (res.ok) {
        showNotify('Listing verified & published to marketplace');
        loadProperties();
        setActiveSection('listings');
        setNewProp({
          ...newProp,
          name: '',
          address: '',
          description: ''
        });
      } else {
        alert(data.error || 'Failed to create listing');
      }
    } catch (e) {
      alert('Error creating listing');
    }
  };

  // Upload Asset (Cloudflare R2 / Cloudinary)
  const handleUploadAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/assets/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: uploadUrlInput || 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
          provider: uploadProvider
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotify(`Image uploaded to ${uploadProvider}!`);
        setShowUploadModal(false);
        setUploadUrlInput('');
        loadAssets();
      }
    } catch (err) {
      alert('Upload failed');
    }
  };

  // Delete Asset
  const handleDeleteAsset = async (id: string) => {
    if (!confirm('Are you sure you want to remove this asset from Cloudflare R2 bucket?')) return;
    try {
      const res = await fetch(`/api/assets/media/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotify('Asset deleted from storage bucket');
        loadAssets();
      }
    } catch (err) {
      alert('Deletion failed');
    }
  };

  // Add Resident Submit
  const handleAddResident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/operations/residents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newResidentForm)
      });
      const data = await res.json();
      if (res.ok) {
        showNotify(`Resident ${newResidentForm.name} checked in!`);
        setShowAddResidentModal(false);
        setNewResidentForm({
          name: '',
          phone: '',
          email: '',
          bedCode: '101-A',
          propertyName: 'Sunrise Luxury Boys PG',
          monthlyRent: '8500',
          aadhaarNumber: 'XXXX-XXXX-8921',
          emergencyContact: '+91 98111 44556'
        });
        loadResidents();
      }
    } catch (err) {
      alert('Failed to register resident');
    }
  };

  // Check out resident
  const handleCheckoutResident = async (id: string, name: string) => {
    if (!confirm(`Confirm check-out for ${name}? Bed will be freed back into inventory.`)) return;
    try {
      const res = await fetch(`/api/operations/residents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotify(`Resident ${name} checked out`);
        loadResidents();
      }
    } catch (err) {
      alert('Check-out failed');
    }
  };

  // Record Payment Submit
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/operations/financials/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPaymentForm)
      });
      const data = await res.json();
      if (res.ok) {
        showNotify(`Payment of ₹${newPaymentForm.amount} recorded!`);
        setShowAddPaymentModal(false);
        loadFinancials();
      }
    } catch (err) {
      alert('Failed to record payment');
    }
  };

  // Calculate Bed Stats for Pie Chart & Stats
  let totalBeds = 0;
  let occupiedBeds = 0;
  let availableBeds = 0;

  properties.forEach(p => {
    p.rooms?.forEach(r => {
      r.beds?.forEach(b => {
        totalBeds++;
        if (b.status === 'OCCUPIED') occupiedBeds++;
        else if (b.status === 'AVAILABLE') availableBeds++;
      });
    });
  });

  if (totalBeds === 0) {
    totalBeds = 14;
    occupiedBeds = 10;
    availableBeds = 4;
  }

  const occupancyRate = Math.round((occupiedBeds / totalBeds) * 100);

  // ================= 1. AUTH SCREEN: LOGIN / SIGNUP =================
  if (!isLoggedIn || authMode === 'login' || authMode === 'signup') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 flex flex-col justify-center items-center px-4 font-sans relative">
        {/* Toast Notification */}
        {notification && (
          <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl mx-auto flex items-center justify-center shadow-md shadow-emerald-200">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hostelizer Partner Portal</h1>
            <p className="text-xs text-slate-500">
              {authMode === 'login' ? 'Sign in to access your property management dashboard' : 'Create an account to list & manage your PG properties'}
            </p>
          </div>

          {/* Login / Signup Switcher Tab */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
                authMode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
                authMode === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Register Account
            </button>
          </div>

          {/* Quick Demo Access Box */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Instant Demo Access
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">1-Click</span>
            </div>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              Login immediately as pre-verified owner <strong>Rajesh Sharma</strong> with active properties & live residents.
            </p>
            <button
              onClick={() => handleQuickDemoLogin('OWNER')}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white" /> Launch Verified Partner Portal
            </button>
          </div>

          {/* LOGIN FORM */}
          {authMode === 'login' && (
            <form onSubmit={handleStandardLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Business Email</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition text-xs shadow-sm cursor-pointer"
              >
                Sign In with Email
              </button>
            </form>
          )}

          {/* SIGNUP FORM */}
          {authMode === 'signup' && (
            <form onSubmit={handleStandardSignup} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthRole('OWNER')}
                    className={`py-2 px-3 border rounded-lg font-semibold text-center cursor-pointer ${
                      authRole === 'OWNER' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    PG / Property Owner
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthRole('CUSTOMER')}
                    className={`py-2 px-3 border rounded-lg font-semibold text-center cursor-pointer ${
                      authRole === 'CUSTOMER' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    Student / Resident
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Rathore"
                  value={signupForm.name}
                  onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Business / Brand Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rathore Executive Stays"
                  value={signupForm.businessName}
                  onChange={(e) => setSignupForm({ ...signupForm, businessName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="vikram@rathore.in"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Mobile (OTP) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98230 11223"
                    value={signupForm.phone}
                    onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 8 characters"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition text-xs shadow-sm cursor-pointer mt-2"
              >
                Create Account &rarr;
              </button>
            </form>
          )}

          <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-Bit Encrypted Role-Based Security</span>
          </div>
        </div>
      </div>
    );
  }

  // ================= 2. OWNER APPLICATION FOR APPROVAL SCREEN =================
  if (authMode === 'apply-approval') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-4 py-8 font-sans">
        {/* Toast Notification */}
        {notification && (
          <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Step 2 of 2: Owner Verification
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  ownerApplication.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                  ownerApplication.status === 'UNDER_REVIEW' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  STATUS: {ownerApplication.status}
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-2">Owner Onboarding & Verification Application</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Submit identity verification and property authorization documents for Super Admin audit.
              </p>
            </div>
            <button
              onClick={() => setAuthMode('portal')}
              className="text-xs text-slate-400 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              Skip to Portal &rarr;
            </button>
          </div>

          {/* Verification Status Alert Box */}
          {ownerApplication.status === 'APPROVED' ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
              <div className="font-bold flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Owner Account Approved by Super Admin!
              </div>
              <p>Your business profile and property authorization deeds have been audited. You now have full access to publish listings and manage beds.</p>
              <button
                onClick={() => setAuthMode('portal')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg cursor-pointer"
              >
                Proceed to Owner Dashboard
              </button>
            </div>
          ) : ownerApplication.status === 'UNDER_REVIEW' ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
              <div className="font-bold flex items-center gap-2 text-amber-800">
                <Clock className="w-4 h-4 text-amber-600" /> Application Under Review
              </div>
              <p>Your documents are currently queued in the Super Admin verification portal. Estimated turnaround: 2-4 business hours.</p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleApproveApplication}
                  className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-3.5 h-3.5 fill-white" /> Demo: Instant Super Admin Approve
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('portal')}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Enter Portal Anyway
                </button>
              </div>
            </div>
          ) : null}

          {/* Form */}
          <form onSubmit={handleSubmitOwnerApplication} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Business / Trade Name *</label>
                <input
                  type="text"
                  required
                  value={ownerApplication.businessName}
                  onChange={(e) => setOwnerApplication({ ...ownerApplication, businessName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Owner Legal Name *</label>
                <input
                  type="text"
                  required
                  value={ownerApplication.ownerName}
                  onChange={(e) => setOwnerApplication({ ...ownerApplication, ownerName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">PAN Card Number *</label>
                <input
                  type="text"
                  required
                  value={ownerApplication.panNumber}
                  onChange={(e) => setOwnerApplication({ ...ownerApplication, panNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Aadhaar Card Reference *</label>
                <input
                  type="text"
                  required
                  value={ownerApplication.aadhaarNumber}
                  onChange={(e) => setOwnerApplication({ ...ownerApplication, aadhaarNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Primary Property Location Address *</label>
              <input
                type="text"
                required
                value={ownerApplication.propertyAddress}
                onChange={(e) => setOwnerApplication({ ...ownerApplication, propertyAddress: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            {/* Document Upload Roster */}
            <div className="pt-2">
              <label className="block text-slate-700 font-bold mb-2">Supporting Verification Documents</label>
              <div className="space-y-2">
                {ownerApplication.documents.map((doc, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <div>
                        <div className="font-semibold text-slate-800">{doc.type.replace(/_/g, ' ')}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{doc.name}</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                      ✓ READY FOR AUDIT
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setAuthMode('portal')}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Go to Portal
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <FileUp className="w-4 h-4" /> Submit Application for Approval
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ================= 3. BRIGHT ENTERPRISE PARTNER PORTAL =================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Upload Modal (Cloudflare R2 / Cloudinary) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-emerald-600" /> Upload Image Asset
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadAsset} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Target Storage Bucket</label>
                <select
                  value={uploadProvider}
                  onChange={(e) => setUploadProvider(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                >
                  <option value="CLOUDFLARE_R2">Cloudflare R2 (hostelizer-assets-prod)</option>
                  <option value="CLOUDINARY">Cloudinary Edge Optimizer</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Image URL / S3 Source Link</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={uploadUrlInput}
                  onChange={(e) => setUploadUrlInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" /> Upload Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Resident Modal */}
      {showAddResidentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" /> Check-in New Resident
              </h3>
              <button onClick={() => setShowAddResidentModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddResident} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Deepesh Joshi"
                    value={newResidentForm.name}
                    onChange={(e) => setNewResidentForm({ ...newResidentForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Contact Mobile *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98220 11223"
                    value={newResidentForm.phone}
                    onChange={(e) => setNewResidentForm({ ...newResidentForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Allocated Bed Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="101-A"
                    value={newResidentForm.bedCode}
                    onChange={(e) => setNewResidentForm({ ...newResidentForm, bedCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Agreed Monthly Rent (₹)</label>
                  <input
                    type="number"
                    value={newResidentForm.monthlyRent}
                    onChange={(e) => setNewResidentForm({ ...newResidentForm, monthlyRent: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddResidentModal(false)}
                  className="px-3 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Confirm Check-in
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" /> Record Offline / Cash Rent
              </h3>
              <button onClick={() => setShowAddPaymentModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Resident Name</label>
                <input
                  type="text"
                  required
                  value={newPaymentForm.residentName}
                  onChange={(e) => setNewPaymentForm({ ...newPaymentForm, residentName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Bed Code</label>
                  <input
                    type="text"
                    value={newPaymentForm.bedCode}
                    onChange={(e) => setNewPaymentForm({ ...newPaymentForm, bedCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={newPaymentForm.amount}
                    onChange={(e) => setNewPaymentForm({ ...newPaymentForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Payment Mode</label>
                <select
                  value={newPaymentForm.paymentMode}
                  onChange={(e) => setNewPaymentForm({ ...newPaymentForm, paymentMode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                >
                  <option value="UPI">UPI Direct / QR</option>
                  <option value="CASH">Cash Deposit</option>
                  <option value="NET_BANKING">Net Banking / IMPS</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(false)}
                  className="px-3 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Application Bar */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveSection('dashboard')}>
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Hostelizer <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-bold">Partner</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Interactive Search */}
        <div className="hidden md:flex items-center bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 w-80 text-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
          <input
            type="text"
            placeholder="Search residents, beds, bookings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 w-full"
          />
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSection('add-listing')}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add Property Listing
          </button>

          <button
            onClick={() => setAuthMode('apply-approval')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" /> Verification Status
          </button>

          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg py-1 px-3">
            <div className="w-6 h-6 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center font-bold text-xs">
              RS
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800">{currentUser?.name || 'Rajesh Sharma'}</span>
              <span className="text-[10px] text-slate-500 font-medium">Verified Landlord</span>
            </div>
            <button
              onClick={() => {
                setIsLoggedIn(false);
                setAuthMode('login');
              }}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-600 transition ml-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Layout: Left Sidebar + Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Bar */}
        <aside className="w-16 sm:w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-3 sm:p-4">
          <div className="space-y-1">
            <div className="px-3 py-1.5 hidden sm:block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Property Operations
            </div>

            <button
              onClick={() => setActiveSection('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeSection === 'dashboard'
                  ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 flex-shrink-0 text-slate-500" />
              <span className="hidden sm:inline">Dashboard & Analytics</span>
            </button>

            <button
              onClick={() => setActiveSection('listings')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeSection === 'listings'
                  ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4 flex-shrink-0 text-slate-500" />
              <span className="hidden sm:inline">Hostel Properties</span>
            </button>

            <button
              onClick={() => setActiveSection('add-listing')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeSection === 'add-listing'
                  ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-4 h-4 flex-shrink-0 text-slate-500" />
              <span className="hidden sm:inline">Add Listing Wizard</span>
            </button>

            <button
              onClick={() => setActiveSection('assets')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeSection === 'assets'
                  ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <FolderOpen className="w-4 h-4 flex-shrink-0 text-slate-500" />
              <span className="hidden sm:inline">Cloudflare R2 Assets</span>
            </button>

            <div className="pt-3 hidden sm:block">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tenant Relations
              </div>
            </div>

            <button
              onClick={() => setActiveSection('chat')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeSection === 'chat'
                  ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 flex-shrink-0 text-slate-500" />
                <span className="hidden sm:inline">Tenant Inquiries</span>
              </div>
              <span className="hidden sm:inline bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {conversations.reduce((acc, c) => acc + c.unreadCount, 0)}
              </span>
            </button>

            <button
              onClick={() => setActiveSection('residents')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeSection === 'residents'
                  ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 flex-shrink-0 text-slate-500" />
              <span className="hidden sm:inline">Active Residents</span>
            </button>

            <button
              onClick={() => setActiveSection('financials')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeSection === 'financials'
                  ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4 flex-shrink-0 text-slate-500" />
              <span className="hidden sm:inline">Rent & Payments</span>
            </button>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hidden sm:block space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="w-4 h-4" /> Verified Compliance
            </div>
            <p className="text-[11px] text-slate-600 leading-tight">
              {ownerApplication.businessName}
            </p>
            <div className="text-[10px] text-slate-400">
              Status: <span className="text-emerald-700 font-bold">{ownerApplication.status}</span>
            </div>
            <button
              onClick={() => setAuthMode('apply-approval')}
              className="text-[10px] text-emerald-600 hover:underline font-semibold block pt-1 cursor-pointer"
            >
              View Verification Deed &rarr;
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50/60">
          {/* ================= 2.1 DASHBOARD VIEW ================= */}
          {activeSection === 'dashboard' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Performance & Occupancy Overview</h1>
                  <p className="text-xs text-slate-500 mt-1">Live tracking of room occupancy, lead pipelines, and monthly collection value.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setActiveSection('add-listing')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" /> Add Property Listing
                  </button>
                </div>
              </div>

              {/* KPI Metrics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div 
                  onClick={() => setActiveSection('listings')}
                  className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs cursor-pointer hover:border-emerald-300 transition"
                >
                  <div className="flex justify-between items-center text-slate-500 text-xs font-medium">
                    <span>Occupancy Rate</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{occupancyRate}%</div>
                  <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                    {occupiedBeds} of {totalBeds} total beds filled &rarr;
                  </div>
                </div>

                <div 
                  onClick={() => setActiveSection('listings')}
                  className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs cursor-pointer hover:border-emerald-300 transition"
                >
                  <div className="flex justify-between items-center text-slate-500 text-xs font-medium">
                    <span>Vacant Beds</span>
                    <Bed className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-emerald-600">{availableBeds} Beds</div>
                  <div className="text-[11px] text-slate-500 mt-1">Ready for immediate move-in &rarr;</div>
                </div>

                <div 
                  onClick={() => setActiveSection('financials')}
                  className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs cursor-pointer hover:border-blue-300 transition"
                >
                  <div className="flex justify-between items-center text-slate-500 text-xs font-medium">
                    <span>Monthly Booking Value</span>
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">₹1,18,000</div>
                  <div className="text-[11px] text-slate-500 mt-1">View financial ledger &rarr;</div>
                </div>

                <div 
                  onClick={() => setActiveSection('residents')}
                  className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs cursor-pointer hover:border-amber-300 transition"
                >
                  <div className="flex justify-between items-center text-slate-500 text-xs font-medium">
                    <span>Active Residents</span>
                    <Users className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-amber-600">{residents.length} Students</div>
                  <div className="text-[11px] text-slate-500 mt-1">Manage tenant KYC &rarr;</div>
                </div>
              </div>

              {/* Occupancy Pie Chart & System Health */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4 text-emerald-600" />
                        Live Bed Capacity Allocation
                      </h3>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">Real-Time</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Current distribution of occupied beds vs available slots.</p>
                  </div>

                  <div className="py-6 flex items-center justify-center gap-6">
                    <div className="relative w-36 h-36">
                      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        <path
                          className="text-slate-100"
                          strokeWidth="3.8"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-emerald-500"
                          strokeDasharray={`${occupancyRate}, 100`}
                          strokeWidth="4"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-bold text-slate-900">{occupancyRate}%</span>
                        <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Occupied</span>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <div>
                          <div className="font-semibold text-slate-800">Occupied ({occupiedBeds} Beds)</div>
                          <div className="text-[10px] text-slate-500">{occupancyRate}% Total Capacity</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-200" />
                        <div>
                          <div className="font-semibold text-slate-700">Vacant ({availableBeds} Beds)</div>
                          <div className="text-[10px] text-slate-500">{100 - occupancyRate}% Move-in Ready</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
                    <span>Total Bed Capacity: <strong className="text-slate-800">{totalBeds} Beds</strong></span>
                    <button onClick={() => setActiveSection('listings')} className="text-emerald-600 font-semibold hover:underline cursor-pointer">
                      View Room Details &rarr;
                    </button>
                  </div>
                </div>

                {/* Operations & Invariants Checklist */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Platform Security & Asset Invariant Status
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Automated compliance checks ensuring verified student bookings.</p>
                  </div>

                  <div className="space-y-3 my-4">
                    <div 
                      onClick={() => showNotify('Atomic bed reservation lock verified: PASS')}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <div>
                          <div className="font-semibold text-slate-800">Transactional Double-Booking Shield</div>
                          <div className="text-[10px] text-slate-500">Atomic bed-level locking prevents overlapping token payments</div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">ACTIVE</span>
                    </div>

                    <div 
                      onClick={() => setActiveSection('assets')}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <div>
                          <div className="font-semibold text-slate-800">Cloudflare R2 Asset CDN Pipeline</div>
                          <div className="text-[10px] text-slate-500">Zero egress fee multi-angle photo and floor plan delivery</div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">CONNECTED</span>
                    </div>

                    <div 
                      onClick={() => setAuthMode('apply-approval')}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <div>
                          <div className="font-semibold text-slate-800">Owner Verification & Tax Deed Audit</div>
                          <div className="text-[10px] text-slate-500">Super Admin KYC and Aadhaar approval on record</div>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        {ownerApplication.status}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                    <span>Hostel Rating: <strong className="text-amber-600">4.9 ★ (42 Verified Resident Reviews)</strong></span>
                    <span className="text-slate-400 font-mono text-[10px]">Hostelizer Enterprise v2.4</span>
                  </div>
                </div>
              </div>

              {/* Kanban Lead Pipeline */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-600" />
                      Student Inquiries & Visit Pipeline (Kanban Board)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Progress prospective students from initial inquiry to scheduled visit and move-in.</p>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    Total Active Pipeline: {leads.length} Students
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Column 1: New Enquiries */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-3">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span> New Inquiries
                      </span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px]">
                        {leads.filter(l => l.status === 'NEW_ENQUIRY').length}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {leads.filter(l => l.status === 'NEW_ENQUIRY').map(lead => (
                        <div key={lead.id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-1.5">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-slate-900">{lead.name}</span>
                            <span className="text-[10px] text-slate-400">{lead.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-600">{lead.need}</p>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400">{lead.phone}</span>
                            <button
                              onClick={() => moveLead(lead.id, 'VISIT_SCHEDULED')}
                              className="text-[10px] px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold rounded cursor-pointer"
                            >
                              Schedule Visit &rarr;
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 2: Scheduled Visits */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-3">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span> Visits Scheduled
                      </span>
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px]">
                        {leads.filter(l => l.status === 'VISIT_SCHEDULED').length}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {leads.filter(l => l.status === 'VISIT_SCHEDULED').map(lead => (
                        <div key={lead.id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-1.5">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-slate-900">{lead.name}</span>
                            <span className="text-[10px] text-amber-600 font-bold">Upcoming</span>
                          </div>
                          <p className="text-[11px] text-slate-600">{lead.need}</p>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400">{lead.phone}</span>
                            <button
                              onClick={() => moveLead(lead.id, 'CONVERTED')}
                              className="text-[10px] px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold rounded cursor-pointer"
                            >
                              Confirm Move-in &rarr;
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Converted / Booked */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-3">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Converted & Booked
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px]">
                        {leads.filter(l => l.status === 'CONVERTED').length}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {leads.filter(l => l.status === 'CONVERTED').map(lead => (
                        <div key={lead.id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-1.5">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-slate-900">{lead.name}</span>
                            <span className="text-[10px] text-emerald-600 font-bold">Token Confirmed</span>
                          </div>
                          <p className="text-[11px] text-slate-600">{lead.need}</p>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                            <span>{lead.phone}</span>
                            <span className="text-emerald-700 font-semibold">✓ Move-in Ready</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= 2.2 PROPERTIES LISTING VIEW ================= */}
          {activeSection === 'listings' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Your Hostel Properties</h1>
                  <p className="text-xs text-slate-500 mt-1">Live room configurations, pricing & bed inventory across your properties.</p>
                </div>
                <button
                  onClick={() => setActiveSection('add-listing')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" /> Add Property Listing
                </button>
              </div>

              <div className="space-y-4">
                {properties.map(p => (
                  <div key={p.id} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div className="flex gap-4 items-center">
                        <img
                          src={p.images?.[0]?.url || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=400&q=80'}
                          alt={p.name}
                          className="w-24 h-24 rounded-xl object-cover flex-shrink-0 border border-slate-200"
                        />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {p.genderPreference} HOSTEL
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              STATUS: {p.status}
                            </span>
                          </div>
                          <h2 className="text-base font-bold text-slate-900">{p.name}</h2>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" /> {p.address}, {p.locality}, {p.city}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-400">Monthly Rent Starting</div>
                        <div className="text-xl font-bold text-slate-900">₹{p.monthlyRentStarting.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Room & Bed Inventory Matrix */}
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Bed className="w-3.5 h-3.5 text-emerald-600" /> Room & Bed Inventory Matrix
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {p.rooms?.map(room => (
                          <div key={room.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <div className="flex justify-between items-center text-xs mb-2">
                              <span className="font-bold text-slate-800">Room {room.roomNumber} ({room.roomType} Sharing)</span>
                              <span className="text-emerald-700 font-bold">₹{room.monthlyRent.toLocaleString()}/mo</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {room.beds?.map(bed => (
                                <div
                                  key={bed.id}
                                  onClick={() => showNotify(`Bed ${bed.bedCode}: Status is ${bed.status}`)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 border cursor-pointer ${
                                    bed.status === 'AVAILABLE'
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                                      : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${bed.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                  <span>Bed {bed.bedCode}</span>
                                  <span className="opacity-75 font-normal">({bed.status})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= 2.3 ADD LISTING WIZARD ================= */}
          {activeSection === 'add-listing' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <PlusCircle className="w-6 h-6 text-emerald-600" />
                  Property Onboarding & Listing Creator
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Connect Cloudflare R2 images, video tours, amenities, and automatic room/bed configuration.
                </p>
              </div>

              <form onSubmit={handleCreateListing} className="space-y-6 bg-white border border-slate-200 p-6 sm:p-8 rounded-2xl shadow-sm">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> 1. Property Essentials
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Property Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Royal Crown Luxury Boys PG"
                        value={newProp.name}
                        onChange={(e) => setNewProp({ ...newProp, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Gender Accommodation *</label>
                      <select
                        value={newProp.genderPreference}
                        onChange={(e) => setNewProp({ ...newProp, genderPreference: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                      >
                        <option value="BOYS">Boys Hostel / PG</option>
                        <option value="GIRLS">Girls Hostel / PG</option>
                        <option value="COED">Co-Ed / Unisex Living</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">City</label>
                      <input
                        type="text"
                        value={newProp.city}
                        onChange={(e) => setNewProp({ ...newProp, city: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Locality / Landmark</label>
                      <input
                        type="text"
                        value={newProp.locality}
                        onChange={(e) => setNewProp({ ...newProp, locality: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-700 font-medium mb-1">Street Address *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Plot 14, Ring Road, Near Prestige College"
                        value={newProp.address}
                        onChange={(e) => setNewProp({ ...newProp, address: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                    <Cloud className="w-4 h-4" /> 2. Cloudflare R2 & Video Media
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        Video Tour Walkthrough URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://youtube.com/watch?v=..."
                          value={newProp.videoUrl}
                          onChange={(e) => setNewProp({ ...newProp, videoUrl: e.target.value })}
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                        <button 
                          type="button" 
                          onClick={() => showNotify('Opening video preview link...')}
                          className="px-3 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Video className="w-3.5 h-3.5 text-slate-600" /> Preview
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-2">
                        High-Resolution Room Photos ({newProp.images.length} URLs configured)
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {newProp.images.map((img, i) => (
                          <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200">
                            <img src={img} alt="Preview" className="w-full h-24 object-cover" />
                            <div className="absolute top-1 right-1 bg-black/60 text-[10px] px-1.5 py-0.5 rounded text-white font-medium">
                              Photo #{i + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" /> 3. Amenities & Inclusions
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    {['High-speed Wi-Fi', 'Air Conditioning', 'Meals Included', 'CCTV Security', 'Power Backup', 'Daily Housekeeping', 'Laundry', 'Gym', 'Biometric Access', 'Geyser'].map((am) => {
                      const isSelected = newProp.amenities.includes(am);
                      return (
                        <button
                          key={am}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setNewProp({ ...newProp, amenities: newProp.amenities.filter(a => a !== am) });
                            } else {
                              setNewProp({ ...newProp, amenities: [...newProp.amenities, am] });
                            }
                          }}
                          className={`p-2.5 rounded-lg border text-left font-medium transition flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-semibold'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          <span>{am}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                    <Bed className="w-4 h-4" /> 4. Room Configuration & Bed Inventory
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Room Number</label>
                      <input
                        type="text"
                        value={newProp.roomNumber}
                        onChange={(e) => setNewProp({ ...newProp, roomNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Sharing Type</label>
                      <select
                        value={newProp.roomType}
                        onChange={(e) => setNewProp({ ...newProp, roomType: e.target.value, capacity: e.target.value === 'SINGLE' ? 1 : e.target.value === 'DOUBLE' ? 2 : 3 })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                      >
                        <option value="SINGLE">Single Private (1 Bed)</option>
                        <option value="DOUBLE">Double Sharing (2 Beds)</option>
                        <option value="TRIPLE">Triple Sharing (3 Beds)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Monthly Rent (₹)</label>
                      <input
                        type="number"
                        value={newProp.startingRent}
                        onChange={(e) => setNewProp({ ...newProp, startingRent: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Air Conditioning</label>
                      <select
                        value={newProp.hasAC ? 'YES' : 'NO'}
                        onChange={(e) => setNewProp({ ...newProp, hasAC: e.target.value === 'YES' })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                      >
                        <option value="YES">Yes, AC Included</option>
                        <option value="NO">Non-AC Room</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                    💡 <strong>Automatic Bed Engine:</strong> Beds <code>{newProp.roomNumber}-A</code> and <code>{newProp.roomNumber}-B</code> will be provisioned automatically with independent database state trackers.
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Publish Property to Marketplace
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= 2.4 CLOUDFLARE R2 ASSETS ================= */}
          {activeSection === 'assets' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <FolderOpen className="w-6 h-6 text-emerald-600" />
                    Cloud Storage & Asset Management
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Integrated with <strong>Cloudflare R2</strong> (zero egress fee CDN) and <strong>Cloudinary</strong> for on-the-fly thumbnail compression.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" /> Upload Asset to R2
                  </button>
                </div>
              </div>

              {/* Storage Providers Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Cloud className="w-4 h-4 text-orange-500" /> Cloudflare R2 Storage
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">CONNECTED</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    S3-compatible bucket storing high-resolution original images, 360-degree room tours, and KYC verification deeds.
                  </p>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-500" /> Cloudinary Edge Optimizer
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">CONNECTED</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Delivers auto-compressed WebP format thumbnails with dynamic responsive cropping for mobile clients.
                  </p>
                </div>
              </div>

              {/* Assets Grid */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Stored Property Media Assets ({assets.length})</h3>
                  <button
                    onClick={() => {
                      showNotify('Syncing with Cloudflare R2 bucket...');
                      loadAssets();
                    }}
                    className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh Assets
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {assets.map(asset => (
                    <div key={asset.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 group">
                      <div className="relative h-40 overflow-hidden bg-slate-200">
                        <img
                          src={asset.url}
                          alt="Asset"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute top-2 left-2 bg-black/60 text-[10px] text-white px-2 py-0.5 rounded font-mono">
                          {asset.storageProvider}
                        </div>
                        <button
                          onClick={() => handleDeleteAsset(asset.id)}
                          title="Delete from R2"
                          className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-3 text-xs space-y-1">
                        <div className="font-semibold text-slate-800 truncate" title={asset.publicId}>
                          {asset.publicId.split('/').pop()}
                        </div>
                        <div className="text-[10px] text-slate-400 flex justify-between">
                          <span>{asset.dimension?.width}x{asset.dimension?.height}</span>
                          <span>{Math.round(asset.fileSize / 1024)} KB</span>
                        </div>
                        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200 flex justify-between items-center">
                          <span>{asset.uploadedAt}</span>
                          <span className="text-emerald-700 font-bold">✓ Synced</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= 2.5 RESIDENT CHATS VIEW ================= */}
          {activeSection === 'chat' && (
            <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row">
              <div className="w-full md:w-80 border-r border-slate-200 flex flex-col bg-slate-50">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    Resident Inquiries ({conversations.length})
                  </h2>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Live</span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
                  {conversations.map(conv => {
                    const isSelected = selectedConversation?.id === conv.id;
                    return (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv)}
                        className={`p-3.5 cursor-pointer transition ${
                          isSelected ? 'bg-white border-l-4 border-emerald-600 shadow-2xs' : 'hover:bg-white/80'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-slate-900">{conv.customerName}</span>
                          <span className="text-[10px] text-slate-400">{conv.lastTime}</span>
                        </div>
                        <div className="text-[11px] text-emerald-700 font-medium truncate mt-0.5">
                          {conv.propertyRoom}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-1">{conv.lastMessage}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedConversation ? (
                <div className="flex-1 flex flex-col justify-between bg-white">
                  <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        {selectedConversation.customerName}
                        <span className="text-[10px] text-slate-400 font-normal">{selectedConversation.customerPhone}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Inquiry regarding: <strong className="text-emerald-700">{selectedConversation.propertyName}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
                    {selectedConversation.messages.map(msg => {
                      const isOwner = msg.sender === 'owner';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isOwner ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-md px-4 py-2.5 rounded-2xl text-xs ${
                              isOwner
                                ? 'bg-emerald-600 text-white rounded-br-none shadow-xs'
                                : 'bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-2xs'
                            }`}
                          >
                            <div className={`text-[9px] font-bold mb-0.5 ${isOwner ? 'text-emerald-100' : 'text-slate-400'}`}>
                              {msg.senderName}
                            </div>
                            <div>{msg.text}</div>
                          </div>
                          <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.time}</span>
                        </div>
                      );
                    })}
                  </div>

                  <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2">
                    <input
                      type="text"
                      placeholder="Type your message to resident..."
                      value={chatReplyText}
                      onChange={(e) => setChatReplyText(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> Send
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                  Select a resident inquiry from the left to view messages.
                </div>
              )}
            </div>
          )}

          {/* ================= 2.6 ACTIVE RESIDENTS SECTION ================= */}
          {activeSection === 'residents' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-6 h-6 text-emerald-600" />
                    Resident Directory & Bed Allocation
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage tenant verification, KYC documentation status, and move-in/move-out schedules.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowAddResidentModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" /> Check-in New Resident
                  </button>
                </div>
              </div>

              {/* Residents Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-3 px-4">Resident Name</th>
                      <th className="py-3 px-4">Allocated Bed</th>
                      <th className="py-3 px-4">Hostel Property</th>
                      <th className="py-3 px-4">Monthly Rent</th>
                      <th className="py-3 px-4">Emergency Contact</th>
                      <th className="py-3 px-4">KYC Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {residents
                      .filter(r => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.bedCode.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(r => (
                        <tr key={r.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div>{r.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{r.phone}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">{r.bedCode}</td>
                          <td className="py-3.5 px-4">{r.propertyName}</td>
                          <td className="py-3.5 px-4 font-semibold">₹{r.monthlyRent.toLocaleString()}/mo</td>
                          <td className="py-3.5 px-4 text-slate-500">{r.emergencyContact}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                              {r.kycStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleCheckoutResident(r.id, r.name)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md font-semibold text-[10px] cursor-pointer"
                            >
                              Check-out
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= 2.7 RENT & FINANCIALS SECTION ================= */}
          {activeSection === 'financials' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-6 h-6 text-emerald-600" />
                    Rent Collection & Token Ledger
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Razorpay payout tracking, security deposit accounts, and offline rent recording.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowAddPaymentModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Record Rent Receipt
                  </button>
                </div>
              </div>

              {/* Financial KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white border border-slate-200 rounded-xl">
                  <span className="text-xs text-slate-500 font-medium">Total Tokens Collected</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">₹{financialSummary.totalTokens?.toLocaleString()}</div>
                  <span className="text-[10px] text-emerald-600 font-bold">Reservation holds verified</span>
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-xl">
                  <span className="text-xs text-slate-500 font-medium">Security Deposits in Escrow</span>
                  <div className="text-2xl font-bold text-slate-900 mt-1">₹{financialSummary.escrowDeposits?.toLocaleString()}</div>
                  <span className="text-[10px] text-slate-400">Refundable on move-out</span>
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-xl">
                  <span className="text-xs text-slate-500 font-medium">Net Scheduled Payout</span>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">₹{Math.round(financialSummary.nextScheduledPayout)?.toLocaleString()}</div>
                  <span className="text-[10px] text-slate-400">Payout due {financialSummary.payoutDate}</span>
                </div>
              </div>

              {/* Payments Ledger Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Live Transaction Ledger ({payments.length})</h3>
                  <button onClick={loadFinancials} className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh Ledger
                  </button>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-3 px-4">Transaction ID</th>
                      <th className="py-3 px-4">Resident</th>
                      <th className="py-3 px-4">Bed</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Payment Type</th>
                      <th className="py-3 px-4">Mode / Ref</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {payments.map(txn => (
                      <tr key={txn.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono text-slate-500">{txn.id}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{txn.residentName}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-emerald-700">{txn.bedCode}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">₹{txn.amount.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {txn.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">{txn.utrRef}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                            {txn.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
