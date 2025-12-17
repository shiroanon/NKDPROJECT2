const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to SQLite database
const dbPath = path.resolve(__dirname, 'campus_connect.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeTables();
    }
});

function initializeTables() {
    db.serialize(() => {
        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            name TEXT,
            mobile_number TEXT,
            student_id TEXT,
            password TEXT,
            role TEXT CHECK(role IN ('student', 'teacher', 'admin')) DEFAULT 'student',
            branch TEXT,
            year TEXT,
            semester TEXT,
            managed_club TEXT,
            teaching_branches TEXT,
            teaching_semesters TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Posts Table (Used for Lost&Found, Notes, Forum, Events)
        // type: 'lost_found', 'note', 'doubt', 'event', 'club'
        db.run(`CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT,
            club TEXT,
            author_id INTEGER,
            image_url TEXT,
            target_branches TEXT,
            target_semesters TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(author_id) REFERENCES users(id)
        )`);

        // Comments/Answers Table (for Forum/Doubts)
        db.run(`CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER,
            author_id INTEGER,
            content TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(post_id) REFERENCES posts(id),
            FOREIGN KEY(author_id) REFERENCES users(id)
        )`);

        console.log('Tables initialized.');
        seedDatabase();
    });
}

function seedDatabase() {
    const bcrypt = require('bcryptjs');
    const saltRounds = 10;
    const password = 'admin123';

    const admins = [
        { email: 'geek@rjit.com', name: 'RJIT GEEKS Admin', club: 'RJIT GEEKS' },
        { email: 'innovator@rjit.com', name: 'INNOvators Admin', club: 'INNOvators' },
        { email: 'manthan@rjit.com', name: 'MANTHAN Admin', club: 'MANTHAN' }
    ];

    admins.forEach(admin => {
        db.get("SELECT id FROM users WHERE email = ?", [admin.email], (err, row) => {
            if (!row) {
                bcrypt.hash(password, saltRounds, (err, hash) => {
                    if (err) return console.error(err);
                    db.run(`INSERT INTO users (email, name, password, role, managed_club, student_id, branch, year, semester) 
                        VALUES (?, ?, ?, 'student', ?, 'ADMIN', 'CSE', '4', '8')`,
                        [admin.email, admin.name, hash, admin.club]);
                    console.log(`Seeded admin: ${admin.email}`);
                });
            }
        });
    });
}

module.exports = db;
