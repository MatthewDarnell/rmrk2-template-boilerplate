const R = require('ramda');

import {db_get, db_query} from "../database";


export const getNftsByCollection = async collectionId => {
    const query = `SELECT * FROM nfts_2 WHERE collection=$1`
    return (await db_get(query, [collectionId]))
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
        throw new Error('nft not found')
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
        ` WHERE nfts_2.id=$1`
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

export const addNft = async (nftMap) => {
    try {
        const insert = "INSERT INTO nfts_2 (id, block, collection, symbol, priority, transferable, sn, metadata, owner, " +
            "rootowner, forsale, burned, properties, pending, updatedAtBlock) " +
            "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) " +
            " ON CONFLICT (id) DO UPDATE SET block = excluded.block, collection = excluded.collection, symbol = excluded.symbol, priority = excluded.priority, " +
            "transferable = excluded.transferable, sn = excluded.sn, metadata = excluded.metadata, owner = excluded.owner, " +
            "rootowner = excluded.rootowner, forsale = excluded.forsale, burned = excluded.burned, " +
            "properties = excluded.properties, updatedAtBlock = excluded.updatedAtBlock;";
        let totalNfts = 0

        let nftArray = R.values(JSON.parse(nftMap))
        await Promise.all(nftArray.map(async nft => {
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
                properties,//json
                id,
                changes
            } = nft

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
        await addNftChanges(nftArray)
        await addNewResource(nftArray);
        await addNftChildren(nftArray);
        await addNftReactions(nftArray);
        return totalNfts
    } catch(error) {
        console.error(`Error Adding Nft: ${error}`)
    }
}


const addNftChanges = async (nftArray) => {
    try {
        const insert = "INSERT INTO nft_changes_2 (nft_id, change_index, field, old, new, caller, block, opType) VALUES " +
                     " ($1, $2, $3, $4, $5, $6, $7, $8) " +
                     " ON CONFLICT (nft_id, change_index) DO UPDATE SET field = excluded.field, old = excluded.old, new = excluded.new, caller = excluded.caller," +
                     " opType = excluded.opType;";
        let totalChanges = 0
        for(let i = 0; i < nftArray.length; i++) {
            let nft = nftArray[i]
            if(!nft.hasOwnProperty('changes')) {
                continue
            }
            await Promise.all(nft.changes.map(async (change, index) => {
                let {
                    field,
                    old,
                    caller,
                    block,
                    opType
                } = change

                let insertionValues = [
                    nft.id,
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
        }
        return totalChanges;
    } catch(error) {
        console.error(`Error in AddNftChanges: ${error}`)
        throw new Error(error)
    }
}


const addNftChildren = async (nftArray) => {
    try {
        let insert = "INSERT INTO nft_children_2 (nft_id, id, pending, equipped) VALUES ($1, $2, $3, $4) " +
                     " ON CONFLICT (nft_id, id) DO UPDATE SET pending = excluded.pending, equipped = excluded.equipped;";
        let totalChildren = 0
        for(let i = 0; i < nftArray.length; i++) {
            let nft = nftArray[i]
            if(!nft.hasOwnProperty('children')) {
                continue
            }
            await Promise.all(nft.children.map(async child => {
                let {
                    id,
                    pending,
                    equipped
                } = child
                let insertionValues = [
                    nft.id,
                    id,
                    pending,
                    equipped
                ]
                totalChildren++
                if(totalChildren == 1) {
                    await db_query("DELETE FROM nft_children_2;", "")
                }
                await db_query(insert, insertionValues)
            }))
        }
        return totalChildren
    } catch(error) {
        console.error(`Error in addNftChildren: ${error}`)
        throw new Error(error)
    }
}


const addNftReactions = async (nftArray) => {
    try {
        let insert = "INSERT INTO nft_reactions_2 (nft_id, reaction, wallets) VALUES ($1, $2, $3) " +
                     "ON CONFLICT (nft_id, reaction) DO UPDATE SET wallets = excluded.wallets;";
        let totalReactions = 0
        for(let i = 0; i < nftArray.length; i++) {
            let nft = nftArray[i]
            if(!nft.hasOwnProperty('reactions')) {
                continue
            }
            let reactions = nft.reactions

            let arrayReactions = R.values(reactions)
            await Promise.all(arrayReactions.map(async (reaction, index) => {
                let insertionValues = [
                    nft.id,
                    index,
                    JSON.stringify(reaction)
                ]
                totalReactions++
                await db_query(insert, insertionValues)
            }))
        }
        return totalReactions
    } catch(error) {
        console.error(`Error in addNftReactions: ${error}`)
        throw new Error(error)
    }
}


const addNewResource = async (nftArray) => {
    try {
        const insert = "INSERT INTO nft_resources_2 (nft_id, id, pending, src, slot, thumb, theme, base, parts, themeId, metadata) VALUES" +
                       " ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) " +
                       " ON CONFLICT (nft_id, id) DO UPDATE SET pending = excluded.pending, src = excluded.src, slot = excluded.slot, " +
                       " thumb = excluded.thumb, theme = excluded.theme, base = excluded.base, parts = excluded.parts, themeId = excluded.themeId, metadata = excluded.metadata;";
        let totalResources = 0
        for(let i = 0; i < nftArray.length; i++) {
            let nft = nftArray[i]
            if(!nft.hasOwnProperty('resources')) {
                continue
            }
            await Promise.all(nft.resources.map(async resource => {
                let {
                    pending,
                    id,
                    thumb,
                } = resource

                let parts = {}
                let base = 'NULL'
                let src = 'NULL'
                let slot = 'NULL'

                if(resource.hasOwnProperty('src')) {
                    src = `'${resource.src}'`
                }
                if(resource.hasOwnProperty('slot')) {
                    slot = `'${resource.slot}'`
                }
                if(resource.hasOwnProperty('base')) {
                    base = `'${resource.base}'`
                }
                if(resource.parts) {
                    parts = resource.parts
                }
                totalResources++
                let insertionValues = [
                    nft.id,
                    id,
                    pending,
                    src,
                    slot,
                    thumb,
                    {},
                    base,
                    JSON.stringify(parts),
                    null,
                    nft.metadata
                ]
                await db_query(insert, insertionValues)
            }))
        }
        return totalResources
    } catch(error) {
        console.error(`Error in addNftResources: ${error}`)
        throw new Error(error)
    }
}