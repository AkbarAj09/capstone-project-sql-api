import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import db from './database.js';

dotenv.config();

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));


import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import db from path.join(__dirname, 'config', 'database.js');


// Middleware cek JWT
const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.redirect('/login');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.redirect('/login');
    }
};

// Homepage
app.get('/', verifyToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM capitals ORDER BY id ASC');
        res.render('index', { capitals: result.rows, user: req.user });
    } catch (error) {
        res.status(500).send('Error loading page.');
    }
});

// Register
app.get('/register', (req, res) => res.render('register'));
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await db.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
            [username, hashedPassword]
        );
        res.status(201).json({ message: "User registered successfully", user: newUser.rows[0] });
    } catch (error) {
        if (error.code === '23505') return res.status(409).send('Username already exists.');
        res.status(500).send('Server error.');
    }
});

// Login
app.get('/login', (req, res) => res.render('login'));
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).send('Invalid credentials.');

        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) return res.status(401).send('Invalid credentials.');

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600000
        });
        res.status(200).json({ message: "Logged in successfully" });
    } catch (error) {
        res.status(500).send({ 'Server error': error.message });
    }
});

// API capitals (JSON)
app.get('/api/capitals', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM capitals ORDER BY id ASC');
        res.json({ message: 'List of capitals', data: result.rows });
    } catch {
        res.status(500).send('Error fetching capitals data.');
    }
});

// CRUD capitals
app.get('/country/:id', async (req, res) => {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM capitals WHERE id = $1', [id]);
    result.rows.length ? res.json(result.rows[0]) : res.status(404).send('Capital not found');
});

app.post('/country', async (req, res) => {
    const { country, capital } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO capitals (country, capital) VALUES ($1, $2) RETURNING *',
            [country, capital]
        );
        res.status(201).json({ message: 'Capital created successfully', data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error creating capital.', details: error.message });
    }
});

app.put('/country/:id', async (req, res) => {
    const { id } = req.params;
    const { country, capital } = req.body;
    const result = await db.query(
        'UPDATE capitals SET country = $1, capital = $2 WHERE id = $3 RETURNING *',
        [country, capital, id]
    );
    result.rows.length
        ? res.json({ message: 'Capital updated successfully', data: result.rows[0] })
        : res.status(404).send('Capital not found');
});

app.delete('/country/:id', async (req, res) => {
    const { id } = req.params;
    const result = await db.query('DELETE FROM capitals WHERE id = $1 RETURNING *', [id]);
    result.rows.length
        ? res.json({ message: 'Capital deleted successfully', data: result.rows[0] })
        : res.status(404).send('Capital not found');
});

// Random number demo
app.post('/random', (req, res) => {
    const { name } = req.body;
    const randomNumber = Math.floor(Math.random() * 100) + 1;
    res.send(`Hello, ${name}! Your random number is ${randomNumber}.`);
});

// Logout
app.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.send('Logged out successfully.');
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => console.log(`🚀 Server running on port: ${port}`));
}

export default app;
