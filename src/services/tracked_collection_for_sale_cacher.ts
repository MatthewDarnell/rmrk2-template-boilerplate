import { getNftsByCollectionForSale } from '../store/nft';

const TrackedCollectionForSaleCache = {
  nftsForSale: {},
  collectionsToCache: process.env.TRACKEDCOLLECTIONS ? process.env.TRACKEDCOLLECTIONS.split(', ') : [],
  cacheDelayInterval: process.env.TRACKEDCOLLECTIONCACHEINTERVAL ? parseInt(process.env.TRACKEDCOLLECTIONCACHEINTERVAL) : 10000, //Default 10 seconds
}
const getLatestNftsForSale = async () => {
    try {
      for(const collection of TrackedCollectionForSaleCache.collectionsToCache) {
        TrackedCollectionForSaleCache.nftsForSale[collection] = await getNftsByCollectionForSale(collection);
      }
    } catch(error) {
      console.error(`Error getting nfts for sale in cacher: ${error}`);
    }
};
const startCacher = async() => {
    await getLatestNftsForSale()
    return setTimeout(
        startCacher,
        TrackedCollectionForSaleCache.cacheDelayInterval
    );
};

export const startTrackedCollectionCacher = async () => {
  console.log('Starting Tracked Collection Nfts for Sale Caching')
  return startCacher()
}

export const getNftsForSaleByCollectionCached = (collectionId: string) => {
  return TrackedCollectionForSaleCache.nftsForSale.hasOwnProperty(collectionId) ?
          TrackedCollectionForSaleCache.nftsForSale[collectionId] : []
}

export const getAllTrackedNftsForSaleCached = () => TrackedCollectionForSaleCache.nftsForSale