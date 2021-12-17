require('dotenv').config()

import { db_query, close_database } from "./database";

import { addCollection } from "./store/collection";

import { addNewResource } from "./store/nft_resource";
import { addNftChildren } from "./store/nft_children";
import { addNftChanges } from "./store/nft_changes";
import { addNftReactions } from "./store/nft_reactions";
import {addNft} from "./store/nft";
import {addBase} from "./store/base";

import { addInvalid } from "./store/invalid"

import { fetchAndConsolidate} from "./api";
import {startBlockScanner} from "./scanner/blockScanner";

db_query(`SELECT NOW()`, "").then(async () => {
    let { bases, invalid, nfts, collections } = await fetchAndConsolidate();

    let names = Object.keys(JSON.parse(nfts))
    let arrayNft = JSON.stringify(names.map(name => JSON.parse(nfts)[name]))

    await addNft(JSON.parse(arrayNft))
    await addNewResource(JSON.parse(arrayNft));
    await addNftChildren(JSON.parse(arrayNft));
    await addNftChanges(JSON.parse(arrayNft));
    await addNftReactions(JSON.parse(arrayNft));

    await addCollection(collections, 0);


    await addBase(bases, 0)

    await addInvalid(invalid, 0)

    await startBlockScanner()

    close_database();
    process.exit(0)
})

