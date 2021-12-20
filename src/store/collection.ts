
import {db_get, db_query} from "../database";


export const getCollections = async () => {
    const query = `SELECT * FROM collections_2`
    return (await db_get(query, ""))
}

export const getCollectionById = async id => {
    const query = `SELECT * FROM collections_2 WHERE id='${id}'`
    return (await db_get(query, ""))
}

export const getCollectionChangesById = async id => {
    const query = `SELECT * FROM collection_changes_2 WHERE collection_id='${id}'`
    return (await db_get(query, ""))
}

export const addCollection = async (collections, startBlock) => {
    const insert = "INSERT INTO collections_2 (id, block, max, issuer, symbol, metadata, updatedAtBlock) VALUES ";
    let insertionValues = ""

    let keys = Object.keys(JSON.parse(collections))
    let arrayCollections = keys.map(name => JSON.parse(collections)[name])
    let totalCollections = 0

    await Promise.all(arrayCollections.map(async (collection, index) => {
        let maxCollectionBlock = 0
        let {
            changes,
            block,
            max,
            issuer,
            symbol,
            id,
            metadata
        } = collection
        if(changes.length > 0) {
            maxCollectionBlock = parseInt(changes[changes.length - 1].block)
            await addCollectionChanges(collection)
        } else {
            maxCollectionBlock = maxCollectionBlock > parseInt(block) ? maxCollectionBlock : parseInt(block)
        }
        if(maxCollectionBlock > parseInt(startBlock)) {
            insertionValues += `('${id}', ${block}, ${max}, '${issuer}', '${symbol}', '${metadata}', ${maxCollectionBlock}), `;
            totalCollections++
        }
    }))
    if(totalCollections > 0) {
        insertionValues = insertionValues.slice(0, insertionValues.length-2)
        insertionValues += ` ON CONFLICT (id) DO UPDATE SET block = excluded.block, max = excluded.max, issuer = excluded.issuer, symbol = excluded.symbol, metadata = excluded.metadata, updatedAtBlock = excluded.updatedAtBlock;`
        return await db_query(insert + insertionValues, "")
    }
    return 0
}

const addCollectionChanges = async (collection) => {
    try {
        const insert = "INSERT INTO collection_changes_2 (collection_id, change_index, field, old, new, caller, block, opType) VALUES ";
        let insertionValues = ""

        let totalChanges = 0
        if(!collection.hasOwnProperty('changes') || !collection.hasOwnProperty('id')) {
            return 0
        }
        let { changes, id } = collection
        if(changes.length > 0) {
            changes.map((change, change_index) => {
                let {
                    field,
                    old,
                    caller,
                    block,
                    opType
                } = change
                insertionValues += `('${id}', ${change_index}, , '${field}', '${old}', '${change.new}', '${caller}', ${block}, '${opType}'), `;
                totalChanges++
            })
        }

        if(totalChanges > 0) {
            insertionValues = insertionValues.slice(0, insertionValues.length-2)
            insertionValues += ` ON CONFLICT (collection_id, change_index) DO UPDATE SET field = excluded.field, old = excluded.old, new = excluded.new, caller = excluded.caller, opType = excluded.opType;`
            return await db_query(insert + insertionValues, "")
        }
        return 0
    } catch(error) {
        console.error(`Error adding Collection Changes: ${error}`)
    }
}