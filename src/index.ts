require('dotenv').config()
import { db_get } from "./database";
import {startBlockScanner, startPendingBuyCanceller} from "./scanner/blockScanner";
import { startSocketApi } from "./api/socket"
import { startDbListener } from "./api/listener";
db_get(`SELECT NOW()`, "").then(async time => {
    try {
        console.log(`Starting rmrk-listener at db time: ${time[0].now}`)
        console.log(`Attempting To Connect On Url (${process.env.WSURL})`)
        startSocketApi()
        await startDbListener()
        await startBlockScanner()
        await startPendingBuyCanceller()
    } catch(error) {
        console.error(`Error Starting rmrk-listener: ${error}`)
        process.exit(0)
    }
})

