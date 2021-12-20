
import { createServer } from "http";

import { setupLastBlockRoute } from "./routes/last_block";
import { setupBaseRoutes } from "./routes/base";
import { setupCollectionRoutes } from "./routes/collection";
import { setupInvalidRoute } from "./routes/invalid";
import { setupRemarksRoute } from "./routes/remarks";

const express = require('express')
const app = express()

const httpServer = createServer(app);

console.log(`Initializing Express Server on Port ${parseInt(process.env.SERVERPORT) || 3000}`)

httpServer.listen( parseInt(process.env.SERVERPORT) || 3000)

export const getServer = () => httpServer

setupLastBlockRoute(app)
setupBaseRoutes(app)
setupCollectionRoutes(app)
setupInvalidRoute(app)
setupRemarksRoute(app)