const express = require('express');
const router = express.Router();
const db = require('../db');

// 查询日志列表
router.get('/', (req, res) => {
  const { 
    sessionId, 
    level, 
    keyword, 
    startTime, 
    endTime, 
    page = 1, 
    pageSize = 50 
  } = req.query;

  let sql = 'SELECT * FROM logs WHERE 1=1';
  const params = [];

  if (sessionId) {
    sql += ' AND session_id = ?';
    params.push(sessionId);
  }

  if (level) {
    sql += ' AND level = ?';
    params.push(level);
  }

  if (keyword) {
    sql += ' AND (resp LIKE ? OR raw_json LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (startTime) {
    sql += ' AND datetime >= ?';
    params.push(startTime);
  }

  if (endTime) {
    sql += ' AND datetime <= ?';
    params.push(endTime);
  }

  // 计算总数
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
  
  db.get(countSql, params, (err, countRow) => {
    if (err) {
      return res.status(500).json({ error: '查询失败', message: err.message });
    }

    const total = countRow.total;
    const offset = (page - 1) * pageSize;

    sql += ' ORDER BY datetime DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);

    db.all(sql, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: '查询失败', message: err.message });
      }

      res.json({
        success: true,
        data: {
          logs: rows,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total,
            totalPages: Math.ceil(total / pageSize)
          }
        }
      });
    });
  });
});

// 查询单条日志详情
router.get('/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM logs WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: '查询失败', message: err.message });
    }

    if (!row) {
      return res.status(404).json({ error: '日志不存在' });
    }

    res.json({ success: true, data: row });
  });
});

module.exports = router;
