require('dotenv').config()
import { db_get } from "./database";
import {startBlockScanner, startPendingBuyCanceller} from "./scanner/blockScanner";
import { startMetadataFetcher } from "./services/metadata_fetcher";
import { startTrackedCollectionCacher } from "./services/tracked_collection_for_sale_cacher";
import { startSocketApi } from "./api/socket"
import { startDbListener } from "./api/listener";

console.log(`Starting Rmrk Listener. Connecting at <${process.env.PGUSER}@${process.env.DB}>`)

db_get(`SELECT NOW()`, "").then(async time => {
    try {
        console.log(`Starting rmrk-listener at db time: ${time[0].now} 🕰`)
        console.log(`📶 Attempting To Connect On Url (${process.env.WSURL})`)
        startSocketApi()
        await startDbListener()
        await startTrackedCollectionCacher()
        await startBlockScanner()
        await startPendingBuyCanceller()
        await startMetadataFetcher()
        console.log(`Rmrk Listener Running! 😊`)
    } catch(error) {
        console.error(`😡 Error Starting rmrk-listener: ${error}`)
        process.exit(0)
    }
})

