const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static frontend files
app.use(express.static(__dirname));

// MySQL Database Connection Pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Soham123',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

/* ======================================================
   AUTO-INITIALIZER: DATABASE, TABLES & SEEDER
====================================================== */
const cityData = {
    'Mumbai': {
        venues: [
            'Wankhede Stadium Turf, Churchgate', 'Azad Maidan Pitch No. 4, CST', 'Bandra Kickoff Arena, Bandra West',
            'Andheri Sports Complex (SPG)', 'Shivaji Park Gymkhana, Dadar', 'Cross Maidan, Marine Lines',
            'Parel United Turf Grounds', 'Oval Maidan South Pavilion', 'Chembur Gymkhana Turf Club',
            'Goregaon Sports Club Arena', 'Juhu Vile Parle Gymkhana (JVPGC)', 'Borivali National Park Turf Arena'
        ],
        clubs: ['MCA Affiliated Club', 'Mumbai City Youth Sports', 'Bandra Strikers Association', 'Suburban Sports League']
    },
    'Pune': {
        venues: [
            'Balewadi Sports Stadium Complex', 'Viman Nagar Arena Turf', 'Deccan Gymkhana Sports Ground',
            'FC Road Turf Hub, Shivaji Nagar', 'Kothrud Champions Arena', 'Hadapsar Magarpatta Turf Club',
            'Kalyani Nagar Futsal Arena', 'Aundh Smashers Badminton Court', 'Pimpri-Chinchwad Municipal Turf'
        ],
        clubs: ['Poona District Sports Association', 'Shivaji Maratha Sports Club', 'Balewadi Academy', 'Deccan Warriors Hub']
    },
    'Thane': {
        venues: [
            'Dadoji Kondadev Stadium, Khopat', 'Upvan Lake Turf Arena', 'Hiranandani Estate Turf Club, Patlipada',
            'Ghodbunder Turf Park', 'Majiwada Golden Turf Hub', 'Naupada Gymkhana Grounds',
            'Kopri Sports Complex', 'Vartak Nagar Sports Turf', 'Balkum Super Turf Arena'
        ],
        clubs: ['Thane District Olympic Council', 'Dadoji Kondadev Academy', 'Upvan Knights Club', 'Ghodbunder Sports Trust']
    },
    'Nagpur': {
        venues: ['Reshimbagh Ground', 'Mankapur Indoor Stadium', 'Dharampeth Turf Club', 'Civil Lines Sports Pavilion'],
        clubs: ['Vidarbha Sports Board', 'Nagpur District Association', 'Orange City Spikers']
    },
    'Nashik': {
        venues: ['Mahatma Nagar Turf Arena', 'Golf Club Sports Ground', 'Indira Nagar Sports Arena', 'Panchavati District Complex'],
        clubs: ['Nashik District Sports Office', 'Godavari Sports Club', 'Kumbh City Warriors']
    },
    'Kolhapur': {
        venues: ['Khasbag Arena', 'Rajarampuri Ground', 'Tarabai Park Turf Club', 'Shahu Stadium Pavilion'],
        clubs: ['Kolhapur Sports Council', 'Shahu Chhatrapati Trust', 'Karveer Sports Guild']
    },
    'Chhatrapati Sambhajinagar': {
        venues: ['Dr. Babasaheb Ambedkar Sports Stadium', 'Prozone Sports Hub', 'Cidco Turf Arena', 'Garkheda Sports Complex'],
        clubs: ['Marathwada Olympic Guild', 'Sambhajinagar Sports Foundation']
    }
};

const sportsData = {
    'Cricket': {
        formats: ['T10 Leather Ball', 'T20 Open Trophy', 'Box Cricket Night Cup', 'Overarm Tennis Knockout'],
        prefixes: ['Super League', 'Premier Cup', 'Championship', 'Golden Trophy', 'Night Floodlight Cup']
    },
    'Football': {
        formats: ['5v5 Turf Knockout', '7v7 Futsal Championship', '11v11 League Cup', 'Golden Goal Cup'],
        prefixes: ['Champions Futsal', 'Super Cup', 'Pro League', 'Turf Masters']
    },
    'Kabaddi': {
        formats: ['Pro-Style Mat 7v7', 'Circle Kabaddi Open', 'State Invitational'],
        prefixes: ['Mat Masters Trophy', 'Yoddha Clash', 'District Cup']
    },
    'Badminton': {
        formats: ['Men Singles Open', 'Men Doubles Premier', 'Mixed Doubles Championship'],
        prefixes: ['Shuttle Smashers Open', 'Smash Masters', 'Grand Slam Cup']
    },
    'Volleyball': {
        formats: ['6v6 Rotation Knockout', 'Super Spikers League', 'Beach 2v2 Open'],
        prefixes: ['Spikers Trophy', 'Volley Slam', 'Blockers Invitational']
    },
    'Basketball': {
        formats: ['3x3 Half-Court Streetball', '5v5 Full-Court Classic', 'Hoop Masters League'],
        prefixes: ['Hoop Fest', 'Streetball Rumble', 'Ballers Cup']
    }
};

async function initializeDatabase() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('🔄 Checking database & table architecture...');

        await conn.query(`CREATE DATABASE IF NOT EXISTS playsphere_db;`);
        await conn.query(`USE playsphere_db;`);

        // 1. Users Table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                fullname VARCHAR(120) NOT NULL,
                email VARCHAR(150) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Tournaments Table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS tournaments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                sport VARCHAR(50) NOT NULL,
                city VARCHAR(100) NOT NULL,
                venue VARCHAR(255) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                format_type VARCHAR(100) DEFAULT 'Knockout',
                entry_fee DECIMAL(10, 2) DEFAULT 0.00,
                prize_pool DECIMAL(10, 2) DEFAULT 0.00,
                max_teams INT DEFAULT 32,
                organizer_name VARCHAR(150) NOT NULL,
                organizer_contact VARCHAR(30) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Team Registrations Table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS team_registrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tournament_id INT NOT NULL,
                team_name VARCHAR(150) NOT NULL,
                captain_name VARCHAR(120) NOT NULL,
                captain_email VARCHAR(150) NOT NULL,
                captain_contact VARCHAR(30) NOT NULL,
                vice_captain_name VARCHAR(120),
                player_roster TEXT NOT NULL,
                kit_jersey_color VARCHAR(60),
                city_origin VARCHAR(100),
                registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
                UNIQUE KEY unique_team_captain (tournament_id, captain_email)
            );
        `);

        // 4. Solo Pool Table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS solo_pool (
                id INT AUTO_INCREMENT PRIMARY KEY,
                player_name VARCHAR(100) NOT NULL,
                sport VARCHAR(50) NOT NULL,
                preferred_position VARCHAR(100) NOT NULL,
                city VARCHAR(100) NOT NULL,
                contact_number VARCHAR(20) NOT NULL,
                experience_level ENUM('Beginner', 'Intermediate', 'Pro') DEFAULT 'Intermediate',
                bio TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 5. Matches Table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS matches (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tournament_id INT NOT NULL,
                round_name VARCHAR(50) DEFAULT 'Quarter-Final',
                team_a VARCHAR(100) NOT NULL,
                team_b VARCHAR(100) NOT NULL,
                score_a VARCHAR(50) DEFAULT 'Yet to Play',
                score_b VARCHAR(50) DEFAULT 'Yet to Play',
                match_status ENUM('Upcoming', 'Live', 'Completed') DEFAULT 'Upcoming',
                scheduled_time DATETIME NOT NULL,
                FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
            );
        `);

        // 6. Player Stats / Leaderboard
        await conn.query(`
            CREATE TABLE IF NOT EXISTS player_stats (
                id INT AUTO_INCREMENT PRIMARY KEY,
                player_name VARCHAR(100) NOT NULL,
                sport VARCHAR(50) NOT NULL,
                city VARCHAR(100) NOT NULL,
                points INT DEFAULT 0,
                matches_played INT DEFAULT 0,
                mvp_titles INT DEFAULT 0
            );
        `);

        // 7. Venue Bookings Table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS venue_bookings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                turf_name VARCHAR(150) NOT NULL,
                city VARCHAR(100) NOT NULL,
                booked_by VARCHAR(100) NOT NULL,
                contact_number VARCHAR(20) NOT NULL,
                booking_date DATE NOT NULL,
                time_slot VARCHAR(50) NOT NULL,
                status ENUM('Confirmed', 'Pending') DEFAULT 'Confirmed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 8. Community Discussions Table
        await conn.query(`
            CREATE TABLE IF NOT EXISTS community_posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                author_name VARCHAR(100) NOT NULL,
                sport VARCHAR(50) NOT NULL,
                title VARCHAR(200) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Check if tournaments table needs to be seeded
        const [existing] = await conn.query(`SELECT COUNT(*) as total FROM tournaments`);
        if (existing[0].total === 0) {
            console.log('⚡ Populating 800+ tournaments across Maharashtra...');
            const batch = [];

            for (const [cityName, cityInfo] of Object.entries(cityData)) {
                const iterations = (cityName === 'Mumbai' || cityName === 'Pune' || cityName === 'Thane') ? 22 : 14;

                for (const [sportName, sportInfo] of Object.entries(sportsData)) {
                    for (let i = 1; i <= iterations; i++) {
                        const venue = cityInfo.venues[Math.floor(Math.random() * cityInfo.venues.length)];
                        const format = sportInfo.formats[Math.floor(Math.random() * sportInfo.formats.length)];
                        const prefix = sportInfo.prefixes[Math.floor(Math.random() * sportInfo.prefixes.length)];
                        const club = cityInfo.clubs[Math.floor(Math.random() * cityInfo.clubs.length)];

                        const tournamentName = `${cityName} ${prefix} ${sportName} Series ${i} (${format})`;

                        const startOffset = Math.floor(Math.random() * 80) + 1;
                        const duration = Math.floor(Math.random() * 3) + 2;
                        const startDate = new Date(Date.now() + startOffset * 86400000).toISOString().split('T')[0];
                        const endDate = new Date(Date.now() + (startOffset + duration) * 86400000).toISOString().split('T')[0];

                        const fee = (Math.floor(Math.random() * 25) + 5) * 100;
                        const prize = fee * (Math.floor(Math.random() * 8) + 10);
                        const maxTeams = [16, 24, 32, 64][Math.floor(Math.random() * 4)];
                        const contact = `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`;

                        batch.push([
                            tournamentName, sportName, cityName, venue, startDate, endDate,
                            format, fee, prize, maxTeams, club, contact
                        ]);
                    }
                }
            }

            const insertSQL = `
                INSERT INTO tournaments (
                    name, sport, city, venue, start_date, end_date, 
                    format_type, entry_fee, prize_pool, max_teams, 
                    organizer_name, organizer_contact
                ) VALUES ?
            `;
            await conn.query(insertSQL, [batch]);
            console.log(`✅ Seeded ${batch.length} tournaments into MySQL.`);
        } else {
            console.log(`✅ Database ready with ${existing[0].total} existing tournaments.`);
        }

    } catch (err) {
        console.error('❌ Database Initialization Failed:', err.message);
    } finally {
        if (conn) conn.release();
    }
}

initializeDatabase();

/* ======================================================
   1. AUTHENTICATION (SIGNUP & LOGIN)
====================================================== */
app.post('/register', async (req, res) => {
    const { fullname, email, password } = req.body;
    if (!fullname || !email || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)';

        await pool.query(query, [fullname, email, hashedPassword]);
        return res.status(200).json({ success: true, message: 'Account created successfully!' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Email is already registered.' });
        }
        return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please fill in all fields.' });
    }

    try {
        const query = 'SELECT * FROM users WHERE email = ?';
        const [results] = await pool.query(query, [email]);

        if (!results || results.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid email or password.' });
        }

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);

        if (match) {
            return res.status(200).json({ success: true, message: 'Login successful!', name: user.fullname });
        } else {
            return res.status(400).json({ success: false, message: 'Invalid email or password.' });
        }
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

/* ======================================================
   2. TOURNAMENTS & REGISTRATION (HOME TAB)
====================================================== */
app.get('/api/tournaments', async (req, res) => {
    try {
        const query = `
            SELECT t.*, 
                   COUNT(r.id) AS registered_count
            FROM tournaments t
            LEFT JOIN team_registrations r ON t.id = r.tournament_id
            GROUP BY t.id
            ORDER BY t.start_date ASC
        `;
        const [rows] = await pool.query(query);
        res.json({ success: true, tournaments: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch tournaments: ' + err.message });
    }
});

app.post('/api/tournaments/register', async (req, res) => {
    try {
        const {
            tournamentId, teamName, captainName, captainEmail, captainContact,
            viceCaptainName, playerRoster, kitJerseyColor, cityOrigin
        } = req.body;

        if (!tournamentId || !teamName || !captainName || !captainEmail || !captainContact || !playerRoster) {
            return res.status(400).json({ 
                success: false, 
                message: 'Mandatory fields missing! Please provide team name, captain details, contact, and player roster.' 
            });
        }

        const [rows] = await pool.query(
            `SELECT t.id, t.max_teams, COUNT(r.id) AS current_teams 
             FROM tournaments t 
             LEFT JOIN team_registrations r ON t.id = r.tournament_id 
             WHERE t.id = ? 
             GROUP BY t.id, t.max_teams`, 
            [tournamentId]
        );

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Tournament not found in database.' });
        }

        const tournament = rows[0];

        if (Number(tournament.current_teams) >= Number(tournament.max_teams)) {
            return res.status(400).json({ success: false, message: 'Tournament bracket is completely full!' });
        }

        await pool.query(
            `INSERT INTO team_registrations 
            (tournament_id, team_name, captain_name, captain_email, captain_contact, vice_captain_name, player_roster, kit_jersey_color, city_origin) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tournamentId, teamName.trim(), captainName.trim(), captainEmail.trim(), captainContact.trim(),
                (viceCaptainName || '').trim(), playerRoster.trim(), kitJerseyColor || 'Not Specified', cityOrigin || 'Maharashtra'
            ]
        );

        return res.status(201).json({ 
            success: true, 
            message: `🎉 Squad "${teamName}" officially registered into MySQL database with complete roster!` 
        });

    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'This Captain Email has already registered a squad for this tournament!' });
        }
        return res.status(500).json({ success: false, message: 'MySQL Database error: ' + err.message });
    }
});

/* ======================================================
   3. SOLO POOL (READ & WRITE)
====================================================== */
app.get('/api/solopool', async (req, res) => {
    try {
        const [players] = await pool.query('SELECT * FROM solo_pool ORDER BY id DESC');
        res.json({ success: true, players });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

app.post('/api/solopool/register', async (req, res) => {
    try {
        const { playerName, sport, preferredPosition, city, contactNumber, experienceLevel, bio } = req.body;
        if (!playerName || !sport || !preferredPosition || !city || !contactNumber) {
            return res.status(400).json({ success: false, message: 'Please complete all required player fields.' });
        }

        await pool.query(
            `INSERT INTO solo_pool (player_name, sport, preferred_position, city, contact_number, experience_level, bio)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [playerName, sport, preferredPosition, city, contactNumber, experienceLevel || 'Intermediate', bio || '']
        );

        res.status(201).json({ success: true, message: 'Added to Solo Player Draft Pool!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

/* ======================================================
   4. ORGANIZER HUB ENDPOINTS
====================================================== */
// 1. Create a New Tournament (Saves directly to MySQL)
app.post('/api/tournaments/create', async (req, res) => {
    try {
        const {
            name, sport, city, venue, startDate, endDate,
            formatType, entryFee, prizePool, maxTeams,
            organizerName, organizerContact
        } = req.body;

        if (!name || !sport || !city || !venue || !startDate || !endDate || !organizerName || !organizerContact) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please complete all required tournament fields.' 
            });
        }

        const insertSQL = `
            INSERT INTO tournaments (
                name, sport, city, venue, start_date, end_date, 
                format_type, entry_fee, prize_pool, max_teams, 
                organizer_name, organizer_contact
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(insertSQL, [
            name.trim(),
            sport,
            city,
            venue.trim(),
            startDate,
            endDate,
            formatType || 'Knockout',
            parseFloat(entryFee) || 0.00,
            parseFloat(prizePool) || 0.00,
            parseInt(maxTeams) || 32,
            organizerName.trim(),
            organizerContact.trim()
        ]);

        return res.status(201).json({
            success: true,
            tournamentId: result.insertId,
            message: `🎉 Tournament "${name}" is published and live on the network!`
        });

    } catch (err) {
        console.error('Create Tournament Error:', err);
        return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

// 2. Fetch All Team Registrations for Organizer Review
app.get('/api/organizer/registrations', async (req, res) => {
    try {
        const query = `
            SELECT r.*, t.name AS tournament_name, t.sport, t.city 
            FROM team_registrations r
            JOIN tournaments t ON r.tournament_id = t.id
            ORDER BY r.registered_at DESC
        `;
        const [rows] = await pool.query(query);
        res.json({ success: true, registrations: rows });
    } catch (err) {
        console.error('Fetch Registrations Error:', err);
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

// 3. Fetch All Tournaments Along With Their Registered Teams (Nested)
app.get('/api/organizer/tournaments-with-teams', async (req, res) => {
    try {
        // Fetch tournaments (newest first)
        const [tournaments] = await pool.query(`
            SELECT t.*, COUNT(r.id) AS registered_count
            FROM tournaments t
            LEFT JOIN team_registrations r ON t.id = r.tournament_id
            GROUP BY t.id
            ORDER BY t.id DESC
        `);

        // Fetch all registrations
        const [registrations] = await pool.query(`
            SELECT * FROM team_registrations ORDER BY registered_at DESC
        `);

        // Map registrations directly into their respective tournament object
        const tournamentsWithTeams = tournaments.map(t => ({
            ...t,
            teams: registrations.filter(r => r.tournament_id === t.id)
        }));

        res.json({ success: true, tournaments: tournamentsWithTeams });
    } catch (err) {
        console.error('Error fetching tournaments with teams:', err);
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

/* ======================================================
   5. START SERVER
====================================================== */
app.listen(PORT, () => {
    console.log(`🚀 Server is running live at http://localhost:${PORT}`);
});