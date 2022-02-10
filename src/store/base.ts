const R = require("ramda")
import { db_get, db_query } from "../database";

export const getBases = async () => {
  const query = "SELECT * FROM bases_2"
  return await db_get(query, "")
}

export const getBaseById = async id => {
    const query = `SELECT * FROM bases_2 WHERE id=$1`
    return (await db_get(query, [id]))
}

export const getBaseChangesById = async id => {
    const query = `SELECT * FROM base_changes_2 WHERE base_id=$1`
    return (await db_get(query, [id]))
}

export const getBasePartsById = async id => {
    const query = `SELECT * FROM base_parts_2 WHERE base_id=$1`
    return (await db_get(query, [id]))
}

export const getBaseThemesById = async id => {
    const query = `SELECT * FROM base_themes_2 WHERE base_id=$1`
    return (await db_get(query, [id]))
}


export const addBase = async (bases, startBlock) => {
    const insert = "INSERT INTO bases_2 (id, block, symbol, type, issuer, updatedAtBlock) VALUES " +
                   " ($1, $2, $3, $4, $5, $6) " +
                   " ON CONFLICT (id) DO UPDATE SET block = excluded.block, symbol = excluded.symbol, type = excluded.type," +
                   "issuer = excluded.issuer, updatedAtBlock = excluded.updatedAtBlock;";
    const arrayBases = R.values(bases)
    let totalBases = 0
    await Promise.all(arrayBases.map(async base => {
        let maxBaseBlock = 0
        let {
            changes,
            block,
            symbol,
            type,
            issuer,
            parts,
            id
        } = base
        if(parts.length > 0) {
            await addBaseParts(base)
        }
        if(changes.length > 0) {
            maxBaseBlock = parseInt(changes[changes.length - 1].block)
            await addBaseChanges(base)
        } else {
            maxBaseBlock = maxBaseBlock > parseInt(block) ? maxBaseBlock : parseInt(block)
        }
        if(maxBaseBlock > parseInt(startBlock)) {
            let insertionValues = [
                id,
                block,
                symbol,
                type,
                issuer,
                maxBaseBlock
            ]
            totalBases++
            await db_query(insert, insertionValues)
        }
    }))
    return totalBases
}
const addBaseChanges = async base => {
    const insert = "INSERT INTO base_changes_2 (base_id, change_index, field, old, new, caller, block, opType) VALUES " +
                   " ($1, $2, $3, $4, $5, $6, $7, $8) " +
                   "ON CONFLICT (base_id, change_index, block) DO UPDATE SET field = excluded.field, old = excluded.old, " +
                   " new = excluded.new, caller = excluded.caller, opType = excluded.opType;";
    let totalChanges = 0
    let { changes, id } = base
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
}
const addBaseParts = async base => {
    const insert = "INSERT INTO base_parts_2 (base_id, id, type, src, z, equippable, themable) VALUES " +
                   " ($1, $2, $3, $4, $5, $6, $7) " +
                   "ON CONFLICT (base_id, id) DO UPDATE SET type = excluded.type, src = excluded.src, " +
                   "z = excluded.z, equippable = excluded.equippable, themable = excluded.themable;";
    let totalParts = 0
    let { parts, id } = base
    if(parts.length > 0) {
        await Promise.all(parts.map(async part => {
            let {
                type,
                z
            } = part

            let equippable
            let themable
            let src

            if(part.equippable) {
                equippable = JSON.stringify(part.equippable)
            }
            if(part.themable) {
                themable = `${part.themable}`
            }
            if(part.src) {
                src = `'${part.src}'`
            }
            let insertionValues = [
                id,
                part.id,
                type,
                src,
                z,
                equippable,
                themable
            ]
            await db_query(insert, insertionValues)
            totalParts++
        }))
    }
    return totalParts
}