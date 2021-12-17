
import { db_query } from "../database";

// nft_children_{version} (nft_id text, id text, pending boolean, equipped text);
export const addNftChildren = async (nftArray) => {
    const insert = "INSERT INTO nft_children_2 (nft_id, id, pending, equipped) VALUES ";
    let insertionValues = ""
    let totalChildren = 0
    for(let i = 0; i < nftArray.length; i++) {
        let nft = nftArray[i]
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
        return await db_query(query, "")
    }
    return 0
}