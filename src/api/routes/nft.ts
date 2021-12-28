import {
    getNftsOwnedBy,
    getNftsByCollection,
    getNft,
    getNftChildrenByNftId,
    getNftChangesByNftId, getNftResourcesByNftId, getNftReactionsByNftId
} from "../../store/nft";


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
            //console.log(nft)
            console.log(nft.length)
            res.status(200).send(JSON.stringify(nft))
        } catch (error) {
            res.status(500).send(`Error getting nft by id ${error}`)
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
}