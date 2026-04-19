const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening db', err.message);
  } else {
    console.log('Connected to SQLite db');
    db.run('PRAGMA foreign_keys = ON');
  }
});

// A small wrapper to use async/await
db.runAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
};

db.getAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

db.allAsync = function (sql, params = []) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

const initDB = async () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS forms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        theme_color TEXT DEFAULT '#4F46E5',
        widget_position TEXT DEFAULT 'inline',
        webhook_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Migrations for new customizations
    db.run("ALTER TABLE forms ADD COLUMN font_family TEXT DEFAULT 'Outfit'", (err) => {});
    db.run("ALTER TABLE forms ADD COLUMN font_size TEXT DEFAULT 'medium'", (err) => {});
    db.run("ALTER TABLE forms ADD COLUMN submit_label TEXT DEFAULT 'Submit'", (err) => {});

    db.run(`
      CREATE TABLE IF NOT EXISTS form_fields (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        form_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        is_required INTEGER DEFAULT 0,
        options TEXT,
        order_index INTEGER DEFAULT 0,
        min_length INTEGER,
        max_length INTEGER,
        FOREIGN KEY (form_id) REFERENCES forms (id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        form_id INTEGER NOT NULL,
        ip_address TEXT,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        data TEXT NOT NULL,
        FOREIGN KEY (form_id) REFERENCES forms (id) ON DELETE CASCADE
      )
    `);

    db.get('SELECT count(*) as c FROM users', (err, row) => {
      if (row.c === 0) {
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', 'password123']);
      }
    });
  });
};

initDB();

module.exports = db;
