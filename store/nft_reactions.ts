
import { db_query } from "../database";

export const addNftReactions = async (nftArray) => {
    const insert = "INSERT INTO nft_reactions_2 (nft_id, reaction, wallets) VALUES ";
    let insertionValues = ""
    let totalReactions = 0

    for(let i = 0; i < nftArray.length; i++) {
        let nft = nftArray[i]
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
}