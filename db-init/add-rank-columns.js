// Migration script to add rank tracking to match_history table
// Run this with: node db-init/add-rank-columns.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'db', 'shared.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Starting migration to add rank columns to match_history...');

// Add columns one by one (SQLite doesn't support multiple ALTER TABLE ADD COLUMN in one statement)
const migrations = [
  {
    name: 'player1_rank_before',
    sql: 'ALTER TABLE match_history ADD COLUMN player1_rank_before INTEGER DEFAULT 0'
  },
  {
    name: 'player1_rank_after',
    sql: 'ALTER TABLE match_history ADD COLUMN player1_rank_after INTEGER DEFAULT 0'
  },
  {
    name: 'player1_points_change',
    sql: 'ALTER TABLE match_history ADD COLUMN player1_points_change INTEGER DEFAULT 0'
  }
];

let completed = 0;

migrations.forEach(migration => {
  db.run(migration.sql, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log(`✅ Column ${migration.name} already exists`);
      } else {
        console.error(`❌ Error adding ${migration.name}:`, err.message);
      }
    } else {
      console.log(`✅ Added column: ${migration.name}`);
    }
    
    completed++;
    if (completed === migrations.length) {
      console.log('✅ Migration complete!');
      db.close();
    }
  });
});
