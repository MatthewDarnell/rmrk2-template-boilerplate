import {addNftMetadata, getNftMetadataIpfsLink} from "../store/nft";


export const startMetadataFetcher = async () => {
    console.log('Starting Metadata Fetcher')
    setInterval(async () => {
            const nfts = await getNftMetadataIpfsLink(
                                                        process.env.IPFS_NUM_LINKS_FETCH ?
                                                                process.env.IPFS_NUM_LINKS_FETCH : 10
            );
            for(const nft of nfts) {
                const { id, metadata } = nft
                await addNftMetadata(id, 0, metadata)
            }
        },
        process.env.IPFS_FETCH_TIMEOUT ? parseInt(process.env.IPFS_FETCH_TIMEOUT) : 750
    )
}