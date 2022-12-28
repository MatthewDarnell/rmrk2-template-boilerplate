

export const fetchFromIpfs = async (link, timeout = 1500) => {
    try {
        if(!link) {
            return 0
        }
        if(link.length < 32) {
            return 0
        }
        let metadataArray = link.split('ipfs/')
        let ipfsOrHttps = metadataArray[0] === 'ipfs://'
        if(metadataArray.length < 1) {
            console.error(`Link is not ipfs: ${link}`)
            return 0
        }
        metadataArray = metadataArray.slice(1)  //['ipfs://', 'ba...']
        const metadata = metadataArray[0]
        if(!metadata) {
            console.error('Null Metadata')
            return 0
        }
        if(metadata.length < 1) {
            console.error('Null Metadata')
            return 0
        }
        if(metadata[0] !== 'Q' && metadata[0] !== 'b') {
            console.error(`Strange Metadata: ${link} - ${JSON.stringify(metadataArray)} - ${metadata}`)
            return 0
        }

        let response

        const controller = new AbortController()
        const signal = controller.signal
        setTimeout(() => {
            controller.abort()
        }, timeout)

        const usePaidGateway = process.env.IPFSUSEPAID ? process.env.IPFSUSEPAID : false;

        if(usePaidGateway) {
            const userAgent = process.env.IPFSPAIDUSERAGENT
            const gateway = process.env.IPFSPAIDGATEWAY
            const method = process.env.IPFSPAIDMETHOD
            const host = process.env.IPFSPAIDHOST
            const projectId = process.env.IPFSPAIDPROJECTID
            const projectSecret = process.env.IPFSPAIDSECRET

            const headers = new Headers()

            headers.set('Authorization', 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64'))
            headers.set('User-Agent', userAgent)
            headers.set('Host', host)
            headers.set('Content-Type', 'application/json')


            // @ts-ignore
            try {
                response = await fetch(`${gateway}${metadata}`,
                    {
                        signal,
                        method,
                        // @ts-ignore
                        auth: projectId + ':' + projectSecret,
                        host,
                        headers
                    }
                );
            } catch(error) {
                //AbortController Signal Fired
            }

        } else {
            const gateways = process.env.IPFSGATEWAY.split(',')
            const gateway = gateways[   //choose a random gateway
                Math.floor(
                    Math.random() * gateways.length
                )
                ]
            try {
                response = await fetch(`${gateway}/${metadata}`, {
                    signal
                })
            } catch(error) {
                //AbortController Signal Fired
            }
        }

        if(!response) {
            //Probably Timed Out From AbortController
            return 0;
        }
        if(!response.ok) {
            console.log('failed to get ' + link)
            //Failed to fetch this metadata
            return 0;
        }

        return await response.text();

    } catch(error) {
        console.log(`Failed To Fetch ${link} From Ipfs`)
    }
}