import { nodes, catFilters } from './nodes.js';
import { nodePhotos, atlasPhotoOverrides } from './nodeMedia.js';
import { matchesNode, nodeSearchRank } from '../services/nodeSearch.js';

// 与名片共享名称、短介绍和出处，避免两套事实文本漂移。
export const atlasEntries = nodes.map((node) => ({ ...node, photo: atlasPhotoOverrides[node.id] || nodePhotos[node.id] }));
export const atlasCategories = catFilters;
export function filterAtlas(category = '全部', query = '') {
  return atlasEntries.filter((entry) => (category === '全部' || entry.cat === category)
    && matchesNode(entry,query)).sort((a,b)=>nodeSearchRank(b,query)-nodeSearchRank(a,query));
}
export const atlasUrl = (id) => `/atlas${id ? `?entry=${encodeURIComponent(id)}` : ''}`;
