import { getLastBlockScanned, setLastBlockScanned } from "../store/last_block";
import { Consolidator, RemarkListener } from 'rmrk-tools';
import {
    addNft,
    getNft,
    getNftIdsClaimingChild,
    removeOwner
} from "../store/nft"
import { addCollection } from "../store/collection"
import { addBase } from "../store/base"
import { InMemoryAdapter, StorageProvider } from "../store/adapter";
import { Remark } from "rmrk-tools/dist/tools/consolidator/remark";
import uniq from 'uniq'
import { getConnection } from "./connection";
import tar from 'tar-fs'
const fs = require('fs')
const https = require('https')
const zlib = require('zlib')



const readConsolidatedFileIntoMemoryAndSaveToDb = async fileName => {
    console.log(`Reading File: ${fileName}`);
    const file = JSON.parse(
        fs.readFileSync(fileName, 'utf8')
    );

    // @ts-ignore
    const { lastBlock, nfts, collections, bases } = file;

    let dbLastKnownBlock = parseInt(await getLastBlockScanned())
    console.log('Recreating State From Dump, Last Block In Dump: ' + lastBlock + '. Last We Remember: ' + dbLastKnownBlock);

    if(dbLastKnownBlock < lastBlock) {
        await setLastBlockScanned(0)
        dbLastKnownBlock = 0
        console.log('Inserting Latest RMRK Dump Into DB, this could take a while...')

        console.log('Importing Bases')
        await addBase(bases)

        console.log('Importing Collections')
        await addCollection(collections)

        console.log('Importing Nfts')
        await addNft(nfts, dbLastKnownBlock)

        await setLastBlockScanned(lastBlock)
        console.log('...Done')
    }
    await setLastBlockScanned(lastBlock)
    return ({ lastBlock: lastBlock + 1, nfts, collections, bases });
}

const initialSeed = () => {
    return new Promise(async res => {
        try {
            const dumpUrl = process.env.RMRKDUMP ? process.env.RMRKDUMP : null
            const isTarball = process.env.RMRKDUMPISTAR ? process.env.RMRKDUMPISTAR === 'true' : false
            const isGzip = process.env.RMRKDUMPISGZ ? process.env.RMRKDUMPISGZ === 'true' : false

            if(!dumpUrl) {  //No dump, start syncing from block 0
                console.log(`No Dump to Fetch, begin syncing from block 0...`)
                await setLastBlockScanned(0)
                return res({ lastBlock:  0, nfts: {}, collections: {}, bases: {} });
            }
            console.log(`Fetching Latest RMRK Dump: <${dumpUrl}> (.tar? ${isTarball} , .gz? ${isGzip})...`)
            https.get(dumpUrl, response => {
                const stream = fs.createWriteStream("./rmrk-dump.file")
                response.pipe(stream)
                stream.on('open', () => {
                    console.log('Began Downloading')
                })
                stream.on("finish", () => {
                    console.log(`Download Completed! Read ${stream.bytesWritten/1000000} MB!`);
                    let file = fs.readFileSync('./rmrk-dump.file')

                    if(isGzip) {
                        console.log('Began Unzipping File')
                        file = zlib.gunzipSync(file)
                        fs.writeFileSync('./rmrk-dump.file.unzipped', file)
                        console.log('Finished Unzipping!')
                    }

                    if(isTarball) {
                        console.log('Began Extracting')
                        let readStream = fs.createReadStream('./rmrk-dump.file.unzipped')
                        const extract = tar.extract('.')
                        readStream.pipe(extract)
                        let fileName
                        extract.on('entry', function(header, stream, next) {    //Assuming there is only 1 file in this tarball
                            fileName = header.name
                            stream.on('end', function() {
                                next() // ready for next entry
                            })
                        })
                        extract.on('error', data => {
                            console.error(data)
                            process.exit(0)
                        })
                        extract.on('finish', async () => {
                            console.log('Finished Extracting!')
                            return res(readConsolidatedFileIntoMemoryAndSaveToDb(fileName));
                        })
                    } else {    //not a tarball, just read the file
                        return res(readConsolidatedFileIntoMemoryAndSaveToDb('./rmrk-dump.file.unzipped'));
                    }
                });
            })
        } catch(error) {
            console.error(`Error Fetching Initial Seed Dump! --- ${error}`)
            process.exit(-1)
        }
    })
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
        let nftId = remark[3]

        if(PendingBuyNfts.hasOwnProperty(nftId)) {  //We already know it's being purchased, this tx was just seen again, ignore
            //console.log(`Ignoring ${nftId} -- already know it's being bought.`)
            continue;
        }

        let nft = await getNft(nftId)
        if(!nft) {
            continue
        }

        let royaltyPercentage = 0;
        let royaltyPaid = BigInt(0);

        if(nft.properties) {
            if(nft.properties.hasOwnProperty('royaltyInfo')) {
                if(nft.properties.royaltyInfo.hasOwnProperty('value')) {
                    let royaltyObject = nft.properties.royaltyInfo.value;
                    if(royaltyObject.hasOwnProperty('receiver') && royaltyObject.hasOwnProperty('royaltyPercentFloat')) {
                        royaltyPercentage = Math.floor(parseFloat(royaltyObject.royaltyPercentFloat));
                        royaltyPaid = extra_ex
                            .filter(v => v.value.split(',')[0] === royaltyObject.receiver)
                            .map(v =>
                                BigInt(v.value.split(',')[1])
                            )
                            .reduce((prev, curr) => prev + curr, BigInt(0))
                    }
                }
            }
        }

        let valueSum = extra_ex
            .filter(v => v.value.split(',')[0] === nft.owner)
            .map(v =>
                BigInt(v.value.split(',')[1])
            )
            .reduce((prev, curr) => prev + curr, BigInt(0))

        valueSum += royaltyPaid

        let forSale = BigInt(nft.forsale) +
            (
                (BigInt(royaltyPercentage) *
                BigInt(nft.forsale)) / BigInt(100)
            );
        //console.log(`Nft Being Bought: ${nftId} --- Royalty Percentage: ${royaltyPercentage} --- ForSale Price: ${forSale} --- Royalties Paid: ${royaltyPaid} -- Total Paid: ${valueSum}`)
        if(forSale <= 0 || valueSum < forSale) {
            continue
        }

        PendingBuyNfts[nftId] = currentTime
    }
}

export const startBlockScanner = async () => {
    // @ts-ignore
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
        const consolidator = new Consolidator(2, adapter, false, true);
        const result = await consolidator.consolidate(remarks);
        const interactionChanges = result.changes || [];
        // SYNC to DB interactionChanges

        const affectedIds = interactionChanges?.length
            ? interactionChanges
                .map((c) => (Object.values(c))).flat()
                .filter(el => el !== undefined)
            : [];

        if(lastBlock > 0) {
            await setLastBlockScanned(lastBlock)
        }
        if(affectedIds.length < 1) {
            return result;
        }

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
        console.log(`Consolidated Blocks ${lastKnownBlock} ---> ${lastBlock} ????`)
        //await addInvalid(affectedInvalids, block)
        await addBase(affectedBases)
        await addCollection(affectedCollections)
        await addNft(affectedNfts, lastKnownBlock)

        return result;
    };

    const unfinalisedConsolidateFunction = async (remarks: Remark[]) => {
        const consolidator = new Consolidator()
        return consolidator.consolidate(remarks)
    }

    const listener = new RemarkListener({
        polkadotApi: api,
        prefixes: RMRK_PREFIXES,
        consolidateFunction,
        storageProvider,
    });

    const subscriber = listener.initialiseObservable();
    const unfinalizedSubscriber = (new RemarkListener({
        polkadotApi: api,
        prefixes: RMRK_PREFIXES,
        consolidateFunction: unfinalisedConsolidateFunction,
    })).initialiseObservableUnfinalised();

    subscriber.subscribe();
    unfinalizedSubscriber.subscribe(async (rmrks) => await watchBuyOps(rmrks) );

    console.log('...RMRK Listener Subscribed and Listening')
}