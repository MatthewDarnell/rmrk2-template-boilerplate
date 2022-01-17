const R = require('ramda');

import {db_get, db_query} from "../database";


export const getCollections = async () => {
    const query = `SELECT * FROM collections_2`
    return (await db_get(query, ""))
}

export const getCollectionById = async id => {
    const query = `SELECT * FROM collections_2 WHERE id=$1`
    return (await db_get(query, [id]))
}

export const getCollectionChangesById = async id => {
    const query = `SELECT * FROM collection_changes_2 WHERE collection_id=$1`
    return (await db_get(query, [id]))
}

export const addCollection = async (collections, startBlock) => {
    const insert = "INSERT INTO collections_2 (id, block, max, issuer, symbol, metadata, updatedAtBlock) VALUES " +
                   " ($1, $2, $3, $4, $5, $6, $7) " +
                   " ON CONFLICT (id) DO UPDATE SET block = excluded.block, max = excluded.max, issuer = excluded.issuer, " +
                   "symbol = excluded.symbol, metadata = excluded.metadata, updatedAtBlock = excluded.updatedAtBlock;";

    let arrayCollections = R.values(collections)

    let totalCollections = 0

    await Promise.all(arrayCollections.map(async collection => {
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
            maxCollectionBlock = changes[changes.length - 1].block
            await addCollectionChanges(collection)
        } else {
            maxCollectionBlock = maxCollectionBlock > block ? maxCollectionBlock : block
        }
        if(maxCollectionBlock > startBlock) {
            let insertionValues = [
                id,
                block,
                max,
                issuer,
                symbol,
                metadata,
                maxCollectionBlock
            ]
            totalCollections++
            await db_query(insert, insertionValues)
        }
    }))
    return totalCollections
}

const addCollectionChanges = async (collection) => {
    try {
        const insert = "INSERT INTO collection_changes_2 (collection_id, change_index, field, old, new, caller, block, opType) VALUES " +
                       " ($1, $2, $3, $4, $5, $6, $7, $8) " +
                       " ON CONFLICT (collection_id, change_index) DO UPDATE SET field = excluded.field, old = excluded.old, " +
                       "new = excluded.new, caller = excluded.caller, opType = excluded.opType;";

        let totalChanges = 0
        if(!collection.hasOwnProperty('changes') || !collection.hasOwnProperty('id')) {
            return 0
        }
        let { changes, id } = collection
        if(changes.length > 0) {
            await Promise.all(changes.map(async (change, change_index) => {
                let {
                    field,
                    old,
                    caller,
                    block,
                    opType
                } = change
                let insertionValues = [
                    id,
                    change_index,
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
        return totalChanges
    } catch(error) {
        console.error(`Error adding Collection Changes: ${error}`)
    }
}