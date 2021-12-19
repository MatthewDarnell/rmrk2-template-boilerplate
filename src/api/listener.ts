import createSubscriber from "pg-listen"
import { getDbString } from "../database"

import {emitSubscriptionEvent, getApiFromTableName} from "./event"


// Accepts the same connection config object that the "pg" package would take
export const apiListenerConnect = async () => {
    const subscriber = createSubscriber(getDbString())
    console.log('Listening for Database Inserts')
    subscriber.notifications.on("insert_notify", async payload => {
        // Payload as passed to subscriber.notify() (see below)
        await emitSubscriptionEvent(getApiFromTableName(payload.tbl), payload.row)
    })

    subscriber.events.on("error", (error) => {
        console.error("Fatal database connection error:", error)
        process.exit(1)
    })

    process.on("exit", () => {
        subscriber.close()
    })
    await subscriber.connect()
    await subscriber.listenTo('insert_notify')
}