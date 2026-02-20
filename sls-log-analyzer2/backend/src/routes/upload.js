const express = require('express');
const router = express.Router();
const upload = require('../middleware/fileUpload');
const CSVParser = require('../services/csvParser');
const fs = require('fs');
const { db } = require('../config/database'); // 引入 db 实例

/**
 * POST /api/upload
 * 上传 CSV 文件并解析
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    const { sessionName } = req.body;
    if (!sessionName) {
      // 删除临时文件
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: '缺少会话名称' });
    }

    console.log(`开始解析文件: ${req.file.originalname}`);
    
    const result = await CSVParser.parseAndStore(req.file.path, sessionName);
    
    // 删除临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.json({
      success: true,
      message: '文件上传并解析成功',
      data: result
    });
  } catch (error) {
    console.error('上传处理失败:', error);
    
    // 清理临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: '文件处理失败', 
      message: error.message 
    });
  }
});

/**
 * GET /api/upload/sessions
 * 获取所有分析会话列表
 */
router.get('/sessions', (req, res) => {
  const sql = 'SELECT * FROM analysis_sessions ORDER BY upload_time DESC';
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('获取会话列表失败:', err);
      return res.status(500).json({ error: '查询失败', message: err.message });
    }
    res.json({ success: true, data: rows });
  });
});

module.exports = router;
