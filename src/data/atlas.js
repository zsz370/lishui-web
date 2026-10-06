import { nodes, catFilters } from './nodes.js';
import { nodePhotos, atlasPhotoOverrides } from './nodeMedia.js';

// 与名片共享名称、短介绍和出处，避免两套事实文本漂移。
export const atlasEntries = nodes.map((node) => ({ ...node, photo: atlasPhotoOverrides[node.id] || nodePhotos[node.id] }));
export const atlasCategories = catFilters;
export function filterAtlas(category = '全部', query = '') {
  const keyword = query.trim().toLocaleLowerCase();
  return atlasEntries.filter((entry) => (category === '全部' || entry.cat === category)
    && (!keyword || `${entry.name} ${entry.summary}`.toLocaleLowerCase().includes(keyword)));
}
export const atlasUrl = (id) => `/atlas${id ? `?entry=${encodeURIComponent(id)}` : ''}`;
