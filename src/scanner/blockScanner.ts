import { getLastBlockScanned, setLastBlockScanned } from "../store/last_block";
import { getLatestFinalizedBlock } from 'rmrk-tools';
import { fetch, consolidate } from '../api/api'
import { addNft } from "../store/nft"
import { addCollection } from "../store/collection"
import {addBase } from "../store/base"
import { addInvalid} from "../store/invalid"

export const startBlockScanner = async conn => {
    try {
        let block = await getLastBlockScanned()
        let finalizedBlock = await getLatestFinalizedBlock(conn)
        if(finalizedBlock > block) {
            console.log(`Scanning ${finalizedBlock-block} blocks. (${block}  --->  ${finalizedBlock})`)
            let remarks = await fetch(conn, block, finalizedBlock)
            remarks = [...remarks]
            await setLastBlockScanned(finalizedBlock)
            let { bases, invalid, nfts, collections } = await consolidate(conn, block, remarks);
            await addNft(nfts)
            await addBase(bases, block)
            await addInvalid(invalid, block)
            await addCollection(collections, block)
        }
    } catch(error) {
        console.error(`Error in startBlockScanner - ${error}`)
    }
    return setTimeout(() => {
        startBlockScanner(conn)
    }, parseInt(process.env.BLOCKSCANNERINTERVAL) || 60000)
}