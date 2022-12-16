/*
    npx ts-node src/bin/create_tracked_collections_dump.ts <dump_file> <1/0>
                                                                         ^ 1 for append lastBlock to dump_file name, 0 for no. Defaults to 0
*/
require('dotenv').config()
const fs = require('fs')

import {open_database, close_database} from '../database'
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

const lastBlockFile = process.env.LASTBLOCKFILE ? process.env.LASTBLOCKFILE : "lastblock.json";
const maxDumpFilesToKeep = process.env.MAXDUMPSTOKEEP ? parseInt(process.env.MAXDUMPSTOKEEP) : 1;
const dumpFile = process.argv[2]

const getLatestBlockRead = () => {
    try {
        return parseInt(
            JSON.parse(
            fs.readFileSync(lastBlockFile)
        )
                ['lastBlock']
        );
    } catch(error) {
        console.log(`Error Reading Last Block File.<${lastBlockFile}>. Setting to 0`);
        return 0;
    }
}

const updateLatestBlockRead = block => {
    try {
        const latestBlockInFile = getLatestBlockRead();
        if(parseInt(block) > latestBlockInFile) {
            fs.writeFileSync(lastBlockFile,
                JSON.stringify({
                    lastBlock: parseInt(block)
                }
            ));
        }
    } catch(error) {
        console.error(`Failed To Update Latest Block Read to <${block}>!`);
        console.error(error);
    }
}

const createDumpObject = async () => {
    try {
        const latestBlockOfDumpFile = getLatestBlockRead();
        console.log(`Starting RMRK Dumper.\n\tConnecting at <${process.env.PGUSER}@${process.env.PGHOST}:${process.env.PGPORT} -- ${process.env.DB}>\n\tLast Block File Stored at ${lastBlockFile} (${latestBlockOfDumpFile})`)
        open_database();
        const collectionsToGet = process.env.TRACKEDCOLLECTIONS? Array.from(process.env.TRACKEDCOLLECTIONS).join('').split(', ') : []
        if(collectionsToGet.length < 1) {
            console.log(`No Tracked Collections to Dump!`)
            process.exit(0)
        }

        const bases = {}
        const collections = {}
        const nfts = {}


        const lastBlock = (await getLastBlockScanned() || 1) - 1

        if(latestBlockOfDumpFile >= lastBlock) {
            return {
                lastBlock,
                updated: false
            }
        }

        for(const collection of collectionsToGet) {
            const coll = await getCollectionById(collection)
            if(!coll) continue;
            if(!coll.length) continue;


            collections[collection] = coll[0]


            try {
                collections[collection]['changes'] = await getCollectionChangesById(collection) || []
            } catch(error) {
                console.error(error)
                console.log(`collections[collection]: ${collections} [${collection}] is undefined`)
                continue
            }

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
                        try {
                            bases[base]['changes'] = await getBaseChangesById(base) || []
                        } catch(error) {
                            console.error(error)
                            console.log(`bases[base]: ${bases} [${base}] is undefined`)
                            console.log(baseToGet[0])
                            continue
                        }

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

                try {
                    nfts[id]['changes'] = changes
                } catch(error) {
                    console.error(error)
                    console.log(`nfts[id]: ${nfts} [${id}] is undefined`)
                    continue
                }

                nfts[id]['resources'] = resources
                nfts[id]['children'] = children
                nfts[id]['reactions'] = reactions
            }
        }


        await close_database()
        updateLatestBlockRead(lastBlock);
        return {
            nfts,
            collections,
            bases,
            lastBlock,
            updated: true
        }
    } catch(error) {
        await close_database()
        console.log(`Error Creating Dump File: ${error}`)
    }
}


if (process.argv.length < 4) {
    console.error("Missing Dump FileName Or Seconds to Delay!\nUsage: ./app dump_filename seconds_to_delay_between_runs 1/0 (append lastBlock to filename)");
    process.exit(0)
}
let appendLastBlock = true;
let lastKnownBlock = 0;
if(process.argv.length > 4) {
    appendLastBlock = !!parseInt(process.argv[4])
}

const secondsToDelay = parseInt(process.argv[3]) || 3600


const writeFile = data => {
    try {
        const folderOfDumpFiles = path.dirname(dumpFile)
        const fileName = path.basename(dumpFile);
        let oldFiles = fs.readdirSync(folderOfDumpFiles)
            .filter(file => file.includes(fileName))
        let compressedOldDumpFiles = oldFiles
            .filter(file => file.includes('tar.gz'))
        let rawDumpFiles = oldFiles.filter(file => compressedOldDumpFiles.indexOf(file) === -1)

        if(rawDumpFiles.length > maxDumpFilesToKeep) {
            const numToDelete = rawDumpFiles.length - maxDumpFilesToKeep;
            for(let i = 0; i < numToDelete; i++) {
                console.log(`Deleting Old Raw Dump File ${folderOfDumpFiles} / ${rawDumpFiles[i]}`)
                fs.unlinkSync(`${folderOfDumpFiles}/${rawDumpFiles[i]}`)
            }
        }
        if(compressedOldDumpFiles.length > maxDumpFilesToKeep) {
            const numToDelete = compressedOldDumpFiles.length - maxDumpFilesToKeep;
            for(let i = 0; i < numToDelete; i++) {
                console.log(`Deleting Old Compressed Dump File ${compressedOldDumpFiles[i]}`)
                fs.unlinkSync(`${folderOfDumpFiles}/${compressedOldDumpFiles[i]}`)
            }
        }


        if(data['updated']) {
            const oF = `${folderOfDumpFiles}/${data['lastBlock']}-${fileName}`;
            console.log(`Writing New Dump ${oF}.tar.gz`);
            if(appendLastBlock) {
                fs.writeFileSync(oF, JSON.stringify(data))
                tar.c( // or tar.create
                    {
                        gzip: true
                    },
                    [oF]
                ).pipe(fs.createWriteStream(`${oF}.tar.gz`))

            } else {
                fs.writeFileSync(oF, JSON.stringify(data))
                tar.c( // or tar.create
                    {
                        gzip: true
                    },
                    [dumpFile]
                ).pipe(fs.createWriteStream(`${oF}.tar.gz`))
            }
            console.log(`Writing ${dumpFile}.tar.gz\nWaiting ${secondsToDelay} seconds.`)
        }
    } catch(error) {
        console.error('Error Writing File');
        console.error(error);
    }
}

createDumpObject().then(data => {
    const { lastBlock, updated } = data
    console.log(`\nDone Reading DB. Got Last Block <${lastBlock}>. Updated Dump ? ${updated}`);
    lastKnownBlock = lastBlock
    writeFile(data);
    return setInterval(() => {
            createDumpObject().then(data => {
                const { lastBlock, updated } = data
                console.log(`\nDone Reading DB. Got Last Block <${lastBlock}>`)
                lastKnownBlock = lastBlock
                writeFile(data);
                console.log('Done!')
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
            file = `${lastKnownBlock}-${dumpFile}`
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
