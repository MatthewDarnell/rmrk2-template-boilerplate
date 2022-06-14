import fetch, { Headers } from 'node-fetch'
const R = require('ramda');

import {db_get, db_query} from "../database";


export const getNftsByCollection = async collectionId => {
    const query = `SELECT * FROM nfts_2 WHERE collection=$1`
    return (await db_get(query, [collectionId]))
}

export const getNftsByCollectionForSale = async collectionId => {
    const query = `SELECT * FROM nfts_2 WHERE collection=$1 AND forsale!='0'`
    return (await db_get(query, [collectionId]))
}

export const removeOwner = async (childId, ownerId) => {
    const query = `DELETE FROM nft_children_2 WHERE id=$1 AND nft_id=$2`
    return await db_query(query, [childId, ownerId])
}

const isNftMetadataFetched = async nftId => {
    try {
        const query = `SELECT did_fetch_metadata FROM nfts_2 WHERE id=$1;`
        return ((await db_get(query, [nftId]))[0]['did_fetch_metadata']);
    } catch(error) {
        return false
    }
}

const setNftMetadataFetched = async nftId => {
    try {
        return await db_query(
            "UPDATE nfts_2 SET did_fetch_metadata=TRUE WHERE id=$1;",
            [nftId])
    } catch(error) {
        console.error(`Error setNftMetadataFetched: ${error}`)
    }
}

export const getNftIdsClaimingChild = async childId => {
    const query = `SELECT nft_id FROM nft_children_2 WHERE id=$1`
    let nft = (await db_get(query, [childId]))
    if(nft.length > 0) {
        return nft[0].nft_id
    } else {
        return null
    }
}

export const getNftsOwnedBy = async address => {
    const query = `SELECT * FROM nfts_2 WHERE owner=$1`
    return (await db_get(query, [address]))
}

export const getNftsOwnedByInCollection = async (address, collectionId) => {
    const query = `SELECT * FROM nfts_2 WHERE owner=$1 AND collection=$2`
    return (await db_get(query, [address, collectionId]))
}

export const getNft = async nftId => {
    const query = `SELECT * FROM nfts_2 WHERE id=$1 LIMIT 1`
    let nft = await db_get(query, [nftId])
    if(nft.length > 0) {
        return nft[0]
    } else {
        console.error(`${nftId} -- getNft() not found`)
        return null
    }
}

export const getNftMetadataIpfsLink = async limit => {
    const query = `SELECT * FROM nfts_2 WHERE metadata LIKE 'ipfs://%' LIMIT $1;`
    const nfts = await db_get(query, [limit])
    return nfts.length > 0 ? nfts : []
}

export const getNumNftMetadataIpfsLink = async () => {
    try {
        const query = "SELECT COUNT(*) FROM nfts_2 WHERE metadata LIKE 'ipfs://%';";
        const num = await db_get(query, "")
        return num.length > 0 ? num[0].count : 0
    } catch(error) {
        console.error(`Error Retrieving Ipfs Metadata Links: ${error}`)
        return 0
    }
}

export const getNftChildrenByNftId = async nftId => {
    const query = `SELECT nfts_2.collection, nft_children_2.id, ` +
        ` nft_children_2.pending, nft_children_2.equipped FROM nft_children_2` +
        ` INNER JOIN nfts_2 ON nfts_2.id=nft_children_2.nft_id` +
        ` WHERE nfts_2.id=$1`
    return (await db_get(query, [nftId]))
}

export const getNftChangesByNftId = async nftId => {
    const query = `SELECT nfts_2.collection, nft_changes_2.*` +
        ` FROM nft_changes_2` +
        ` INNER JOIN nfts_2 ON nfts_2.id=nft_changes_2.nft_id` +
        ` WHERE nfts_2.id=$1` +
        ` ORDER BY block ASC, change_index ASC`
    return (await db_get(query, [nftId]))
}

export const getNftResourcesByNftId = async nftId => {
    const query = `SELECT nfts_2.collection, nft_resources_2.*` +
        ` FROM nft_resources_2` +
        ` INNER JOIN nfts_2 ON nfts_2.id=nft_resources_2.nft_id` +
        ` WHERE nfts_2.id=$1`
    return (await db_get(query, [nftId]))
}

export const getNftReactionsByNftId = async nftId => {
    const query = `SELECT nfts_2.collection, nft_reactions_2.*` +
        ` FROM nft_reactions_2` +
        ` INNER JOIN nfts_2 ON nfts_2.id=nft_reactions_2.nft_id` +
        ` WHERE nfts_2.id=$1`
    return (await db_get(query, [nftId]))
}

export const getNftResources = async () => {
    const query =  "select json_object_agg(t.id,\n" +
        "    json_build_object('nft_id', t.nft_id,\n" +
        "        'pending', t.pending,\n" +
        "        'src', t.src,\n" +
        "        'slot', t.slot,\n" +
        "        'thumb', t.thumb,\n" +
        "        'theme', t.theme,\n" +
        "        'base', t.base,\n" +
        "        'parts', t.parts,\n" +
        "        'themeid', t.themeid,\n" +
        "        'metadata', t.metadata\n" +
        "        )) as json from\n" +
        "                        (\n" +
        "                           select * from nft_resources_2 \n" +
        "                        ) as t;\n"
    return ((await db_get(query, []))[0]['json'])
}

export const addNft = async (nftMap, from) => {
    try {
        const insert = "INSERT INTO nfts_2 (id, block, collection, symbol, priority, transferable, sn, metadata, owner, " +
            "rootowner, forsale, burned, properties, pending, updatedAtBlock) " +
            "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) " +
            " ON CONFLICT (id) DO UPDATE SET block = excluded.block, collection = excluded.collection, symbol = excluded.symbol, priority = excluded.priority, " +
            "transferable = excluded.transferable, sn = excluded.sn, owner = excluded.owner, " +
            "rootowner = excluded.rootowner, forsale = excluded.forsale, burned = excluded.burned, " +
            "properties = excluded.properties, updatedAtBlock = excluded.updatedAtBlock;";
        let totalNfts = 0

        let nftArray

        const collectionsToGet = process.env.TRACKEDCOLLECTIONS ? process.env.TRACKEDCOLLECTIONS.split(', ') : []

        if(collectionsToGet.length > 0) {
            nftArray = R.values(nftMap)
                .filter(nft => process.env.TRACKEDCOLLECTIONS.includes(nft.collection))
        } else {
            nftArray = R.values(nftMap)
        }

        await Promise.all(nftArray.map(async (nft, index) => {

            if(index > 0 && (index % 1000) == 0) {
                console.log(`Inserting Nft ${index}`)
            }

            let {
                block,
                collection,
                symbol,
                priority,
                pending,
                sn,
                transferable,
                metadata,
                owner,
                rootowner,
                forsale,
                burned,
                properties,
                id,
                changes
            } = nft


            if(nft.hasOwnProperty('children')) {
                if(nft.children.length > 0) {
                    await addNftChildren(nft.id, nft.children)
                }
            }
            if(nft.hasOwnProperty('changes')) {
                if(nft.changes.length > 0) {
                    let newChanges = nft.changes.filter(change => change.block >= from)
                    //console.log(`adding ${nft.changes.length} nft changes for ${id} from blocks: ${from}`)
                    await addNftChanges(nft.id, newChanges, from)
                }
            }
            if(nft.hasOwnProperty('reactions')) {
                if(nft.reactions.length > 0) {
                    await addNftReactions(nft.id, nft.reactions)
                }
            }
            if(nft.hasOwnProperty('resources')) {
                if(nft.resources.length > 0) {
                    await addNewResource({ nftId: id, metadata, res: nft.resources })
                }
            }

            let maxBlock = parseInt(block)
            if(changes.length > 0) {
                changes.forEach(change => {
                    if(change.block > maxBlock) {
                        maxBlock = parseInt(change.block)
                    }
                })
            }
            totalNfts++

            let insertionValues = [
                id,
                block,
                collection,
                symbol,
                JSON.stringify(priority),
                transferable,
                sn,
                metadata,
                owner,
                rootowner,
                forsale,
                burned,
                JSON.stringify(properties),
                pending,
                maxBlock
            ]
            await db_query(insert, insertionValues)
        }))
        return totalNfts
    } catch(error) {
        console.error(`Error Adding Nft: ${error}`)
    }
}
export const addNftMetadata = async (nftId, index,  metadataString) => {
    try {
        const insert = "UPDATE nfts_2 SET metadata=$1, did_fetch_metadata=TRUE" +
            " WHERE id=$2;";
        let metadata = ''
        try {
            if(!metadataString) {
                return 0
            }
            if(metadataString.length < 32) {
                return 0
            }
            let metadataArray = metadataString.split('ipfs/')
            let ipfsOrHttps = metadataArray[0] === 'ipfs://'    //Some metadatas are https:// links, we need to simply GET them
            if(metadataArray.length < 1) {
                console.error(`Metadata is not ipfs: ${metadataString}`)
                return 0
            }
            metadataArray = metadataArray.slice(1)  //['ipfs://', 'ba...']
            metadata = metadataArray[0]
            if(metadata[0] !== 'Q' && metadata[0] !== 'b') {
                console.error(`Strange Metadata: ${metadataString} - ${JSON.stringify(metadataArray)} - ${metadata}`)
                return 0
            }

            let response

            if(!ipfsOrHttps) {
                // @ts-ignore
                response = await fetch(metadataString, {
                    method: 'GET'
                });
            } else {
                const usePaidGateway = process.env.IPFSUSEPAID ? process.env.IPFSUSEPAID : false;

                if(usePaidGateway) {
                    const userAgent = process.env.IPFSPAIDUSERAGENT
                    const gateway = process.env.IPFSPAIDGATEWAY
                    const method = process.env.IPFSPAIDMETHOD
                    const host = process.env.IPFSPAIDHOST
                    const projectId = process.env.IPFSPAIDPROJECTID
                    const projectSecret = process.env.IPFSPAIDSECRET

                    const headers = new Headers()

                    headers.set('Authorization', 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64'))
                    headers.set('User-Agent', userAgent)
                    headers.set('Host', host)
                    headers.set('Content-Type', 'application/json')

                    // @ts-ignore
                    response = await fetch(`${gateway}${metadata}`,
                        {
                            method,
                            auth: projectId + ':' + projectSecret,
                            host,
                            headers
                        }
                    );
                } else {
                    const gateways = process.env.IPFSGATEWAY.split(',')
                    const gateway = gateways[   //choose a random gateway
                        Math.floor(
                        Math.random() * gateways.length
                    )
                    ]
                    response = await fetch(`${gateway}/${metadata}`)
                }
            }

            if(!response.ok) {
                //Failed to fetch this metadata
                return 0;
            }

            metadata = await response.text();
            let insertionValues = [
                metadata,
                nftId,
            ]


            await db_query(insert, insertionValues)
            return 0

        } catch(error) {
            console.error(metadataString)
            console.error(error)
        }

        //Unable to fetch metadata, probably due to network or rate limit. Should try again at some point
    } catch(error) {
        console.error(`Error in addNftMetadata: ${error}`)
    }
}


const addNftChanges = async (nftId, changes, startBlock) => {
    try {
        const insert = "INSERT INTO nft_changes_2 (nft_id, change_index, field, old, new, caller, block, opType) VALUES " +
            " ($1, $2, $3, $4, $5, $6, $7, $8) " +
            " ON CONFLICT (nft_id, change_index, block) DO UPDATE SET field = excluded.field, old = excluded.old, new = excluded.new, caller = excluded.caller," +
            " opType = excluded.opType;";
        let totalChanges = 0
        await Promise.all(changes.map(async (change, index) => {
            let {
                field,
                old,
                caller,
                block,
                opType
            } = change

            if(block < startBlock) {
                return 0
            }

            let insertionValues = [
                nftId,
                index,
                field,
                old,
                change.new,
                caller,
                block,
                opType
            ]
            totalChanges++
            await db_query(insert, insertionValues)
        }))
        return totalChanges;
    } catch(error) {
        console.error(`Error in AddNftChanges: ${error}`)
        throw new Error(error)
    }
}


const addNftChildren = async (nftId, children) => {
    try {
        let insert = "INSERT INTO nft_children_2 (nft_id, id, pending, equipped) VALUES ($1, $2, $3, $4) " +
            " ON CONFLICT (nft_id, id) DO UPDATE SET pending = excluded.pending, equipped = excluded.equipped;";
        let totalChildren = 0

        await db_query("DELETE FROM nft_children_2 WHERE nft_id=$1", [nftId])

        await Promise.all(children.map(async child => {
            let {
                id,
                pending,
                equipped
            } = child
            let insertionValues = [
                nftId,
                id,
                pending,
                equipped
            ]
            totalChildren++
            await db_query(insert, insertionValues)
        }))
        return totalChildren
    } catch(error) {
        console.error(`Error in addNftChildren: ${error}`)
        throw new Error(error)
    }
}


const addNftReactions = async (nftId, reactions) => {
    try {
        let insert = "INSERT INTO nft_reactions_2 (nft_id, reaction, wallets) VALUES ($1, $2, $3) " +
            "ON CONFLICT (nft_id, reaction) DO UPDATE SET wallets = excluded.wallets;";
        let totalReactions = 0
        let arrayReactions = R.values(reactions)
        await Promise.all(arrayReactions.map(async (reaction, index) => {
            let insertionValues = [
                nftId,
                index,
                JSON.stringify(reaction)
            ]
            totalReactions++
            await db_query(insert, insertionValues)
        }))
        return totalReactions
    } catch(error) {
        console.error(`Error in addNftReactions: ${error}`)
        throw new Error(error)
    }
}


const addNewResource = async (resource) => {
    try {
        const insert = "INSERT INTO nft_resources_2 (nft_id, id, pending, src, slot, thumb, theme, base, parts, themeId, metadata) VALUES" +
            " ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) " +
            " ON CONFLICT (nft_id, id) DO UPDATE SET pending = excluded.pending, src = excluded.src, slot = excluded.slot, " +
            " thumb = excluded.thumb, theme = excluded.theme, base = excluded.base, parts = excluded.parts, themeId = excluded.themeId, metadata = excluded.metadata;";
        let totalResources = 0
        const { nftId, metadata, res } = resource
        await Promise.all(res.map(async r => {
            let {
                pending,
                id,
                thumb,
            } = r

            let parts = {}
            let base = 'NULL'
            let src = 'NULL'
            let slot = 'NULL'
            let theme
            let themeId = 'NULL'

            if(r.hasOwnProperty('src')) {
                src = `'${r.src}'`
            }
            if(r.hasOwnProperty('slot')) {
                slot = `'${r.slot}'`
            }
            if(r.hasOwnProperty('base')) {
                base = `'${r.base}'`
            }
            if(r.hasOwnProperty('theme')) {
                if(typeof r.theme === 'object') {
                    theme = r.theme
                } else {    //Some themes are string types, but our db requires jsonb
                    theme = {
                        theme: r.theme
                    }
                }
            } else {
                theme = {}
            }

            if(r.hasOwnProperty('themeId')) {
                themeId = r.themeId
            }

            if(r.parts) {
                parts = r.parts
            }

            totalResources++
            let insertionValues = [
                nftId,
                id,
                pending,
                src,
                slot,
                thumb,
                theme,
                base,
                JSON.stringify(parts),
                themeId,
                metadata
            ]
            await db_query(insert, insertionValues)
        }))
        return totalResources
    } catch(error) {
        console.error(`Error in addNftResources: ${error}`)
        throw new Error(error)
    }
}