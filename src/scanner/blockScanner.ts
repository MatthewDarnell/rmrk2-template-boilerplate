import { getLastBlockScanned, setLastBlockScanned } from "../store/last_block";
import { Consolidator, RemarkListener } from 'rmrk-tools';
import {addNft, getNftIdsClaimingChild, removeOwner} from "../store/nft"
import { addCollection } from "../store/collection"
import { addBase } from "../store/base"
import { addInvalid } from "../store/invalid"
import { InMemoryAdapter, StorageProvider } from "../store/adapter";
import { Remark } from "rmrk-tools/dist/tools/consolidator/remark";
import uniq from 'uniq'
import fetch from 'node-fetch'
import { getConnection } from "./connection";
const initialSeed = async () => {
    try {
        return {lastBlock: 0, nfts: {}, collections: {}, bases: {}}
        /*
        console.log('Fetching Latest RMRK Dump...')
        const response = await fetch('https://gateway.pinata.cloud/ipns/precon-rmrk2.rmrk.link');
        // @ts-ignore
        const { lastBlock, nfts, collections, bases } = await response.json();
        console.log('...Done')

        let dbLastKnownBlock = parseInt(await getLastBlockScanned())
        if(dbLastKnownBlock < lastBlock) {
            console.log('Inserting Latest RMRK Dump Into DB...')
            await addBase(bases)
            await addCollection(collections)
            await addNft(nfts, dbLastKnownBlock)
            await setLastBlockScanned(lastBlock)
            console.log('...Done')
        }

        return { lastBlock: lastBlock + 1, nfts, collections, bases };
        */
    } catch(error) {
        console.error(`Error Fetching Initial Seed Dump! --- ${error}`)
        process.exit(-1)
    }
}

export const watchBuyOps = rmrks => {
  console.log('watch buy ops')
    console.log(rmrks)
}

export const startBlockScanner = async () => {
    let { lastBlock, nfts, collections, bases} = await initialSeed()
    console.log(`Starting RMRK Listener from block.(${lastBlock})...`)
    const adapter = new InMemoryAdapter(nfts, collections, bases);
    const storageProvider = new StorageProvider(lastBlock);
    const RMRK_PREFIXES = ['0x726d726b', '0x524d524b'];

    const api = await getConnection(process.env.WSURL);

    const consolidateFunction = async (remarks: Remark[]) => {
        const rmrkBlocks = uniq(remarks.map((r) => r.block));
        if(rmrkBlocks.length > 0) {
            lastBlock = Math.max(...rmrkBlocks)
        }
        console.log('consolidate called on blocks ')
        console.log(rmrkBlocks)
        const consolidator = new Consolidator(2, adapter, true, true);
        const result = await consolidator.consolidate(remarks);
        const interactionChanges = result.changes || [];
        // SYNC to DB interactionChanges

        const affectedIds = interactionChanges?.length
            ? interactionChanges.map((c) => Object.values(c)).flat()
            : [];
        console.log(affectedIds)

        let updatedNfts = result.nfts
        let updatedBases = result.bases
        let updatedColls = result.collections

        let affectedNfts = {},
            affectedCollections = {},
            affectedBases = {},
            affectedInvalids = []


        let keysToKeep = Object.keys(updatedNfts)
        keysToKeep = keysToKeep.filter(key => affectedIds.includes(key))

        for(const key of keysToKeep) {
            affectedNfts[key] = updatedNfts[key]
            let ownerId = updatedNfts[key].owner
            if(ownerId) {
                if(updatedNfts.hasOwnProperty(ownerId)) {
                    affectedNfts[ownerId] = updatedNfts[ownerId]
                }
                let lastKnownOwner = await getNftIdsClaimingChild(key)
                if(lastKnownOwner) {
                    if(lastKnownOwner !== ownerId) {
                        await removeOwner(key, lastKnownOwner)
                    }
                }
            }
        }

        keysToKeep = Object.keys(updatedColls)
        keysToKeep = keysToKeep.filter(key => affectedIds.includes(key))
        for(const key of keysToKeep) {
            affectedCollections[key] = updatedColls[key]
        }

        keysToKeep = Object.keys(updatedBases)
        keysToKeep = keysToKeep.filter(key => affectedIds.includes(key))
        for(const key of keysToKeep) {
            affectedBases[key] = updatedBases[key]
        }

        let lastKnownBlock = parseInt(await getLastBlockScanned())
        console.log(`Scanned Blocks ${lastKnownBlock} ---> ${lastBlock}`)
        //await addInvalid(affectedInvalids, block)
        await addBase(affectedBases)
        await addCollection(affectedCollections)
        await addNft(affectedNfts, lastKnownBlock)
        if(lastBlock > 0) {
            await setLastBlockScanned(lastBlock)
        }
        return result;
    };

    const listener = new RemarkListener({
        polkadotApi: api,
        prefixes: RMRK_PREFIXES,
        consolidateFunction,
        storageProvider,
    });

    const subscriber = listener.initialiseObservable();
    const unfinilizedSubscriber = listener.initialiseObservableUnfinalised();

    subscriber.subscribe();
    unfinilizedSubscriber.subscribe((rmrks) => watchBuyOps(rmrks) );

    console.log('...RMRK Listener Subscribed and Listening')
}