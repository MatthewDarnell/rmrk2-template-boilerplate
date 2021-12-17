require('dotenv').config()

import { db_query, close_database } from "./database";

import { addCollection } from "./store/collection";

import { addNewResource } from "./store/nft_resource";
import { addNftChildren } from "./store/nft_children";
import { addNftChanges } from "./store/nft_changes";
import { addNftReactions } from "./store/nft_reactions";
import {addNft} from "./store/nft";
import { init, fetchAndConsolidate} from "./api";

db_query(`SELECT NOW()`, "").then(async () => {
    init();
    let { nfts, collections } = await fetchAndConsolidate();

    let names = Object.keys(JSON.parse(nfts))
    let arrayNft = JSON.stringify(names.map(name => JSON.parse(nfts)[name]))

    let res = await addNft(JSON.parse(arrayNft))
    console.log(res)


   res = await addNewResource(JSON.parse(arrayNft));
   console.log(res)

    res = await addNftChildren(JSON.parse(arrayNft));
    console.log(res)

    res = await addNftChanges(JSON.parse(arrayNft));
    console.log(res)

    res = await addNftReactions(JSON.parse(arrayNft));
    console.log(res)

    console.log('collections')
    res = await addCollection(collections, 0);
    console.log(res)


    close_database();
    process.exit(0)
})

