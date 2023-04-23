import {
    getNftsOwnedBy,
    getNftsOwnedByOrRootOwner,
    getNftsByCollection,
    getNft,
    getNftChildrenByNftId,
    getNftChangesByNftId, getNftResourcesByNftId, getNftReactionsByNftId, getNftsByCollectionForSale
} from "../../store/nft";

import {PendingBuyNfts} from "../../scanner/blockScanner";
import {
    getAllTrackedNftsForSaleCached,
    getNftsForSaleByCollectionCached
} from "../../services/tracked_collection_for_sale_cacher";

const collectionsToGet = process.env.TRACKEDCOLLECTIONS? Array.from(process.env.TRACKEDCOLLECTIONS).join('').split(', ') : []

export const setupNftRoutes = app => {
    app.get('/get_nft_by_id/:id', async (req, res) => {
        try {
            const id = req.params.id
            let nft = await getNft(id)
            const children = await getNftChildrenByNftId(id)
            const changes = await getNftChangesByNftId(id)
            const resources = await getNftResourcesByNftId(id)
            const reactions = await getNftReactionsByNftId(id)
            nft = {
                ...nft,
                children,
                changes,
                resources,
                reactions
            }
            res.status(200).send(JSON.stringify(nft))
        } catch (error) {
            res.status(500).send(`Error getting nft by id ${error}`)
        }
    })
    app.get('/get_nfts_by_collection/:collection', async (req, res) => {
        try {
            const collection = req.params.collection
            const nft = await getNftsByCollection(collection)
            res.status(200).send(JSON.stringify(nft))
        } catch (error) {
            res.status(500).send(`Error getting nft by id ${error}`)
        }
    })

    app.get('/get_nfts_for_sale_in_collection/:collection', async (req, res) => {
        try {
            const collection = req.params.collection
            const nfts = collectionsToGet.includes(collection) ?
                getNftsForSaleByCollectionCached(collection) :
                await getNftsByCollectionForSale(collection);
            res.status(200).send(JSON.stringify(nfts))
        } catch (error) {
            res.status(500).send(`Error getting nft collection for sale by id ${error}`)
        }
    })

    app.get('/get_tracked_nfts_for_sale', async (req, res) => {
        try {
            if(collectionsToGet.length < 1) {
                return res.status(200).send('{}')
            }
            res.status(200).send(JSON.stringify(getAllTrackedNftsForSaleCached()))
        } catch (error) {
            res.status(500).send(`Error getting nft collection for sale by id ${error}`)
        }
    })

    app.get('/get_nfts_owned_by/:address', async (req, res) => {
        try {
            const address = req.params.address
            const nfts = await getNftsOwnedBy(address)
            res.status(200).send(JSON.stringify(nfts))
        } catch (error) {
            res.status(500).send(`Error getting nfts owned by ${error}`)
        }
    })

    app.get('/get_nfts_owned_by_or_root_owned/:address', async (req, res) => {
        try {
            const address = req.params.address
            const nfts = await getNftsOwnedByOrRootOwner(address)
            res.status(200).send(JSON.stringify(nfts))
        } catch (error) {
            res.status(500).send(`Error getting nfts owned by ${error}`)
        }
    })

    app.get('/is_nft_being_bought/:nftId', async (req, res) => {
        try {
            const id = req.params.nftId
            let retVal = false;
            if(PendingBuyNfts.hasOwnProperty(id)) {
                retVal = true
            }
            res.status(200).send(JSON.stringify(retVal))
        } catch (error) {
            res.status(500).send(`Error getting nfts being bought by ${error}`)
        }
    })

}