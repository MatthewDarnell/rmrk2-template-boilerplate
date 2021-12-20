const { Pool, Client } = require('pg')

export const getDbString = () => {
    return {
        user: process.env.PGUSER,
            host: process.env.PGHOST,
        database: process.env.DB,
        password: process.env.PGPASSWORD,
        port: process.env.PGPORT,
    }
}
const pool = new Pool(getDbString())

// the pool with emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err) // your callback here
    process.exit(-1)
})

pool.connect().then(client => {
    console.log(`Connected To Database.(${process.env.DB})`)
    client.release()
}).catch(err => {
    console.error(`Error Connecting To Database.(${process.env.DB}) : ${err}`)
    process.exit(1)
})


export const db_query = async (text, params) => {
    let client;
    let res
    try {
        client = await pool.connect()
        res = await client.query(text, params)
    } catch (error) {
        console.error(`Error db query: ${error}`)
    } finally {
        client.release()
    }
    return res
}

export const db_get = async (text, params) => {
    let client;
    let res
    try {
        client = await pool.connect()
        res = await client.query(text, params)
    } catch (error) {
        console.error(`Error db query: ${error}`)
    } finally {
        client.release()
    }
    return res.rows
}

export const close_database = () => {
    console.log(`Shutting Down Database.(${process.env.DB})`)
    pool.end();
}

