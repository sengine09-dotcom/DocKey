# Doc Key - Document Management System

A full-stack document management system built with React, Node.js, and MySQL.

## Project Structure

```
doc-key/
├── frontend/                 # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/       # React components
│   │   │   └── Dashboard/
│   │   │       ├── DashboardHeader.jsx
│   │   │       ├── DocumentTable.jsx
│   │   │       ├── SummaryCard.jsx
│   │   │       └── StatusBadge.jsx
│   │   ├── pages/            # Page components
│   │   │   └── Dashboard.jsx
│   │   ├── services/         # API service layer
│   │   │   └── documentService.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── backend/                  # Node.js + Express
│   ├── src/
│   │   ├── routes/           # API routes
│   │   │   └── documents.js
│   │   ├── controllers/      # Business logic
│   │   │   └── DocumentController.js
│   │   ├── models/           # Data models
│   │   │   └── Document.js
│   │   ├── config/           # Configuration
│   │   │   └── database.js
│   │   └── index.js          # Server entry point
│   ├── .env
│   ├── .gitignore
│   └── package.json
│
└── docs/                     # Documentation
    └── schema.sql            # MySQL database schema
```

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- MySQL (v5.7+)
- npm or yarn

### 1. Database Setup

Create the database and tables:

```bash
mysql -u root -p < docs/schema.sql
```

If you're prompted for a password, enter your MySQL password.

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file (if not already created)
# Update DB credentials in .env if necessary
nano .env

# Install nodemon globally (optional, for development)
npm install -g nodemon

# Start the server
npm run dev
# or
node src/index.js
```

The backend will run on `http://localhost:5000`

Health check: `http://localhost:5000/health`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:5173`

## API Endpoints

### GET /api/documents
Fetch all documents with optional search and filter

**Query Parameters:**
- `search` (string, optional): Search by file name or customer name
- `status` (string, optional): Filter by status (Draft, Completed)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "file_name": "Invoice #001.pdf",
      "customer_name": "Acme Corporation",
      "upload_date": "2024-03-20T10:30:00.000Z",
      "status": "Completed"
    }
  ],
  "count": 5
}
```

### POST /api/documents
Create a new document (default status = Draft)

**Request Body:**
```json
{
  "fileName": "New Document",
  "customerName": "Customer Name"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 6,
    "file_name": "New Document",
    "customer_name": "Customer Name",
    "status": "Draft"
  },
  "message": "Document created successfully"
}
```

### DELETE /api/documents/:id
Delete a document by ID

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

## Features

✅ **Dashboard Page**
- Summary cards showing total, draft, and completed documents
- Search functionality (by file name or customer name)
- Status filter (Draft / Completed)
- Responsive data table with sort by latest upload date

✅ **Document Management**
- Create new documents
- View document details
- Delete documents
- Status badges (Draft in yellow, Completed in green)

✅ **Backend API**
- RESTful API with MVC pattern
- Database connection pooling
- Error handling and validation
- CORS support

✅ **Database**
- MySQL schema with indexes for performance
- Sample data included
- Timestamps for tracking

## Usage

1. **View Dashboard**: Open http://localhost:5173 in your browser
2. **Create Document**: Click "+ New Document" button
3. **Search**: Use the search input to find documents by name
4. **Filter**: Select a status to filter documents
5. **Delete**: Click "Delete" button to remove a document
6. **Edit**: Click "Edit" button (placeholder for future implementation)

## Environment Variables (.env)

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=doc_key
DB_PORT=3306
PORT=5000
NODE_ENV=development
```

## Notes for Future Expansion (AI Phase)

- The system is structured to easily accommodate AI document processing
- Controller layer can be extended with AI model integration
- Database schema can be extended with AI processing results
- Separate service layer for document analysis/OCR integration
- Message queue (Redis/RabbitMQ) can be added for async processing

## Troubleshooting

### MySQL Connection Error
- Verify MySQL is running: `mysql -u root -p`
- Check DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in `.env`
- Ensure database is created: `CREATE DATABASE doc_key;`

### CORS Error
- Verify backend is running on port 5000
- Check vite.config.js proxy settings
- Backend has CORS middleware enabled

### Frontend Won't Connect to API
- Ensure backend is running: `npm run dev` in backend folder
- Check browser console for error messages
- Verify API base URL in `documentService.js`

### Port Already in Use
- Backend (5000): `lsof -i :5000` and kill the process
- Frontend (5173): `lsof -i :5173` and kill the process

## License
MIT
