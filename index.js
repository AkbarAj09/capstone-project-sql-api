import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { Client } from 'pg';

dotenv.config();

// === DB CONFIG ===
let dbConfig;

if (process.env.NODE_ENV === "production") {
    dbConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: {
            require: true,
            rejectUnauthorized: false,
        },
    };
} else {
    dbConfig = {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    };
}

const db = new Client(dbConfig);
db.connect()
  .then(() => console.log("✅ Database connected"))
  .catch(err => console.error("❌ Database connection error:", err));

const app = express();
const port = 3000;

// === Middleware ===
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// === JWT Middleware ===
const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/login');
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.redirect('/login');
    }
};

// === Routes ===
app.get('/', verifyToken, async (req, res) => {
    try {
        console.log('User accessing homepage:', req.user);
        const result = await db.query('SELECT * FROM capitals ORDER BY id ASC');
        res.render('index', {
            capitals: result.rows,
            user: req.user,
        });
    } catch (error) {
        console.error("Error fetching capitals for render:", error);
        res.status(500).send('Error loading page.');
    }
});

app.get('/register', (req, res) => res.render('register'));

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await db.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
            [username, hashedPassword]
        );

        res.status(201).json({
            message: "User registered successfully",
            user: newUser.rows[0],
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).send('Username already exists.');
        }
        res.status(500).send({'Server error.': error.message});
    }
});

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
        console.log(process.env.JWT_SECRET);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600000,
        });

        res.status(200).json({ message: "Logged in successfully" });
    } catch (error) {
        res.status(500).send({ 'Server error.': error.message });
    }
});

app.get('/api/capitals', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM capitals ORDER BY id ASC');
        res.status(200).json({ message: 'List of capitals', data: result.rows });
    } catch (error) {
        res.status(500).send('Error fetching capitals data.');
    }
});

app.get('/country/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM capitals WHERE id = $1', [req.params.id]);
        if (result.rows.length > 0) res.status(200).json(result.rows[0]);
        else res.status(404).send('Capital not found');
    } catch (error) {
        res.status(500).send('Error fetching capital data.');
    }
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
        res.status(500).send({ error: 'Error creating capital.', details: error.message });
    }
});

app.put('/country/:id', async (req, res) => {
    const { id } = req.params;
    const { country, capital } = req.body;
    try {
        const result = await db.query(
            'UPDATE capitals SET country = $1, capital = $2 WHERE id = $3 RETURNING *',
            [country, capital, id]
        );
        if (result.rows.length > 0)
            res.status(200).json({ message: 'Capital updated successfully', data: result.rows[0] });
        else res.status(404).send('Capital not found');
    } catch (error) {
        res.status(500).send('Error updating capital.');
    }
});

app.delete('/country/:id', async (req, res) => {
    try {
        const result = await db.query('DELETE FROM capitals WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length > 0)
            res.status(200).json({ message: 'Capital deleted successfully', data: result.rows[0] });
        else res.status(404).send('Capital not found');
    } catch (error) {
        res.status(500).send('Error deleting capital.');
    }
});


app.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.status(200).send('Logged out successfully.');
});

// === Run server (only in dev mode) ===
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`🚀 Server running on http://localhost:${port}`);
    });
}

export default app;
