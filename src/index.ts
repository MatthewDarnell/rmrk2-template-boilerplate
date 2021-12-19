require('dotenv').config()
import { db_query } from "./database";
import {startBlockScanner} from "./scanner/blockScanner";

db_query(`SELECT NOW()`, "").then(async time => {
    console.log(`Starting rmrk-listener at db time: ${time.now}`)
    console.log(`Attempting To Connect On Url (${process.env.WSURL})`)
    await startBlockScanner()
})

