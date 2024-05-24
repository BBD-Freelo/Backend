import { Pool, PoolConfig } from 'pg';

export const DBPool = new Pool({
    connectionString: process.env.DB_CONNECTION_STRING,
    ssl: {
        rejectUnauthorized: false
    }
});