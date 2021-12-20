import {getRemarks, getRemarksWhereContains} from '../../store/remarks'

export const setupRemarksRoute = app => {
    app.get('/get_remarks', async (req, res) => {
        try {
            const remarks = (await getRemarks())
            res.status(200).send(JSON.stringify(remarks))
        } catch(error) {
            res.status(500).send(`Error getting remarks ${error}`)
        }
    })

    app.get('/get_remarks_where_contains/:substring', async (req, res) => {
        try {
            const substring = req.params.substring
            const remarks = (await getRemarksWhereContains(substring))
            res.status(200).send(JSON.stringify(remarks))
        } catch(error) {
            res.status(500).send(`Error getting remarksWhereContains ${error}`)
        }
    })

}