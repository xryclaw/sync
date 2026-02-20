const fs = require('fs');
const csv = require('csv-parser');
const db = require('../db');

class CSVParser {
  static async parseAndStore(filePath, fileName) {
    return new Promise((resolve, reject) => {
      const logs = [];
      let errorCount = 0;
      let uid = null;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          try {
            // 提取 uid（取第一条的 uid）
            if (!uid && row.uid) {
              uid = row.uid;
            }

            // 统计 error
            if (row._level_ && row._level_.toLowerCase() === 'error') {
              errorCount++;
            }

            logs.push({
              uid: row.uid || '',
              datetime: row._datetime_ || '',
              level: row._level_ || 'Info',
              resp: row.resp || '',
              sid: row.sid || '',
              device: row.device || '',
              client_ver: row.clientVer || '',
              pack_ver: row.packVer || '',
              country: row.country || '',
              store: row.store || '',
              raw_json: JSON.stringify(row)
            });
          } catch (err) {
            console.error('解析行失败:', err.message);
          }
        })
        .on('end', async () => {
          try {
            // 创建会话
            const sessionId = await this.createSession(fileName, logs.length, errorCount, uid);
            
            // 批量插入日志
            await this.batchInsertLogs(logs, sessionId);
            
            resolve({
              sessionId,
              totalLogs: logs.length,
              errorCount,
              uid
            });
          } catch (err) {
            reject(err);
          }
        })
        .on('error', reject);
    });
  }

  static createSession(fileName, totalLogs, errorCount, uid) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO sessions (file_name, total_logs, error_count, uid)
        VALUES (?, ?, ?, ?)
      `;
      
      db.run(sql, [fileName, totalLogs, errorCount, uid], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  static batchInsertLogs(logs, sessionId) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO logs (session_id, uid, datetime, level, resp, sid, device, client_ver, pack_ver, country, store, raw_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const stmt = db.prepare(sql);
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        logs.forEach(log => {
          stmt.run([
            sessionId,
            log.uid,
            log.datetime,
            log.level,
            log.resp,
            log.sid,
            log.device,
            log.client_ver,
            log.pack_ver,
            log.country,
            log.store,
            log.raw_json
          ]);
        });
        
        stmt.finalize();
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }
}

module.exports = CSVParser;
