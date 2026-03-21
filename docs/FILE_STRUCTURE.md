doc-key/
│
├── 📄 README.md                    # Project overview & quick links
├── 📄 setup.sh                     # Automated setup script (Linux/Mac)
├── 📄 .gitignore                   # Git ignore rules
│
├── 📁 backend/                     # Node.js + Express API Server
│   ├── 📄 package.json             # Dependencies: express, mysql2, cors, dotenv
│   ├── 📄 .env                     # Database credentials & config
│   ├── 📄 .gitignore               # Backend git ignore
│   │
│   └── 📁 src/
│       ├── 📄 index.js             # Server entry point (port 5000)
│       │
│       ├── 📁 config/
│       │   └── 📄 database.js      # MySQL connection pool
│       │
│       ├── 📁 models/
│       │   └── 📄 Document.js      # Data model with queries
│       │
│       ├── 📁 controllers/
│       │   └── 📄 DocumentController.js  # Business logic (MVC)
│       │
│       └── 📁 routes/
│           └── 📄 documents.js     # API routes (/api/documents)
│
├── 📁 frontend/                    # React + Vite + Tailwind
│   ├── 📄 package.json             # Dependencies: react, axios, tailwindcss, vite
│   ├── 📄 index.html               # HTML entry point
│   ├── 📄 vite.config.js           # Vite config + API proxy
│   ├── 📄 tailwind.config.js       # Tailwind CSS setup
│   ├── 📄 postcss.config.js        # PostCSS plugins
│   ├── 📄 .gitignore               # Frontend git ignore
│   │
│   └── 📁 src/
│       ├── 📄 App.jsx              # Root component
│       ├── 📄 main.jsx             # React DOM render
│       ├── 📄 index.css            # Tailwind directives
│       │
│       ├── 📁 pages/
│       │   └── 📄 Dashboard.jsx    # Main dashboard page
│       │
│       ├── 📁 components/Dashboard/  # UI Components
│       │   ├── 📄 DashboardHeader.jsx      # Search + filter UI
│       │   ├── 📄 DocumentTable.jsx       # Main data table
│       │   ├── 📄 SummaryCard.jsx         # Stats cards
│       │   └── 📄 StatusBadge.jsx         # Status badges
│       │
│       ├── 📁 services/
│       │   └── 📄 documentService.js   # Axios API client
│       │
│       └── 📁 hooks/               # (Ready for custom hooks)
│
└── 📁 docs/                        # Documentation
    ├── 📄 README.md                # Full setup & API documentation
    ├── 📄 QUICKSTART.md            # Quick start guide (5 mins)
    ├── 📄 DELIVERABLES.md          # Complete deliverables list
    └── 📄 schema.sql               # MySQL database schema

🎯 SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Files Created:     23 files + 1 setup script
✅ Frontend:          10 files (React components)
✅ Backend:           8 files (Express API)
✅ Database:          MySQL schema with sample data
✅ Documentation:     4 complete guides
✅ Setup Helper:      Automated setup script

🚀 QUICK START
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Setup:   ./setup.sh (or manual: see docs/QUICKSTART.md)
2. Backend: cd backend && npm run dev (port 5000)
3. Frontend: cd frontend && npm run dev (port 5173)
4. Open:    http://localhost:5173

✨ FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Dashboard with 3 summary cards
✓ Search by file name or customer name
✓ Filter by status (Draft/Completed)
✓ Real-time data table with sorting
✓ Create, Read, Delete operations
✓ Status badges (yellow/green)
✓ Responsive design
✓ Clean MVC architecture
✓ Production-ready code
✓ Error handling & validation

📊 TECH STACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend:   React 18 + Vite + Tailwind CSS
Backend:    Node.js + Express + MySQL
Database:   MySQL 5.7+
API:        RESTful JSON

🔗 API ENDPOINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET    /api/documents              List all documents
GET    /api/documents?search=...   Search documents
GET    /api/documents?status=Draft Filter by status
POST   /api/documents              Create new document
DELETE /api/documents/:id          Delete document
GET    /health                     Health check
