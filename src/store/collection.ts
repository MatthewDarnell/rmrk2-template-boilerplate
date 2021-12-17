
import { db_query } from "../database";

import { addCollectionChanges } from "./collection_changes";

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