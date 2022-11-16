require('dotenv').config()
import {getCollectionById, getCollectionChangesById, getCollections} from "./store/collection";
import {
    getNftChangesByNftId,
    getNftChildrenByNftId,
    getNftReactionsByNftId,
    getNftResourcesByNftId,
    getNftsByCollection
} from "./store/nft";
import { getBaseById, getBaseChangesById, getBasePartsById} from "./store/base";
import {getLastBlockScanned} from "./store/last_block";


export const createStateObjectFromDatabase = async () => {
    try {
        const collectionsToGet = process.env.TRACKEDCOLLECTIONS ?
            Array.from(process.env.TRACKEDCOLLECTIONS)
                .join('')
                .split(', ') :
            (await getCollections())

        const bases = {}
        const collections = {}
        const nfts = {}

        for(const collection of collectionsToGet) {
            const coll = await getCollectionById(collection)
            if(!coll) continue;
            if(!coll.length) continue;


            collections[collection] = coll[0]


            try {
                collections[collection]['changes'] = await getCollectionChangesById(collection) || []
            } catch(error) {
                console.error(error)
                console.log(`collections[collection]: ${collections} [${collection}] is undefined`)
                continue
            }

            const nftsInCollection = await getNftsByCollection(collection)
            if(!nftsInCollection.length) continue;

            for(const nft of nftsInCollection) {
                const { id } = nft
                const changes = await getNftChangesByNftId(id)
                let resources = await getNftResourcesByNftId(id)
                const children = await getNftChildrenByNftId(id)
                const reactions = await getNftReactionsByNftId(id)

                for(let resource of resources) {
                    let { base } = resource
                    base = resource.base.split("'").join('')
                    if(base === 'NULL') continue;

                    if(!bases.hasOwnProperty(base)) {
                        let baseToGet = await getBaseById(base)
                        if(!baseToGet) {
                            console.error(`Failed to Get base ${resource.base}!`)
                            continue
                        }

                        bases[base] = baseToGet[0]
                        try {
                            bases[base]['changes'] = await getBaseChangesById(base) || []
                        } catch(error) {
                            console.error(error)
                            console.log(`bases[base]: ${bases} [${base}] is undefined`)
                            console.log(baseToGet[0])
                            continue
                        }

                        let parts = await getBasePartsById(base) || []

                        for(let part of parts) {
                            let { src } = part
                            if(src) {
                                part['src'] = src.split("'").join('')
                            }
                        }
                        bases[base]['parts'] = parts
                    }
                }
                nfts[id] = nft
                try {
                    nfts[id]['changes'] = changes
                } catch(error) {
                    console.error(error)
                    console.log(`nfts[id]: ${nfts} [${id}] is undefined`)
                    continue
                }
                nfts[id]['resources'] = resources
                nfts[id]['children'] = children
                nfts[id]['reactions'] = reactions
            }
        }
        const lastBlock = (await getLastBlockScanned() || 1) - 1
        console.log(`Returning: ${Object.keys(nfts).length} nfts. Last Block: ${lastBlock}`)
        return {
            nfts,
            collections,
            bases,
            lastBlock
        }
    } catch(error) {
        console.error(`Error Creating State from Db: ${error}`)
    }
}