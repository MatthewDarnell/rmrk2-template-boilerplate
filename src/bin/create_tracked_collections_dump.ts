
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


const createDumpObject = async () => {
    try {
        console.log(`Starting RMRK Dumper. Connecting at <${process.env.PGUSER}@${process.env.DB}>`)

        const collectionsToGet = process.env.TRACKEDCOLLECTIONS? Array.from(process.env.TRACKEDCOLLECTIONS).join('').split(', ') : []
        if(collectionsToGet.length < 1) {
            console.log(`No Tracked Collections to Dump!`)
            return
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

createDumpObject().then(data => {
    if (process.argv.length < 3) {
        console.error("Missing Dump FileName!");
        process.exit(0)
    }
    const dumpFile = process.argv[2]


    let { nfts, collections, bases, lastBlock } = data
    console.log(`\nDone Reading DB. Got Last Block <${lastBlock}>`)
    fs.writeFileSync(dumpFile, JSON.stringify(data))
    console.log('Done!')
    process.exit(0)
}).catch(console.error)