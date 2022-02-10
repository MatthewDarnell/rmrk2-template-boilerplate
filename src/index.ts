import {getConnection} from "./scanner/connection";

require('dotenv').config()
import {db_get} from "./database";
import {initBlockScanner, startBlockScanner} from "./scanner/blockScanner";
import { startSocketApi } from "./api/socket"
import { apiListenerConnect } from "./api/listener";


const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

db_get(`SELECT NOW()`, "").then(async time => {
    try {
        console.log(`Starting rmrk-listener at db time: ${time[0].now}`)
        console.log(`Attempting To Connect On Url (${process.env.WSURL})`)
        startSocketApi()
        await apiListenerConnect()

        //TODO: loop until get Connection
        let conn = await getConnection(process.env.WSURL)
        const { adapter, consolidator } = await initBlockScanner(conn)
        while(1) {
            await delay(parseInt(process.env.BLOCKSCANNERINTERVAL) || 1000)
            await startBlockScanner(conn, adapter, consolidator)
        }
        process.exit(0)
    } catch(error) {
        console.error(`Error Starting rmrk-listener: ${error}`)
        process.exit(0)
    }
})

