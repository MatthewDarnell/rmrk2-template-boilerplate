import {addNftMetadata, getNftMetadataIpfsLink} from "../store/nft";



const fetchMetadataLoop = async () => {
    const nfts = await getNftMetadataIpfsLink(
        process.env.IPFS_NUM_LINKS_FETCH ?
            process.env.IPFS_NUM_LINKS_FETCH : 1
    );
    for(const nft of nfts) {
        const { id, metadata } = nft
        await addNftMetadata(id, 0, metadata)
    }
    return setTimeout(
        fetchMetadataLoop,
        process.env.IPFS_FETCH_TIMEOUT ?
            parseInt(process.env.IPFS_FETCH_TIMEOUT) : 1000
    );
}


export const startMetadataFetcher = async () => {
    console.log('Starting Metadata Fetcher');
    return fetchMetadataLoop();
}