import { getLastBlockScanned, setLastBlockScanned } from "../store/last_block";
import { Consolidator, RemarkListener } from 'rmrk-tools';
import {addNft, getNft, getNftIdsClaimingChild, removeOwner} from "../store/nft"
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
        console.log('Fetching Latest RMRK Dump...')
        const response = await fetch('https://rmrk-dumps.s3.eu-west-1.amazonaws.com/consolidated-from-latest.json');
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
    } catch(error) {
        console.error(`Error Fetching Initial Seed Dump! --- ${error}`)
        process.exit(-1)
    }
}


export let PendingBuyNfts = {}
export const startPendingBuyCanceller = async () => {
    console.log('Starting Pending Buy Canceller')
    setInterval(() => {
        let currentTime = Date.now()
        for(const nftId of Object.keys(PendingBuyNfts)) {
            if(currentTime - PendingBuyNfts[nftId] > parseInt(process.env.PENDINGBUYCANCELLERINTERVAL)) {
                delete PendingBuyNfts[nftId]
            }
        }
    },
        parseInt(process.env.PENDINGBUYCANCELLERTIMEOUT)
    )
}


const watchBuyOps = async rmrks => {
    const buyOps = rmrks.filter(rmrk => rmrk.interaction_type === 'BUY')
    let currentTime = Date.now()
    for(const rmrk of buyOps) {
        let remark = rmrk.remark
            .split('::')
        if(remark.length < 4) {
            continue;
        }
        if(!rmrk.extra_ex) {
            continue;
        }
        let extra_ex = rmrk.extra_ex
            .filter(ex => ex.call === 'balances.transfer')
        if(extra_ex.length < 1) {
            continue
        }
        let { value } = extra_ex[0]
        let nftId = remark[3]
        let nft = await getNft(nftId)
        if(!nft) {
            continue
        }
        let forSale = BigInt(nft.forsale)
        let pricePaid = BigInt(value.split(',')[1])
        if(forSale <= 0 || pricePaid < forSale) {
            continue
        }
        PendingBuyNfts[nftId] = currentTime
    }
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
    const unfinalizedSubscriber = listener.initialiseObservableUnfinalised();

    subscriber.subscribe();
    unfinalizedSubscriber.subscribe(async (rmrks) => await watchBuyOps(rmrks) );

    console.log('...RMRK Listener Subscribed and Listening')
}