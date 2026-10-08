import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { homeTopics, homeQuestions, preparationTopics } from '../src/data/homeDiscovery.js';
import { nodes, getNode } from '../src/data/nodes.js';
import { belongsToTopic } from '../src/data/collections.js';
import { visitorAnswer } from '../src/data/visitorAnswerCopy.js';
import { themeRoutes } from '../src/data/themeRoutes.js';
import { nodePhotos } from '../src/data/nodeMedia.js';

test('首页主题计数来自实际栏目，预览节点与素材有效', async () => {
  for (const topic of homeTopics) {
    assert.equal(topic.count, nodes.filter(node => belongsToTopic(node, topic)).length);
    for (const group of topic.previews) {
      assert(getNode(group.node.id)); assert(belongsToTopic(group.node, topic));
      await access(new URL('../public' + group.cover, import.meta.url));
    }
  }
});

test('首页问答只露出已审条目，游客正文不带审核元数据', () => {
  assert.equal(homeQuestions.length, 4);
  assert.equal(preparationTopics.length, 6);
  for (const topic of preparationTopics) assert.equal(topic.questions.length, 3);
  for (const qa of [...homeQuestions, ...preparationTopics.flatMap(topic => topic.questions)]) {
    assert.equal(qa.status, 'approved'); assert(qa.sources.length > 0);
    assert(visitorAnswer(qa)); assert.doesNotMatch(visitorAnswer(qa), /reviewedAt|reviewBasis|https?:\/\//);
  }
});

test('线路预览只使用现有草案和节点照片，保留待确认边界', async () => {
  for (const route of themeRoutes) {
    assert.equal(route.kind, 'guidance'); assert(route.unknowns);
    for (const id of route.nodeIds) { assert(getNode(id)); assert(route.stopNotes[id]); await access(new URL('../public' + nodePhotos[id], import.meta.url)); }
  }
});
