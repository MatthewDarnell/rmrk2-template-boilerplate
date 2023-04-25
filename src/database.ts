const { Pool, Client } = require('pg')

export const getDbString = () => {
    return {
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        database: process.env.DB,
        password: process.env.PGPASSWORD,
        port: process.env.PGPORT,
        max: 35
    }
}
let pool
let isDbOpen = false;

export const db_transaction = async queryArrayWithParams => {
    let client
    try {
        if(!isDbOpen) {
            open_database()
        }
        client = await pool.connect()
        await client.query('BEGIN')
        for(const queryObj of queryArrayWithParams) {
            if(!queryObj.hasOwnProperty('text') || !queryObj.hasOwnProperty('params')) {
                console.error('Malformed Transaction Query Array')
                console.log(queryArrayWithParams)
                return await client.query('ROLLBACK')
            }
            await client.query(queryObj.text, queryObj.params)
        }
        await client.query('COMMIT')
    } catch (error) {
        console.error(`Error db query: ${error}`)
        console.log(queryArrayWithParams)
        await client.query('ROLLBACK')
    } finally {
        if(client) {
            client.release()
        }
    }
}

export const db_query = async (text, params) => {
    let res
    try {
        if(!isDbOpen) {
            open_database()
        }
        res = await pool.query(text, params)
    } catch (error) {
        console.error(`Error db query: ${error}  --- ${text} `)
    } finally {
    }
    return res
}

export const db_get = async (text, params) => {
    let res
    try {
        if(!isDbOpen) {
            open_database()
        }
        res = await pool.query(text, params)
    } catch (error) {
        console.error(`Error db_get: ${error} --- ${text} -- ${params}`)
    } finally {
    }
    return res.rows
}

export const open_database = () => {
    if(isDbOpen) {
        return;
    }
    pool = new Pool(getDbString())

// the pool with emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
    pool.on('error', (err, client) => {
        console.error('Unexpected error on idle client', err) // your callback here
        process.exit(-1)
    })

    pool.connect().then(client => {
        console.log(`Connected To Database.(${process.env.DB})`)
        isDbOpen = true;
        client.release()
    }).catch(err => {
        console.error(`Error Connecting To Database.(${process.env.DB}) : ${err}`)
        process.exit(1)
    })

}
export const close_database = () => {
    if(isDbOpen) {
        console.log(`Shutting Down Database.(${process.env.DB})`)
        pool.end();
    }
    isDbOpen = false;
}

