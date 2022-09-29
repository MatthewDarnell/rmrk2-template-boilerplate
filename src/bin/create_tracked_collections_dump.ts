/*
    npx ts-node src/bin/create_tracked_collections_dump.ts <dump_file> <1/0>
                                                                         ^ 1 for append lastBlock to dump_file name, 0 for no. Defaults to 0
*/
require('dotenv').config()
const fs = require('fs')

import {Client} from 'pg'
import {getCollectionById, getCollectionChangesById} from "../store/collection";
import {
    getNftChangesByNftId,
    getNftChildrenByNftId,
    getNftReactionsByNftId,
    getNftResourcesByNftId,
    getNftsByCollection
} from "../store/nft";
import { getBaseById, getBaseChangesById, getBasePartsById} from "../store/base";
import {getLastBlockScanned} from "../store/last_block";

import tar from 'tar'
const path = require('path')

import { createServer } from "http";
import cors from 'cors'
import rateLimit from 'express-rate-limit'

const express = require('express')
const app = express()


const createDumpObject = async () => {
    try {
        console.log(`Starting RMRK Dumper. Connecting at <${process.env.PGUSER}@${process.env.PGHOST}:${process.env.PGPORT} -- ${process.env.DB}>`)

        const collectionsToGet = process.env.TRACKEDCOLLECTIONS? Array.from(process.env.TRACKEDCOLLECTIONS).join('').split(', ') : []
        if(collectionsToGet.length < 1) {
            console.log(`No Tracked Collections to Dump!`)
            process.exit(0)
        }
        let client = new Client({
            user: process.env.PGUSER,
            host: process.env.PGHOST,
            database: process.env.DB,
            password: process.env.PGPASSWORD,
            port: parseInt(process.env.PGPORT),
        })
        await client.connect()



        const bases = {}
        const collections = {}
        const nfts = {}

        for(const collection of collectionsToGet) {
            const coll = await getCollectionById(collection)
            if(!coll) continue;
            if(!coll.length) continue;


            collections[collection] = coll[0]

            collections[collection]['changes'] = await getCollectionChangesById(collection) || []

            const nftsInCollection = await getNftsByCollection(collection)
            if(!nftsInCollection.length) continue;

            for(const nft of nftsInCollection) {
                const { id } = nft
                const changes = await getNftChangesByNftId(id)
                let resources = await getNftResourcesByNftId(id)
                const children = await getNftChildrenByNftId(id)
                const reactions = await getNftReactionsByNftId(id)

                for(let resource of resources) {
                    let { base } = resource
                    base = resource.base.split("'").join('')
                    if(base === 'NULL') continue;

                    if(!bases.hasOwnProperty(base)) {
                        let baseToGet = await getBaseById(base)
                        if(!baseToGet) {
                            console.error(`Failed to Get base ${resource.base}!`)
                            continue
                        }

                        bases[base] = baseToGet[0]

                        bases[base]['changes'] = await getBaseChangesById(base) || []
                        let parts = await getBasePartsById(base) || []

                        for(let part of parts) {
                            let { src } = part
                            if(src) {
                                part['src'] = src.split("'").join('')
                            }
                        }


                        bases[base]['parts'] = parts
                    }
                }

                nfts[id] = nft
                nfts[id]['changes'] = changes
                nfts[id]['resources'] = resources
                nfts[id]['children'] = children
                nfts[id]['reactions'] = reactions
            }
        }

        const lastBlock = (await getLastBlockScanned() || 1) - 1

        return {
            nfts,
            collections,
            bases,
            lastBlock
        }
    } catch(error) {
        console.log(`Error Creating Dump File: ${error}`)
    }
}


if (process.argv.length < 4) {
    console.error("Missing Dump FileName Or Seconds to Delay!\nUsage: ./app dump_filename seconds_to_delay_between_runs 1/0 (append lastBlock to filename)");
    process.exit(0)
}
let appendLastBlock = false;
let lastKnownBlock = 0;
if(process.argv.length > 4) {
    appendLastBlock = !!parseInt(process.argv[4])
}
const dumpFile = process.argv[2]
const secondsToDelay = parseInt(process.argv[3]) || 3600


createDumpObject().then(data => {
    const { lastBlock } = data
    console.log(`\nDone Reading DB. Got Last Block <${lastBlock}>`)
    lastKnownBlock = lastBlock
    if(appendLastBlock) {
        fs.writeFileSync(`${dumpFile}-${lastBlock}`, JSON.stringify(data))
    } else {
        fs.writeFileSync(dumpFile, JSON.stringify(data))

        tar.c( // or tar.create
            {
                gzip: true
            },
            [dumpFile]
        ).pipe(fs.createWriteStream(`${dumpFile}.tar.gz`))
        console.log(`Writing ${dumpFile}.tar.gz`)
    }

    return setInterval(() => {
            createDumpObject().then(data => {
                const { lastBlock } = data
                console.log(`\nDone Reading DB. Got Last Block <${lastBlock}>`)
                lastKnownBlock = lastBlock
                if(appendLastBlock) {
                    fs.writeFileSync(`${dumpFile}-${lastBlock}`, JSON.stringify(data))
                    tar.c( // or tar.create
                        {
                            gzip: true
                        },
                        [`${dumpFile}-${lastBlock}`]
                    ).pipe(fs.createWriteStream(`${dumpFile}-${lastBlock}.tar.gz`))
                    console.log(`Writing ${dumpFile}-${lastBlock}.tar.gz`)
                } else {
                    fs.writeFileSync(dumpFile, JSON.stringify(data))
                    tar.c( // or tar.create
                        {
                            gzip: true
                        },
                        [dumpFile]
                    ).pipe(fs.createWriteStream(`${dumpFile}.tar.gz`))
                    console.log(`Writing ${dumpFile}.tar.gz`)
                }
                console.log('Done!')
                process.exit(0)
            }).catch(console.error)
        },
        secondsToDelay * 1000
    );

}).catch(console.error)



const maxCallsPerIpPerMin = process.env.MAXCALLSPERMIN ? parseInt(process.env.MAXCALLSPERMIN) : 20;
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: maxCallsPerIpPerMin, // Limit each IP to 10 requests per `window`
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})


app.use(cors())
app.use(limiter)

const httpServer = createServer(app);

console.log(`Initializing Express Server on Port 3030`)

app.get('/', (req, res) => {
    try {
        let file = dumpFile
        if(appendLastBlock) {
            file = `${dumpFile}-${lastKnownBlock}`
        }
        return res.sendFile(`${file}.tar.gz`, (error) => {
            if(error) {
                console.error(`Failed To Send: ${error}`)
            } else {
                console.log('sent!')
            }
        })
    } catch(error) {
        console.error(`Error: ${error}`)
    }
})

httpServer.listen(  3030)
