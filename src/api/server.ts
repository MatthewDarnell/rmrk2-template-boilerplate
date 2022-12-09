
import { createServer } from "http";
// @ts-ignore
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { setupLastBlockRoute } from "./routes/last_block";
import { setupBaseRoutes } from "./routes/base";
import { setupCollectionRoutes } from "./routes/collection";
import { setupInvalidRoute } from "./routes/invalid";
import { setupRemarksRoute } from "./routes/remarks";
import { setupNftRoutes } from "./routes/nft";

const express = require('express')


const maxCallsPerIpPerMin = process.env.MAXCALLSPERMIN ? parseInt(process.env.MAXCALLSPERMIN) : 20;
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: maxCallsPerIpPerMin, // Limit each IP to 10 requests per `window`
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})


let httpServer;

export const getServer = () => httpServer

const setupHttpApiRoutes = app => {
    setupLastBlockRoute(app)
    setupBaseRoutes(app)
    setupCollectionRoutes(app)
    setupNftRoutes(app)
    const api = app._router.stack.filter(r=> r.route && r.route.path).map(r => r.route.path)
    app.get('/api', async (req, res) => {
        try {
            res.status(200).send(JSON.stringify(api, null, 2))
        } catch(error) {
            res.status(500).send(`Error getting api ${error}`)
        }
    })
}

export const startHttpServer = () => {
    const app = express()
    app.use(cors())
    app.use(limiter)
    httpServer = createServer(app);
    console.log(`Initializing Express Server on Port ${parseInt(process.env.SERVERPORT) || 3000}`)
    httpServer.listen( parseInt(process.env.SERVERPORT) || 3000)
    setupHttpApiRoutes(app);
}

