# Doc Key - Document Management System

A production-ready full-stack document management system with manual data entry as Phase 1, and AI processing capabilities for Phase 2.

## Quick Start

**Prerequisites:** Node.js, MySQL

### 1. Initialize Database
```bash
mysql -u root -p < docs/schema.sql
```

### 2. Start Backend
```bash
cd backend && npm install && npm run dev
```

### 3. Start Frontend (new terminal)
```bash
cd frontend && npm install && npm run dev
```

Visit: **http://localhost:5173**

[📖 Full Setup Guide](./docs/README.md) | [⚡ Quick Start](./docs/QUICKSTART.md)

## Tech Stack

- **Frontend:** Vite + React 18 + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** MySQL
- **API:** RESTful JSON

## Features

✅ Dashboard with document overview  
✅ Real-time search and filtering  
✅ Document CRUD operations  
✅ Status tracking (Draft/Completed)  
✅ Responsive design  
✅ Production-ready code structure  

## Project Structure

```
doc-key/
├── frontend/          # React dashboard
├── backend/           # Express API
├── docs/              # MySQL schema & docs
└── README.md          # This file
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/documents` | List documents (supports search & filter) |
| POST | `/api/documents` | Create new document |
| DELETE | `/api/documents/:id` | Delete document |

## Development

Both frontend and backend support hot-reload during development.

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

## Next Phase: AI Integration

- Document OCR processing
- Automated data extraction
- Machine learning classification
- Smart document routing

---

**Created:** 2024  
**License:** MIT
