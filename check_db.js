import Database from 'better-sqlite3';
const db = new Database('kreativ-desk.db');
try {
  console.log(db.prepare('SELECT * FROM documents WHERE ownerId = ? ORDER BY uploadedAt DESC').all('test'));
  console.log(db.prepare('SELECT * FROM events ORDER BY date ASC').all());
} catch (e) {
  console.error(e);
}
