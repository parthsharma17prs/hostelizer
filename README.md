# Hostelizer — PG & Hostel Discovery Marketplace

A high-performance marketplace platform connecting students & working professionals with verified PGs and hostels. Built as a modular full-stack application with an AI/ML intelligence engine.

---

## 🏗️ Repository Architecture

```
hostelizer/
├── backend/                  # Node.js + Express/NestJS Modular Architecture
│   ├── prisma/schema.prisma  # PostgreSQL + PostGIS Data Model
│   ├── src/
│   │   ├── routes/           # Auth, Owners, Admin, Properties, Bookings, AI Gateways
│   │   ├── sockets/          # Socket.IO Real-time Chat Gateway
│   │   └── store/            # In-memory transactional data store & Prisma bridge
│   └── tests/                # Automated Jest Integration Test Suite
├── ai-service/               # Python FastAPI Microservice
│   ├── main.py               # NL Search Parser, Recommendations, Rent Predictor
│   └── requirements.txt
├── frontend/                 # Modern React + Vite + Tailwind CSS + Lucide
│   ├── src/App.tsx           # Customer Discovery, Owner Portal & Admin Console
│   └── index.html
├── docker-compose.yml        # Multi-container orchestration (PostGIS, Redis, Backend, AI)
```

---

## 🚀 Quickstart Guide

### 1. Run the Backend API & Tests
```bash
cd backend
npm install
npm test      # Runs all 7 business rule & integration tests
npm start     # Starts API on port 5000 with WebSockets
```

### 2. Run the AI / ML Microservice
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Run the Frontend Marketplace
```bash
cd frontend
npm install
npm run dev   # Opens app at http://localhost:3000
```

---

## 🛡️ Business Invariants Enforced
1. **Segregated Owner Approval vs. Property Approval**: Owners must verify identity (Aadhaar/PAN/Tax) before gaining dashboard access. Submitted listings must separately be audited and published by Admin.
2. **Double-Booking Protection**: Bed-level inventory (`101-A`, `101-B`) prevents race conditions and overlapping bookings.
3. **AI Search Conversion**: Natural language prompts (`Boys PG in Indore under 8k with AC and food`) are parsed directly into structured SQL/database query filters.

