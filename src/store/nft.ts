
import {db_get, db_query} from "../database";


export const getNftsByCollection = async collectionId => {
    const query = `SELECT * FROM nfts_2 WHERE collection='${collectionId}'`
    return (await db_get(query, ""))
}

export const getNftsOwnedBy = async address => {
    const query = `SELECT * FROM nfts_2 WHERE owner='${address}'`
    return (await db_get(query, ""))
}

export const getNftsOwnedByInCollection = async (address, collectionId) => {
    const query = `SELECT * FROM nfts_2 WHERE owner='${address}' AND collection='${collectionId}'`
    return (await db_get(query, ""))
}

export const getNft = async nftId => {
    const query = `SELECT * FROM nfts_2 WHERE id='${nftId}' LIMIT 1`
    let nft = await db_get(query, "")
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
        ` WHERE nfts_2.id='${nftId}'`
    return (await db_get(query, ""))
}

export const getNftChangesByNftId = async nftId => {
    const query = `SELECT nfts_2.collection, nft_changes_2.*` +
        ` FROM nft_changes_2` +
        ` INNER JOIN nfts_2 ON nfts_2.id=nft_changes_2.nft_id` +
        ` WHERE nfts_2.id='${nftId}'`
    return (await db_get(query, ""))
}

export const getNftResourcesByNftId = async nftId => {
    const query = `SELECT nfts_2.collection, nft_resources_2.*` +
        ` FROM nft_resources_2` +
        ` INNER JOIN nfts_2 ON nfts_2.id=nft_resources_2.nft_id` +
        ` WHERE nfts_2.id='${nftId}'`
    return (await db_get(query, ""))
}

export const getNftReactionsByNftId = async nftId => {
    const query = `SELECT nfts_2.collection, nft_reactions_2.*` +
        ` FROM nft_reactions_2` +
        ` INNER JOIN nfts_2 ON nfts_2.id=nft_reactions_2.nft_id` +
        ` WHERE nfts_2.id='${nftId}'`
    return (await db_get(query, ""))
}

export const addNft = async (nftMap) => {
    const insert = "INSERT INTO nfts_2 (id, block, collection, symbol, priority, transferable, sn, metadata, owner, rootowner, forsale, burned, properties, pending, updatedAtBlock) VALUES ";
    let insertionValues = ""
    let totalNfts = 0

    let keys = Object.keys(JSON.parse(nftMap))
    let nftArray = keys.map(name => JSON.parse(nftMap)[name])
    for(let i = 0; i < nftArray.length; i++) {
        let nft = nftArray[i]
        if(!nft.hasOwnProperty('resources')) {
            continue
        }
        nft.resources.map(resource => {
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
            insertionValues += `('${id}', ${block}, '${collection}', '${symbol}', '${JSON.stringify(priority)}', ${transferable}, '${sn}', '${metadata}', '${owner}', '${rootowner}', ${forsale}, '${burned}', '${JSON.stringify(properties)}', ${pending}, ${maxBlock}), `
        })
    }
    if(totalNfts > 0) {
        insertionValues = insertionValues.slice(0, insertionValues.length-2)
        insertionValues += ` ON CONFLICT (id) DO UPDATE SET block = excluded.block, collection = excluded.collection, symbol = excluded.symbol, priority = excluded.priority, transferable = excluded.transferable, sn = excluded.sn, metadata = excluded.metadata, owner = excluded.owner, rootowner = excluded.rootowner, forsale = excluded.forsale, burned = excluded.burned, properties = excluded.properties, updatedAtBlock = excluded.updatedAtBlock;`
        await db_query(insert + insertionValues, "")
    }
    await addNftChanges(nftArray)
    await addNewResource(nftArray);
    await addNftChildren(nftArray);
    await addNftChanges(nftArray);
    await addNftReactions(nftArray);

    return 0
}


const addNftChanges = async (nftArray) => {
    try {
        const insert = "INSERT INTO nft_changes_2 (nft_id, change_index, field, old, new, caller, block, opType) VALUES ";
        let insertionValues = ""
        let totalChanges = 0
        for(let i = 0; i < nftArray.length; i++) {
            let nft = nftArray[i]
            if(!nft.hasOwnProperty('changes')) {
                continue
            }
            nft.changes.map((change, index) => {
                let {
                    field,
                    old,
                    caller,
                    block,
                    opType
                } = change
                insertionValues += `('${nft.id}', ${index}, '${field}', '${old}', '${change.new}', '${caller}', ${block}, '${opType}'), `
                totalChanges++
            })
        }

        let query = insert + insertionValues

        if(totalChanges > 0) {
            query = query.slice(0, query.length-2)
            query += ` ON CONFLICT (nft_id, change_index) DO UPDATE SET field = excluded.field, old = excluded.old, new = excluded.new, caller = excluded.caller, opType = excluded.opType;`
            return await db_query(query, "")
        }
        return 0
    } catch(error) {
        console.error(`Error in AddNftChanges: ${error}`)
        throw new Error(error)
    }
}


const addNftChildren = async (nftArray) => {
    try {
        const insert = "INSERT INTO nft_children_2 (nft_id, id, pending, equipped) VALUES ";
        let insertionValues = ""
        let totalChildren = 0
        for(let i = 0; i < nftArray.length; i++) {
            let nft = nftArray[i]
            if(!nft.hasOwnProperty('children')) {
                continue
            }
            nft.children.map(child => {
                let {
                    id,
                    pending,
                    equipped
                } = child
                insertionValues += `('${nft.id}', '${id}', ${pending}, '${equipped}'), `
                totalChildren++
            })
        }

        let query = insert + insertionValues

        if(totalChildren > 0) {
            query = "DELETE FROM nft_children_2; " + query
            query = query.slice(0, query.length-2)
            query += ` ON CONFLICT (nft_id, id) DO UPDATE SET pending = excluded.pending, equipped = excluded.equipped;`
            console.log(query)
            return await db_query(query, "")
        }
        return 0
    } catch(error) {
        console.error(`Error in addNftChildren: ${error}`)
        throw new Error(error)
    }
}


const addNftReactions = async (nftArray) => {
    try {
        const insert = "INSERT INTO nft_reactions_2 (nft_id, reaction, wallets) VALUES ";
        let insertionValues = ""
        let totalReactions = 0

        for(let i = 0; i < nftArray.length; i++) {
            let nft = nftArray[i]
            if(!nft.hasOwnProperty('reactions')) {
                continue
            }
            let reactions = nft.reactions

            let keys = Object.keys(reactions)
            let arrayReactions = keys.map(name => JSON.parse(reactions)[name])

            arrayReactions.map((reaction, index) => {
                insertionValues += `('${nft.id}', '${keys[index]}', '${JSON.stringify(reaction)}'), `
                totalReactions++
            })
        }

        let query = insert + insertionValues

        if(totalReactions > 0) {
            query = query.slice(0, query.length-2)
            query += ` ON CONFLICT (nft_id, reaction) DO UPDATE SET wallets = excluded.wallets;`
            return await db_query(query, "")
        } else {
            return 0
        }
    } catch(error) {
        console.error(`Error in addNftReactions: ${error}`)
        throw new Error(error)
    }
}


const addNewResource = async (nftArray) => {
    try {
        const insert = "INSERT INTO nft_resources_2 (nft_id, id, pending, src, slot, thumb, theme, base, parts, themeId, metadata) VALUES ";
        let insertionValues = ""
        let totalResources = 0
        for(let i = 0; i < nftArray.length; i++) {
            let nft = nftArray[i]
            if(!nft.hasOwnProperty('resources')) {
                continue
            }
            nft.resources.map(resource => {
                let {
                    pending,
                    id,
                    thumb,
                } = resource

                let parts = {}
                let base = 'NULL'
                let src = 'NULL'
                let slot = 'NULL'

                if(resource.src) {
                    src = `'${resource.src}'`
                }
                if(resource.slot) {
                    slot = `'${resource.slot}'`
                }
                if(resource.base) {
                    base = `'${resource.base}'`
                }
                if(resource.parts) {
                    parts = resource.parts
                }
                totalResources++
                insertionValues += `('${nft.id}', '${id}', ${pending}, ${src}, ${slot}, '${thumb}', '{}', ${base}, '${JSON.stringify(parts)}', NULL, '${nft.metadata}'), `
            })
        }
        if(totalResources > 0) {
            insertionValues = insertionValues.slice(0, insertionValues.length-2)
            insertionValues += ` ON CONFLICT (nft_id, id) DO UPDATE SET pending = excluded.pending, src = excluded.src, slot = excluded.slot, thumb = excluded.thumb, theme = excluded.theme, base = excluded.base, parts = excluded.parts, themeId = excluded.themeId, metadata = excluded.metadata;`
            return await db_query(insert + insertionValues, "")
        }
        return 0
    } catch(error) {
        console.error(`Error in addNftReactions: ${error}`)
        throw new Error(error)
    }
}