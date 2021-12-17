import {getConnection} from "./connection";
import { getLastBlockScanned, setLastBlockScanned } from "../store/last_block";
import { fetchRemarks, getRemarksFromBlocks, getLatestFinalizedBlock, Consolidator } from 'rmrk-tools';

export const startBlockScanner = async () => {
    try {
        console.log("Starting Block Scanner")

        let block = await getLastBlockScanned()
        console.log(`Last Block Scanned.(${block})`)
        let conn = await getConnection(0)
        let finalizedBlock = await getLatestFinalizedBlock(conn)

        console.log(`Finalized Block: ${finalizedBlock}`)

        if(finalizedBlock > block)
          await setLastBlockScanned(finalizedBlock)

        block = await getLastBlockScanned()
        console.log(`Last Block Scanned.(${block})`)

    } catch(error) {
        console.error(`Error in startBlockScanner - ${error}`)
    }
}