
import { db_query } from "../database";

export const getResourceByBase = async base => {
  const get = `SELECT * FROM nft_resources_2 WHERE base='${base}'`;
  return await db_query(get, "");
}

export const addNewResource = async (nftArray) => {
    const insert = "INSERT INTO nft_resources_2 (nft_id, id, pending, src, slot, thumb, theme, base, parts, themeId, metadata) VALUES ";
    let insertionValues = ""
    let totalResources = 0
    for(let i = 0; i < nftArray.length; i++) {
        let nft = nftArray[i]
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
}