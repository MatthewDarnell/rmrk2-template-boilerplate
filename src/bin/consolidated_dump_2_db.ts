require('dotenv').config()
const fs = require('fs')

import { Client } from 'pg'

import {addBase} from "../store/base";
import {addCollection} from "../store/collection";
import {addNft} from "../store/nft";
import {addInvalid} from "../store/invalid";
import {setLastBlockScanned} from "../store/last_block";

const consolidated2Db = async () => {
    try {
        let client = new Client({
            user: process.env.PGUSER,
            host: process.env.PGHOST,
            database: process.env.DB,
            password: process.env.PGPASSWORD,
            port: process.env.PGPORT,
        })
        await client.connect()

        if(process.argv.length < 3) {
            console.error("Missing Consolidated File!");
            process.exit(0)
        }
        const dumpFile = process.argv[2]
        let consolidated = fs.readFileSync(dumpFile);
        let json = JSON.parse(consolidated);
        if(!json.hasOwnProperty('nfts') ||
            !json.hasOwnProperty('collections') ||
            !json.hasOwnProperty('bases') ||
            !json.hasOwnProperty('invalid') ||
            !json.hasOwnProperty('lastBlock')
        ) {
            throw new Error('Corrupted Rmrk Dump! Missing Data')
        }

        const { nfts, collections, bases, invalid, lastBlock } = json
        const nftSize = Object.keys(nfts).length;
        const collectionSize = Object.keys(collections).length;
        const baseSize = Object.keys(bases).length;
        const invalidSize = Object.keys(invalid).length;

        console.log(`Reading: ${nftSize} nfts, ${collectionSize} collections, ${baseSize} bases, ${invalidSize} invalids.\n
                    Dump ends at Block: <${lastBlock}>`)

        /*
            Bases
        */
        console.log('Adding Bases')
        await addBase(JSON.stringify(bases), 0)

        /*
            Collections
        */
        console.log('Adding Collections')
        await addCollection(JSON.stringify(collections), 0)

        /*
            Nfts
        */
        console.log('Adding Nfts')
        await addNft(JSON.stringify(nfts))

        /*
            Invalid
        */
        console.log('Adding Invalids')
        await addInvalid(JSON.stringify(invalid), 0)

        /*
            LastBlock
        */
        console.log('Setting Last Block')
        await setLastBlockScanned(parseInt(lastBlock))
        await client.end()
        console.log('Done!')
    } catch(error) {
        console.error(`Error Converting Consolidated Rmrk To Db!: ${error}`)
    }
};


(async () => {
    await consolidated2Db()
})()

