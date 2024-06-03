import { Pool, PoolConfig } from 'pg';

console.log(process.env.CONTAINER);
const config = process.env.CONTAINER === 'true' ?
    {
        connectionString: process.env.DB_CONNECTION_STRING
    } :
    {
    connectionString: process.env.DB_CONNECTION_STRING,
        ssl: {
            rejectUnauthorized: false
        }
    }
export const DBPool = new Pool(config);