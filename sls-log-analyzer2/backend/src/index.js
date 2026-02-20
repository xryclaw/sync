const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// SQLite database setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT,
      player_id TEXT,
      event_type TEXT,
      event_data TEXT,
      session_id TEXT
    )`);
  }
});

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

// Upload endpoint
app.post('/upload', upload.single('csvFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      // Store data in SQLite
      db.serialize(() => {
        db.run('BEGIN TRANSACTION;');
        const stmt = db.prepare('INSERT INTO logs (timestamp, player_id, event_type, event_data, session_id) VALUES (?, ?, ?, ?, ?)');
        results.forEach(row => {
          stmt.run(row.timestamp, row.player_id, row.event_type, JSON.stringify(row), row.session_id);
        });
        stmt.finalize();
        db.run('COMMIT;', (err) => {
          if (err) {
            console.error('Transaction failed: ', err.message);
            return res.status(500).send('Error saving data to database.');
          }
          fs.unlinkSync(req.file.path); // Clean up uploaded file
          res.send('File uploaded and data stored successfully.');
        });
      });
    });
});

// API for player behavior timeline
app.get('/api/timeline/:playerId', (req, res) => {
  const { playerId } = req.params;
  db.all('SELECT * FROM logs WHERE player_id = ? ORDER BY timestamp', [playerId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// API for error context
app.get('/api/error-context/:sessionId/:errorTimestamp', (req, res) => {
  const { sessionId, errorTimestamp } = req.params;
  // This is a simplified example. In a real scenario, you'd fetch logs around the error timestamp.
  db.all('SELECT * FROM logs WHERE session_id = ? AND timestamp BETWEEN datetime(?, \'-5 minutes\') AND datetime(?, \'+1 minutes\') ORDER BY timestamp',
    [sessionId, errorTimestamp, errorTimestamp], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
});

// API for behavior statistics
app.get('/api/statistics', (req, res) => {
  db.all('SELECT player_id, COUNT(*) as total_events, SUM(CASE WHEN event_type = \'error\' THEN 1 ELSE 0 END) as total_errors FROM logs GROUP BY player_id', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
