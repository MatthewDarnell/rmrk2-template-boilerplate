import {db_get} from "../database";

require('dotenv').config()
const fs = require('fs')

import { Client } from 'pg'


import {getLastBlockScanned, setLastBlockScanned} from "../store/last_block";
import { addRemarkArray } from "../store/remarks";
import {getConnection} from "../scanner/connection";
import {consolidate} from "../api/api";
import {addInvalid} from "../store/invalid";
import {addBase} from "../store/base";
import {addCollection} from "../store/collection";
import {addNft} from "../store/nft";
import {Consolidator} from "rmrk-tools";

const unConsolidated2Db = async () => {
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
            console.error("Missing Unconsolidated File!");
            process.exit(0)
        }
        const dumpFile = process.argv[2]
        let unconsolidated = fs.readFileSync(dumpFile);
        let json = JSON.parse(unconsolidated);
        if(!Array.isArray(json)) {
            throw new Error('Corrupted Rmrk Dump! Not An Array')
        }
        if(json.length < 1) {
            throw new Error('Corrupted Rmrk Dump! Empty Array')
        }

        let remarkArray = (await Promise.all(json.map(async element => {
            let block = element.block
            let calls = element.calls
            if(calls.length == 0) {
                return 0
            }
            return await Promise.all(calls.map(async obj => {
                let { call, value, caller } = obj
                let extras
                if(obj.hasOwnProperty('extras')) {
                    extras = obj.extras
                }
                if(String(call) != "system.remark") {
                    return 0
                }
                const fullRemark = Buffer.from(value.substring(2, value.length), 'hex').toString('utf8')
                const remark = Buffer.from(value.substring(2, value.length), 'hex').toString('utf8').split("::");
                if(remark.length < 3) {
                    console.error(`Malformed Remark at Block ${block}`)
                    return
                }
                                                            //[
                                                            //      'RMRK',
                let interaction_type = remark[1]            //      'MINT',
                let version = remark[2]                     //      '2.0.0',
               // let r = remark.slice(3).join('::')          //      'xxx',
                                                            //      'yyy'
                                                            //    ]


                if(String(version) != "2.0.0") {
                    return 0
                }
                let rmrk = {
                    block,
                    caller,
                    version,
                    interaction_type,
                    remark: fullRemark
                }
                if(extras) { //Join any remaining fields
                    rmrk['extra_ex'] = extras
                }
                return rmrk
            }))
        })))    //returns array of arrays
            .flat()

        console.log(`Inserting ${remarkArray.length} RMRKs, this could take a while`)
        await addRemarkArray(remarkArray)

        let maxBlock = 0
        remarkArray.map(rmrk => {
            if(rmrk.block > maxBlock) {
                maxBlock = rmrk.block
            }
        })


        console.log('Done importing Unconsolidated')
        console.log('Consolidating. This could take a while')

        let conn = await getConnection(process.env.WSURL)


        const consolidator = new Consolidator(parseInt(process.env.SS58ADDRESSFORMAT), null, false, false);


        let { invalid, bases, nfts, collections } = await consolidate(conn, consolidator, true,0, maxBlock, []);

        console.log('Setting Last Block: ', maxBlock)
        await setLastBlockScanned(maxBlock)


        console.log('Adding Invalids')
        await addInvalid(invalid, 0)

        console.log('Adding Bases')
        await addBase(bases, 0)

        console.log('Adding Collections')
        await addCollection(collections, 0)

        console.log('Adding Nfts')
        await addNft(nfts, 0)

        await client.end()
    } catch(error) {
        console.error(`Error Converting Consolidated Rmrk To Db!: ${error}`)
    }
};


(async () => {
    await unConsolidated2Db()
    console.log('Done!')
    process.exit(0)
})()

