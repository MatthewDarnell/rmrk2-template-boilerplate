import {db_get} from "../database";

require('dotenv').config()
const fs = require('fs')

import { Client } from 'pg'


import {setLastBlockScanned} from "../store/last_block";
import { addRemarkArray } from "../store/remarks";

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
                    rmrk['extra_ex'] = JSON.stringify(extras)
                }
                return rmrk
            }))
        })))    //returns array of arrays
            .flat()

        console.log(`Inserting ${remarkArray.length} RMRKs`)
        await addRemarkArray(remarkArray)

        let maxBlock = 0
        remarkArray.map(rmrk => {
            if(rmrk.block > maxBlock) {
                maxBlock = rmrk.block
            }
        })

        console.log('Setting Last Block: ', maxBlock)
        await setLastBlockScanned(maxBlock)

        await client.end()
        console.log('Done!')
    } catch(error) {
        console.error(`Error Converting Consolidated Rmrk To Db!: ${error}`)
    }
};


(async () => {
    await unConsolidated2Db()
})()

