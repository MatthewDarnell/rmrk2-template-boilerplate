require('dotenv').config()
import { db_get } from "./database";
import {startBlockScanner, startPendingBuyCanceller} from "./scanner/blockScanner";
import { startMetadataFetcher } from "./services/metadata_fetcher";
import { startTrackedCollectionCacher } from "./services/tracked_collection_for_sale_cacher";
import { startHttpServer } from "./api/server"
import { startSocketApi } from "./api/socket"
import { startDbListener } from "./api/listener";

console.log(`Starting Rmrk Listener. Connecting at <${process.env.PGUSER}@${process.env.DB}>`)

db_get(`SELECT NOW()`, "").then(async time => {
    try {
        console.log(`🕰 Starting rmrk-listener at db time: ${time[0].now}`)
        console.log(`📶 Attempting To Connect On Url (${process.env.WSURL})`)

        const runHttpServer = process.env.RUNHTTPAPI ? process.env.RUNHTTPAPI === 'true' : false;

        if(runHttpServer) {
            console.log('Starting Http Server');
            startHttpServer();
            const runWebSocketServer = process.env.RUNSOCKETAPI ? process.env.RUNSOCKETAPI === 'true' : false;
            if(runWebSocketServer) {    //Websocket Server runs on Http Server
                console.log(`Starting Web Socket Server`);
                startSocketApi();
            }
        }

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

