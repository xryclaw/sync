const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CSVParser = require('../services/csvParser');

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname) === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('只支持 CSV 文件'), false);
    }
  },
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    console.log('开始解析文件:', req.file.originalname);
    
    const result = await CSVParser.parseAndStore(req.file.path, req.file.originalname);
    
    // 删除临时文件
    fs.unlinkSync(req.file.path);
    
    res.json({
      success: true,
      message: '文件上传并解析成功',
      data: result
    });
  } catch (error) {
    console.error('上传处理失败:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: '文件处理失败', 
      message: error.message 
    });
  }
});

router.get('/sessions', (req, res) => {
  const db = require('../db');
  
  db.all('SELECT * FROM sessions ORDER BY upload_time DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: '查询失败', message: err.message });
    }
    res.json({ success: true, data: rows });
  });
});

module.exports = router;
