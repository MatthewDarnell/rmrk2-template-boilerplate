
import { db_query } from "../database";
import { emitSubscriptionEvent } from "../api/event";

export const addBase = async (bases, startBlock) => {
    const insert = "INSERT INTO bases_2 (id, block, symbol, type, issuer, updatedAtBlock) VALUES ";
    let insertionValues = ""

    let keys = Object.keys(JSON.parse(bases))
    let arrayBases = keys.map(name => JSON.parse(bases)[name])
    let totalBases = 0

    await Promise.all(arrayBases.map(async (base, index) => {
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
            insertionValues += `('${id}', ${block}, '${symbol}', '${type}', '${issuer}', ${maxBaseBlock}), `;
            totalBases++
        }
    }))
    if(totalBases > 0) {
        console.log(`Logging ${totalBases} Bases`)
        insertionValues = insertionValues.slice(0, insertionValues.length-2)
        insertionValues += ` ON CONFLICT (id) DO UPDATE SET block = excluded.block, symbol = excluded.symbol, type = excluded.type, issuer = excluded.issuer, updatedAtBlock = excluded.updatedAtBlock;`
        return await db_query(insert + insertionValues, "")
    }
    return 0
}

const addBaseChanges = async base => {
    console.log('Adding Base Changes')
    const insert = "INSERT INTO base_changes_2 (base_id, change_index, field, old, new, caller, block, opType) VALUES ";
    let insertionValues = ""

    let totalChanges = 0

    let { changes, id } = base
    if(changes.length > 0) {
        changes.map((change, change_index) => {
            let {
                field,
                old,
                caller,
                block,
                opType
            } = change
            insertionValues += `('${id}', ${change_index}, '${field}', '${old}', '${change.new}', '${caller}', ${block}, '${opType}'), `;
            totalChanges++
        })
    }

    if(totalChanges > 0) {
        insertionValues = insertionValues.slice(0, insertionValues.length-2)
        insertionValues += ` ON CONFLICT (base_id, change_index) DO UPDATE SET field = excluded.field, old = excluded.old, new = excluded.new, caller = excluded.caller, opType = excluded.opType;`
        return await db_query(insert + insertionValues, "")
    }
    return 0
}

const addBaseParts = async base => {
    console.log('Adding Base Parts')

    const insert = "INSERT INTO base_parts_2 (base_id, id, type, src, z, equippable, themable) VALUES ";
    let insertionValues = ""

    let totalParts = 0

    let { parts, id } = base
    if(parts.length > 0) {
        parts.map((part) => {
            let {
                type,
                z
            } = part

            let equippable = 'NULL'
            let themable = 'NULL'
            let src = 'NULL'

            if(part.equippable) {
                equippable = `'${JSON.stringify(part.equippable)}'`
            }
            if(part.themable) {
                themable = `${part.themable}`
            }
            if(part.src) {
                src = `'${part.src}'`
            }
            insertionValues += `('${id}', '${part.id}', '${type}', ${src}, ${z}, ${equippable}, ${themable}), `;
            totalParts++
        })
    }

    if(totalParts > 0) {
        insertionValues = insertionValues.slice(0, insertionValues.length-2)
        insertionValues += ` ON CONFLICT (base_id, id) DO UPDATE SET type = excluded.type, src = excluded.src, z = excluded.z, equippable = excluded.equippable, themable = excluded.themable;`
        return await db_query(insert + insertionValues, "")
    }
    return 0
}