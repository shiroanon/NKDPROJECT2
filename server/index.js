const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// --- API ROUTES ---

// Auth Routes
app.post('/api/register', (req, res) => {
    const {
        email, name, password, role,
        mobile_number,
        student_id, branch, year, semester,
        teaching_branches, teaching_semesters
    } = req.body;
    const saltRounds = 10;

    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) return res.status(500).json({ error: err.message });

        const sql = `INSERT INTO users (
            email, name, password, role,
            mobile_number,
            student_id, branch, year, semester, managed_club,
            teaching_branches, teaching_semesters
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, [
            email, name, hash, role || 'student',
            mobile_number,
            student_id, branch, year, semester, null,
            teaching_branches, teaching_semesters
        ], function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID, email, role });
        });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: "User not found" });

        bcrypt.compare(password, user.password, (err, result) => {
            if (result) {
                // In a real app, verify with JWT or session. For prototype, detailed client-side handling.
                res.json({
                    message: "Login success",
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        student_id: user.student_id,
                        branch: user.branch,
                        semester: user.semester,
                        managed_club: user.managed_club,
                        teaching_branches: user.teaching_branches,
                        teaching_semesters: user.teaching_semesters
                    }
                });
            } else {
                res.status(401).json({ error: "Invalid password" });
            }
        });
    });
});


app.get('/api/my-students', (req, res) => {
    const { teaching_branches, teaching_semesters } = req.query;

    if (!teaching_branches || !teaching_semesters) {
        return res.json({ data: [] });
    }

    // Convert JSON strings or raw strings to arrays
    let branches = [];
    let semesters = [];
    try {
        branches = JSON.parse(teaching_branches);
        semesters = JSON.parse(teaching_semesters);
    } catch (e) {
        // Fallback if sent as comma-sep or single value
        branches = teaching_branches.split(',');
        semesters = teaching_semesters.split(',');
    }

    if (branches.length === 0 || semesters.length === 0) {
        return res.json({ data: [] });
    }

    // Build query: User is student AND (branch IN (...)) AND (semester IN (...))
    const placeholdersBranches = branches.map(() => '?').join(',');
    const placeholdersSemesters = semesters.map(() => '?').join(',');

    const sql = `SELECT id, name, email, student_id, branch, semester, mobile_number, year 
                 FROM users 
                 WHERE role = 'student' 
                 AND branch IN (${placeholdersBranches}) 
                 AND semester IN (${placeholdersSemesters})`;

    db.all(sql, [...branches, ...semesters], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// Posts Routes (Generic for all types)
app.get('/api/posts', (req, res) => {
    const { type, club, user_branch, user_semester, user_role, user_teaching_branches } = req.query;
    // Note: user_branch etc are passed for filtering "relevant" resources.
    // In a secured app, we'd extract this from the session/token of the logged in user.

    let sql = `SELECT posts.*, users.name as author_name FROM posts LEFT JOIN users ON posts.author_id = users.id`;
    let params = [];

    let whereClauses = [];
    if (type) {
        whereClauses.push("type = ?");
        params.push(type);
    }
    if (club) {
        whereClauses.push("club = ?");
        params.push(club);
    }

    // Resource Filtering Logic (for type='note' or generic resources)
    if (type === 'note' && user_role) {
        if (user_role === 'student') {
            // For student: must match branch AND semester (or be generic)
            // Using simple LIKE or exact match. Let's send wildcard if not set.
            // Ideally: (target_branches IS NULL OR target_branches LIKE %branch%)
            //          AND (target_semesters IS NULL OR target_semesters LIKE %sem%)
            if (user_branch) {
                whereClauses.push("(target_branches IS NULL OR target_branches = '' OR target_branches LIKE ?)");
                params.push(`%${user_branch}%`);
            }
            if (user_semester) {
                whereClauses.push("(target_semesters IS NULL OR target_semesters = '' OR target_semesters LIKE ?)");
                params.push(`%${user_semester}%`);
            }
        } else if (user_role === 'teacher' && user_teaching_branches) {
            // Teacher sees resources for their branches? Or all?
            // "allow ... to view resources relevant to them".
            // Let's assume teacher sees everything for now to moderate, or same filter logic?
            // Let's filter by what they teach.
            whereClauses.push("(target_branches IS NULL OR target_branches = '' OR target_branches LIKE ?)");
            // This is tricky if they have multiple. For prototype, simplistic check.
            // We'll just show all for teachers for now as they are "content creators" usually.
            // Or maybe filter based on query if frontend sends it.
            params.push(`%%`); // Placeholder to keep logic simple without complex ORs
            whereClauses.pop(); // Remove it, show all for teachers
        }
    }

    if (whereClauses.length > 0) {
        sql += " WHERE " + whereClauses.join(" AND ");
    }

    sql += ` ORDER BY created_at DESC`;

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.post('/api/posts', (req, res) => {
    // Note: We need to verify who is making this request.
    // In this prototype, we are trusting the params sent in body for simplicity (author_id, role, managed_club)
    // In production, retrieve 'user' from DB using 'author_id' (or session) to verify.
    // I will simulate DB fetch for security check here since it's critical logic.

    const { type, title, content, author_id, image_url, club, target_branches, target_semesters } = req.body;

    db.get(`SELECT * FROM users WHERE id = ?`, [author_id], (err, user) => {
        if (err) return res.status(500).json({ error: "Auth check failed" });
        if (!user) return res.status(401).json({ error: "User not found" });

        // Logic check
        if (type === 'event') {
            const isAdmin = user.role === 'admin';
            // Student admin check: Must be student AND manage THIS specific club
            const isClubAdmin = (user.role === 'student' && user.managed_club === club);

            if (!isAdmin && !isClubAdmin) {
                return res.status(403).json({ error: "You are not authorized to post events for this club." });
            }
        }

        const sql = `INSERT INTO posts (type, title, content, author_id, image_url, club, target_branches, target_semesters) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        db.run(sql, [type, title, content, author_id, image_url, club, target_branches, target_semesters], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: "Post created" });
        });
    });
});

// Comments Routes
app.get('/api/comments', (req, res) => {
    const post_id = req.query.post_id;
    if (!post_id) return res.status(400).json({ error: "Post ID required" });

    const sql = `SELECT comments.*, users.name as author_name FROM comments LEFT JOIN users ON comments.author_id = users.id WHERE post_id = ? ORDER BY created_at ASC`;
    db.all(sql, [post_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    })
});

app.post('/api/comments', (req, res) => {
    const { post_id, author_id, content } = req.body;
    const sql = `INSERT INTO comments (post_id, author_id, content) VALUES (?, ?, ?)`;
    db.run(sql, [post_id, author_id, content], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: "Comment added" });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
