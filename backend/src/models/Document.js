const pool = require('../config/database');

class Document {
  static async getAll(search = '', status = '') {
    let query = 'SELECT * FROM documents WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (file_name LIKE ? OR customer_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY upload_date DESC';

    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(query, params);
      return rows;
    } finally {
      connection.release();
    }
  }

  static async create(fileName, customerName) {
    const query = `
      INSERT INTO documents (file_name, customer_name, upload_date, status, created_at)
      VALUES (?, ?, NOW(), 'Draft', NOW())
    `;
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(query, [fileName, customerName]);
      return { id: result.insertId, file_name: fileName, customer_name: customerName, status: 'Draft' };
    } finally {
      connection.release();
    }
  }

  static async delete(id) {
    const query = 'DELETE FROM documents WHERE id = ?';
    const connection = await pool.getConnection();
    try {
      await connection.execute(query, [id]);
      return true;
    } finally {
      connection.release();
    }
  }
}

module.exports = Document;
