
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
        }
    });
}

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const newUser = {
    name: 'Na Oliveira',
    email: 'psi.naoliveira@gmail.com',
    role: 'admin'
};

const DEFAULT_PASSWORD = '@1234';

async function addNewAdmin() {
    const client = await pool.connect();
    try {
        console.log(`Adding new admin user: ${newUser.email}...`);

        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

        // Check if user exists
        const checkRes = await client.query("SELECT id FROM users WHERE email = $1", [newUser.email]);

        if (checkRes.rows.length > 0) {
            console.log(`User ${newUser.email} already exists. Ensuring admin role and resetting password...`);
            await client.query(
                "UPDATE users SET role = 'admin', is_active = true, password = $2 WHERE email = $1",
                [newUser.email, hashedPassword]
            );
        } else {
            console.log(`Creating new user ${newUser.email}...`);
            await client.query(
                `INSERT INTO users (email, password, name, role, is_active) 
                 VALUES ($1, $2, $3, $4, true)`,
                [newUser.email, hashedPassword, newUser.name, newUser.role]
            );
        }

        console.log('User processed successfully.');

    } catch (err) {
        console.error('Failed to add user:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

addNewAdmin();
