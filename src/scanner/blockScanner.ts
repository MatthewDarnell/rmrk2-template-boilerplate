import {getConnection} from "./connection";
import { getLastBlockScanned, setLastBlockScanned } from "../store/last_block";
import { getLatestFinalizedBlock } from 'rmrk-tools';
import { fetchAndConsolidate } from '../api/api'
import { addNft } from "../store/nft"
import { addCollection } from "../store/collection"
import {addBase } from "../store/base"
import { addInvalid} from "../store/invalid"
export const startBlockScanner = async () => {
    try {
        let conn = await getConnection(process.env.WSURL)
        let block = await getLastBlockScanned()
        let finalizedBlock = await getLatestFinalizedBlock(conn)
        if(finalizedBlock > block) {
            console.log(`Scanning ${finalizedBlock-block} blocks. (${block}  --->  ${finalizedBlock})`)
            let { bases, invalid, nfts, collections } = await fetchAndConsolidate(conn, block, finalizedBlock);
            await addNft(nfts)
            await addBase(bases, block)
            await addInvalid(invalid, block)
            await addCollection(collections, block)
            await setLastBlockScanned(finalizedBlock)
        }
    } catch(error) {
        console.error(`Error in startBlockScanner - ${error}`)
    }
    return setTimeout(startBlockScanner, parseInt(process.env.BLOCKSCANNERINTERVAL))
}