const { Pool, Client } = require('pg')

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.DB,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
})

pool.connect().then(client => {
    console.log(`Connected To Database.(${process.env.DB})`)
    client.release()
}).catch(err => {
    console.error(`Error Connecting To Database.(${process.env.DB}) : ${err}`)
    process.exit(1)
})



export const db_query = (text, params) => {
    return new Promise((resolve, reject) => {
        pool
            .connect()
            .then(client => {
                return client
                    .query(text, params)
                    .then(res => {
                        client.release()
                        return resolve(res.rows)
                    })
                    .catch(err => {
                        client.release()
                        return reject(err)
                    })
            })
    })
}

export const close_database = () => {
    console.log(`Shutting Down Database.(${process.env.DB})`)
    pool.end();
}

