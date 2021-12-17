
import { db_query } from "../database";

//        nfts_sql = f"INSERT INTO nfts_{version} (id, block, collection, symbol, priority, transferable, sn, metadata,
//        owner, rootowner, forsale, burned, properties, pending, updatedAtBlock) VALUES \n"

export const addNft = async (nftArray) => {
    const insert = "INSERT INTO nfts_2 (id, block, collection, symbol, priority, transferable, sn, metadata, owner, rootowner, forsale, burned, properties, pending, updatedAtBlock) VALUES ";
    let insertionValues = ""
    for(let i = 0; i < nftArray.length; i++) {
        let nft = nftArray[i]
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
            insertionValues += `('${id}', ${block}, '${collection}', '${symbol}', '${JSON.stringify(priority)}', ${transferable}, '${sn}', '${metadata}', '${owner}', '${rootowner}', ${forsale}, '${burned}', '${JSON.stringify(properties)}', ${pending}, ${maxBlock}), `
        })
    }
    if(nftArray.length > 0) {
        insertionValues = insertionValues.slice(0, insertionValues.length-2)
        insertionValues += ` ON CONFLICT (id) DO UPDATE SET block = excluded.block, collection = excluded.collection, symbol = excluded.symbol, priority = excluded.priority, transferable = excluded.transferable, sn = excluded.sn, metadata = excluded.metadata, owner = excluded.owner, rootowner = excluded.rootowner, forsale = excluded.forsale, burned = excluded.burned, properties = excluded.properties, updatedAtBlock = excluded.updatedAtBlock;`
        return await db_query(insert + insertionValues, "")
    }
    return 0
}