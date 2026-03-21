# Quick Start Guide

## Step-by-step to run the project locally

### 1. Database Setup (MySQL)

```bash
# Login to MySQL
mysql -u root -p

# Or run the schema directly:
mysql -u root -p < docs/schema.sql
```

If no password for root user:
```bash
mysql -u root < docs/schema.sql
```

### 2. Start Backend

```bash
cd backend
npm install
npm run dev    # Uses nodemon for auto-restart
```

Expected output:
```
Server is running on http://localhost:5000
Health check: http://localhost:5000/health
```

### 3. Start Frontend (in a new terminal)

```bash
cd frontend
npm install
npm run dev
```

Expected output:
```
VITE v4.3.9  ready in XXX ms

➜  Local:   http://localhost:5173/
```

### 4. Access the Application

Open your browser and go to: **http://localhost:5173**

### 5. Test Functionality

- ✅ View dashboard with sample data
- ✅ Search for documents
- ✅ Filter by status
- ✅ Create new document
- ✅ Delete document

---

## Alternative: Using npm instead of nodemon

If nodemon is not installed:

```bash
cd backend
npm install
node src/index.js
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| `Error: connect ECONNREFUSED 127.0.0.1:3306` | MySQL not running. Start MySQL service. |
| `Error: Unknown database 'doc_key'` | Run schema.sql: `mysql -u root < docs/schema.sql` |
| `Port 5000 already in use` | Kill process: `lsof -i :5000` then `kill -9 <PID>` |
| `Port 5173 already in use` | Kill process: `lsof -i :5173` then `kill -9 <PID>` |
| `Cannot GET /api/documents` | Backend not running. Check terminal for errors. |

---

## Next Steps (Future Features)

- [ ] Authentication & Authorization
- [ ] Form Page for Document Details
- [ ] AI Document Processing
- [ ] Document Upload/Download
- [ ] User Roles & Permissions
- [ ] Document History/Versioning
- [ ] Export to PDF/Excel
