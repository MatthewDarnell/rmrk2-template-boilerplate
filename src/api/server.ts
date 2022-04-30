
import { createServer } from "http";
import cors from 'cors'
import rateLimit from 'express-rate-limit'


import { setupLastBlockRoute } from "./routes/last_block";
import { setupBaseRoutes } from "./routes/base";
import { setupCollectionRoutes } from "./routes/collection";
import { setupInvalidRoute } from "./routes/invalid";
import { setupRemarksRoute } from "./routes/remarks";
import { setupNftRoutes } from "./routes/nft";

const express = require('express')
const app = express()


const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Limit each IP to 10 requests per `window`
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})


app.use(cors())
app.use(limiter)

const httpServer = createServer(app);

console.log(`Initializing Express Server on Port ${parseInt(process.env.SERVERPORT) || 3000}`)

httpServer.listen( parseInt(process.env.SERVERPORT) || 3000)

export const getServer = () => httpServer

setupLastBlockRoute(app)
setupBaseRoutes(app)
setupCollectionRoutes(app)
setupInvalidRoute(app)
setupRemarksRoute(app)
setupNftRoutes(app)