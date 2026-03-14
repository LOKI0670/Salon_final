const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

let db;

// Initialize Database
async function initDB() {
    db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    // Create reservations table if it doesn't exist
    await db.exec(`
        CREATE TABLE IF NOT EXISTS reservations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            treatment TEXT NOT NULL,
            notes TEXT,
            createdAt TEXT NOT NULL
        )
    `);
    
    console.log('Connected to SQLite database.');
}

// Ensure the database is initialized before starting
initDB().catch(err => {
    console.error('Failed to initialize database:', err);
});

// API Endpoint: Login
// Accepts any username/password combination for demonstration purposes
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (username && password) {
        res.status(200).json({ success: true, message: 'Login successful' });
    } else {
        res.status(401).json({ success: false, message: 'Please enter a username and password.' });
    }
});

// API Endpoint: Make a Reservation
app.post('/api/reserve', async (req, res) => {
    const { name, phone, email, date, time, treatment, notes } = req.body;

    // Basic validation
    if (!name || !phone || !date || !time || !treatment) {
        return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
    }

    try {
        const newId = Date.now().toString();
        const createdAt = new Date().toISOString();

        await db.run(
            `INSERT INTO reservations (id, name, phone, email, date, time, treatment, notes, createdAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [newId, name, phone, email || '', date, time, treatment, notes || '', createdAt]
        );

        console.log(`New Reservation Created in DB: ${name} for ${treatment}`);

        res.status(201).json({ 
            success: true, 
            message: 'Reservation successful!', 
            reservation: { id: newId, name, date, time, treatment }
        });
    } catch (error) {
        console.error('Error saving reservation:', error);
        res.status(500).json({ success: false, message: 'Failed to save reservation.' });
    }
});

// API Endpoint: View Reservations
app.get('/api/reservations', async (req, res) => {
    try {
        const reservations = await db.all('SELECT * FROM reservations ORDER BY createdAt DESC');
        res.status(200).json({ success: true, reservations });
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch reservations.' });
    }
});

// Catch-all route to serve the main HTML file
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'hairspa-spa.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Try accessing http://localhost:${PORT}/api/reservations to see bookings.`);
});
