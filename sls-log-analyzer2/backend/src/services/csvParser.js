const fs = require('fs');
const csv = require('csv-parser');
const { db } = require('../config/database');
const path = require('path');

class CSVParser {
  /**
   * 解析 CSV 文件并存入数据库
   * @param {string} filePath - CSV 文件路径
   * @param {string} sessionName - 分析会话名称
   * @returns {Promise<Object>} 解析结果统计
   */
  static async parseAndStore(filePath, sessionName) {
    return new Promise(async (resolve, reject) => {
      const logs = [];
      const stats = {
        total: 0,
        errors: 0,
        uniqueUsers: new Set()
      };

      // 先创建分析会话，获取 sessionId
      let sessionId;
      try {
        sessionId = await this.createSession(sessionName, path.basename(filePath), stats);
      } catch (err) {
        return reject(new Error('创建分析会话失败: ' + err.message));
      }

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          try {
            const logEntry = this.parseLogRow(row);
            logs.push({ sessionId, ...logEntry }); // 添加 sessionId
            stats.total++;
            stats.uniqueUsers.add(logEntry.uid);
            
            if (logEntry.event_type && logEntry.event_type.toLowerCase() === 'error') {
              stats.errors++;
            }
          } catch (err) {
            console.error('解析行失败:', err.message, '行数据:', row);
          }
        })
        .on('end', async () => {
          try {
            if (logs.length > 0) {
              await this.batchInsertLogs(logs);
            }
            // 更新会话统计数据
            await this.updateSessionStats(sessionId, stats.total, stats.uniqueUsers.size, stats.errors);
            
            resolve({
              sessionId,
              totalLogs: stats.total,
              uniqueUsers: stats.uniqueUsers.size,
              errorCount: stats.errors
            });
          } catch (err) {
            console.error('CSV 解析结束处理失败:', err);
            reject(new Error('CSV 解析结束处理失败: ' + err.message));
          }
        })
        .on('error', (err) => {
          console.error('CSV 读取或解析流错误:', err);
          reject(new Error('CSV 读取或解析流错误: ' + err.message));
        });
    });
  }

  /**
   * 解析单行日志
   * 假设 CSV 包含以下字段或可以通过以下方式提取：
   * uid, sid, level (或 event_type), event_name, datetime (或 _datetime_), store, packVer (或 pack_version), clientVer (或 client_version), raw_data (整个行)
   */
  static parseLogRow(row) {
    const defaultVal = '';
    
    // 尝试从常见字段中提取 event_name，否则使用整个 resp/message
    let eventName = defaultVal;
    if (row.resp && typeof row.resp === 'string') {
        eventName = row.resp.split(' ')[0];
    } else if (row.message && typeof row.message === 'string') {
        eventName = row.message.split(' ')[0];
    } else if (row.event_name && typeof row.event_name === 'string') {
        eventName = row.event_name;
    } else {
        eventName = 'unknown'; // 默认值
    }

    // 确保 datetime 格式正确
    let datetime = row._datetime_ || row.datetime || new Date().toISOString();
    try {
        // 尝试解析并格式化 datetime，兼容多种格式
        // 例如：'2026-02-12T18:33:35.7421010-08:00'
        const dateObj = new Date(datetime);
        if (isNaN(dateObj.getTime())) {
            datetime = new Date().toISOString(); // 无效日期则用当前时间
        } else {
            datetime = dateObj.toISOString(); // 统一为 ISO 8601 UTC
        }
    } catch (e) {
        datetime = new Date().toISOString(); // 解析失败则用当前时间
    }

    return {
      uid: row.uid || defaultVal,
      sid: row.sid || defaultVal,
      event_type: row.level || row.event_type || 'info', // 默认 'info'
      event_name: eventName,
      datetime: datetime,
      store: row.store || defaultVal,
      pack_version: row.packVer || row.pack_version || defaultVal,
      client_version: row.clientVer || row.client_version || defaultVal,
      raw_data: JSON.stringify(row) // 存储原始行数据
    };
  }

  /**
   * 创建分析会话
   */
  static createSession(sessionName, fileName, stats) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO analysis_sessions (session_name, file_name, total_logs, unique_users, error_count)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      db.run(sql, [
        sessionName,
        fileName,
        stats.total, // 初始统计为0，后续更新
        stats.uniqueUsers.size, // 初始统计为0，后续更新
        stats.errors // 初始统计为0，后续更新
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  /**
   * 更新分析会话的统计数据
   */
  static updateSessionStats(sessionId, totalLogs, uniqueUsers, errorCount) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE analysis_sessions
        SET total_logs = ?, unique_users = ?, error_count = ?
        WHERE id = ?
      `;
      db.run(sql, [totalLogs, uniqueUsers, errorCount, sessionId], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * 批量插入日志
   */
  static batchInsertLogs(logs) {
    return new Promise((resolve, reject) => {
      const insertSql = `
        INSERT INTO logs (session_id, uid, sid, event_type, event_name, datetime, store, pack_version, client_version, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare(insertSql);
        
        logs.forEach(log => {
          stmt.run([
            log.sessionId,
            log.uid,
            log.sid,
            log.event_type,
            log.event_name,
            log.datetime,
            log.store,
            log.pack_version,
            log.client_version,
            log.raw_data
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
