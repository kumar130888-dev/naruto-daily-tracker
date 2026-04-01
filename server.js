const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const dbPath = path.join(__dirname, "tasks.db");
const db = new sqlite3.Database(dbPath);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// initialize DB
const createTable = `
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    task TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT
  )
`;

const createMasterTable = `
  CREATE TABLE IF NOT EXISTS master_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task TEXT NOT NULL UNIQUE
  )
`;

db.serialize(() => {
  db.run(createTable);
  db.run(createMasterTable);

  // Insert master tasks if not exist
  const masterTasks = [
    '🌅 Wake up',
    '🪥 Brush teeth',
    '🛁 Bath',
    '🥞 Breakfast',
    '🐶 Feed Peach',
    '🐦 Feed birds',
    '📚 Maths Workbook/Worksheet',
    '✍️ English copy writing 3pages(Large book)',
    '✍️ Hindi writing 2 pages(large book)',
    '💻 Coding/Robotics',
    '📖 Story Book Reading(English/Hindi)',
    '⚽ Outdoor play / exercise',
    '🧹 Clean room / toys',
    '📱 ScreenTime(Tab,Laptop, TV)',
    '🤝 Help parents',
    '🍽️ Dinner',
    '🪥 Brush teeth (night)',
    '🛏️ Go to bed',
    '😴 Sleep'
  ];

  masterTasks.forEach(task => {
    db.run("INSERT OR IGNORE INTO master_tasks (task) VALUES (?)", [task]);
  });
});

// Helper to promisify db methods
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve({ lastID: this.lastID, changes: this.changes });
  });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

app.post("/api/tasks", async (req, res) => {
  const { date, task, status, notes } = req.body;
  if (!date || !task || !status) {
    return res.status(400).json({ error: "date, task, status are required" });
  }

  try {
    const result = await dbRun("INSERT INTO tasks (date, task, status, notes) VALUES (?, ?, ?, ?)", [date, task, status, notes || ""]);
    res.status(201).json({ id: result.lastID, date, task, status, notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/master-tasks", async (req, res) => {
  try {
    const rows = await dbAll("SELECT id, task FROM master_tasks ORDER BY task ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tasks", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { date, task, status, notes } = req.body;
  if (!date || !task || !status) {
    return res.status(400).json({ error: "date, task, status are required" });
  }

  try {
    const result = await dbRun("UPDATE tasks SET date = ?, task = ?, status = ?, notes = ? WHERE id = ?", [date, task, status, notes || "", id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json({ id, date, task, status, notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const result = await dbRun("DELETE FROM tasks WHERE id = ?", [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
