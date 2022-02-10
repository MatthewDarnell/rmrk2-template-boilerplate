import {getLastBlockScanned, setLastBlockScanned} from "../store/last_block";
import {Consolidator, getLatestFinalizedBlock} from 'rmrk-tools';
import { fetch, consolidate } from '../api/api'
import { addNft } from "../store/nft"
import { addCollection } from "../store/collection"
import {addBase } from "../store/base"
import { addInvalid} from "../store/invalid"
import {InMemoryAdapter} from "../store/adapter";

export const initBlockScanner = async (conn, nfts = {}, collections = {}, bases = {}) => {
    try {
        const adapter = new InMemoryAdapter(nfts, collections, bases)
        const consolidator = new Consolidator(parseInt(process.env.SS58ADDRESSFORMAT), adapter, false, true);
        await consolidate(conn, consolidator, true, 0, 0);
        return {
            adapter,
            consolidator
        }
    } catch (err) {
        console.error(`Error initializing Block Scanner: ${err}`)
    }
}

export const startBlockScanner = async (conn, adapter, consolidator) => {
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

            let { invalid, bases, nfts, collections, changes } = await consolidate(conn, consolidator, false, block, to, remarks);

            const interactionChanges = changes
            const affectedIds = interactionChanges?.length
                ? interactionChanges.map((c) => Object.values(c)).flat()
                : [];

            let affectedNfts = {},
                affectedCollections = {},
                affectedBases = {},
                affectedInvalids = []


            let keysToKeep = Object.keys(nfts)
            keysToKeep = keysToKeep.filter(key => affectedIds.includes(key))

            for(const key of keysToKeep) {
                affectedNfts[key] = nfts[key]
            }

            keysToKeep = Object.keys(collections)
            keysToKeep = keysToKeep.filter(key => affectedIds.includes(key))
            for(const key of keysToKeep) {
                affectedCollections[key] = collections[key]
            }

            keysToKeep = Object.keys(bases)
            keysToKeep = keysToKeep.filter(key => affectedIds.includes(key))
            for(const key of keysToKeep) {
                affectedBases[key] = bases[key]
            }

            /*
            affectedInvalids = invalid.filter(inv => {
                for (const affectedId of affectedIds) {
                    if(inv.hasOwnProperty(affectedId)) {
                        return true
                    }
                }
                return false
            })
             */


            if(changes.length > 0) {
                console.log(`Inserting ${changes.length} changes`)
                //await addInvalid(affectedInvalids, block)
                await addBase(affectedBases, block)
                await addCollection(affectedCollections, block)
                await addNft(affectedNfts, block)
            }
            await setLastBlockScanned(to)
        }
    } catch(error) {
        console.error(`Error in startBlockScanner - ${error}`)
    }
}