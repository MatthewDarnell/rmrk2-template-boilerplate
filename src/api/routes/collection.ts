import { getCollections, getCollectionById, getCollectionChangesById } from '../../store/collection'

export const setupCollectionRoutes = app => {
    app.get('/get_collections', async (req, res) => {
        try {
            const collections = await getCollections()
            res.status(200).send(JSON.stringify(collections))
        } catch(error) {
            res.status(500).send(`Error getting collections ${error}`)
        }
    })

    app.get('/get_collection_by_id/:id', async (req, res) => {
        try {
            const id = req.params.id
            const collection = await getCollectionById(id)
            res.status(200).send(JSON.stringify(collection))
        } catch(error) {
            res.status(500).send(`Error getting collection by id ${error}`)
        }
    })

    app.get('/get_collection_changes_by_id/:id', async (req, res) => {
        try {
            const id = req.params.id
            const collection = await getCollectionChangesById(id)
            res.status(200).send(JSON.stringify(collection))
        } catch(error) {
            res.status(500).send(`Error getting collection changes by id ${error}`)
        }
    })
}