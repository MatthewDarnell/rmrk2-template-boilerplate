import { getLastBlockScanned, setLastBlockScanned } from "../store/last_block";
import { getLatestFinalizedBlock } from 'rmrk-tools';
import { fetch, consolidate } from '../api/api'
import { addNft } from "../store/nft"
import { addCollection } from "../store/collection"
import {addBase } from "../store/base"
import { addInvalid} from "../store/invalid"

export const startBlockScanner = async conn => {
    try {
        let blockScannerMaxChunk = parseInt(process.env.BLOCKSCANNERMAXCHUNK) || 100
        let block = await getLastBlockScanned()
        let finalizedBlock = await getLatestFinalizedBlock(conn)
        if(blockScannerMaxChunk < 0) {
            blockScannerMaxChunk = finalizedBlock
        }
        if(finalizedBlock > block) {
            let to = finalizedBlock - block > blockScannerMaxChunk ? block + blockScannerMaxChunk : finalizedBlock
            console.log(`Scanning ${to-block} blocks. (${block}  --->  ${to})`)
            let remarks = await fetch(conn, block, to)
            remarks = [...remarks]
            let { bases, invalid, nfts, collections } = await consolidate(conn, block, remarks);
            await addInvalid(invalid, block)
            await addBase(bases, block)
            await addCollection(JSON.parse(collections), block)
            await addNft(nfts)
            await setLastBlockScanned(to)

        }
    } catch(error) {
        console.error(`Error in startBlockScanner - ${error}`)
    }
    return setTimeout(() => {
        startBlockScanner(conn)
    }, parseInt(process.env.BLOCKSCANNERINTERVAL) || 60000)
}