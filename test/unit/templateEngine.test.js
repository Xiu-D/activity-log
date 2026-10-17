// test/unit/templateEngine.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  applyTemplate,
  extractEventData,
  getEventAction,
} from '../../src/utils/templateEngine.js';

const REPO = 'Xiu-D/activity-log';
const DATE = '2026-10-17T12:00:00Z';

describe('applyTemplate', () => {
  test('returns null for invalid template', () => {
    assert.strictEqual(applyTemplate(null, {}), null);
    assert.strictEqual(applyTemplate(123, {}), null);
  });

  test('replaces placeholders', () => {
    const out = applyTemplate('{emoji} {action} {repo}', {
      emoji: '⭐', action: 'Starred', repo: REPO,
    });
    assert.strictEqual(out, `⭐ Starred ${REPO}`);
  });

  test('removes broken markdown link when url is empty', () => {
    assert.strictEqual(applyTemplate('[{repo}]({url})', { repo: REPO }), REPO);
  });

  test('removes empty parentheses', () => {
    assert.strictEqual(applyTemplate('Pushed ({ref})', {}), 'Pushed');
  });
});

describe('getEventAction', () => {
  test('forced actions', () => {
    assert.strictEqual(getEventAction('WatchEvent', {}), 'watched');
  });

  test('merged pull request', () => {
    const payload = { action: 'closed', pull_request: { merged: true } };
    assert.strictEqual(getEventAction('PullRequestEvent', payload), 'merged');
  });

  test('uses payload action when present', () => {
    assert.strictEqual(getEventAction('IssuesEvent', { action: 'opened' }), 'opened');
  });

  test('default actions', () => {
    assert.strictEqual(getEventAction('PushEvent', {}), 'committed');
    assert.strictEqual(getEventAction('ReleaseEvent', { release: { draft: true } }), 'draft');
    assert.strictEqual(getEventAction('UnknownEvent', {}), 'performed action');
  });
});

describe('extractEventData', () => {
  test('public PushEvent', () => {
    const event = {
      type: 'PushEvent', public: true, repo: { name: REPO }, created_at: DATE,
      payload: { ref: 'refs/heads/main', head: 'abc123' },
    };
    const d = extractEventData(event, { PushEvent: '📝' });
    assert.strictEqual(d.action, 'Committed to');
    assert.strictEqual(d.emoji, '📝');
    assert.strictEqual(d.ref, 'main');
    assert.strictEqual(d.date, 'Oct 17, 2026');
    assert.strictEqual(d.url, `https://github.com/${REPO}/commit/abc123`);
  });

  test('private event hides details', () => {
    const event = {
      type: 'PushEvent', public: false, repo: { name: REPO }, created_at: DATE,
      payload: { ref: 'refs/heads/main', head: 'abc123' },
    };
    const d = extractEventData(event, {}, true);
    assert.strictEqual(d.repo, 'a private repository');
    assert.strictEqual(d.repo_url, '');
    assert.strictEqual(d.url, '');
    assert.strictEqual(d.ref, '');
  });

  test('IssuesEvent with label', () => {
    const event = {
      type: 'IssuesEvent', public: true, repo: { name: REPO }, created_at: DATE,
      payload: { action: 'labeled', issue: { number: 42 } },
    };
    const d = extractEventData(event, { IssuesEvent: { opened: '🆕' } });
    assert.strictEqual(d.action, 'Added a label to');
    assert.strictEqual(d.subject, 'issue');
    assert.strictEqual(d.number, '#42');
    assert.strictEqual(d.url, `https://github.com/${REPO}/issues/42`);
  });

  test('ReleaseEvent falls back to published emoji', () => {
    const event = {
      type: 'ReleaseEvent', public: true, repo: { name: REPO }, created_at: DATE,
      payload: {
        action: 'created',
        release: { tag_name: 'v1.0.3', draft: false, html_url: `https://github.com/${REPO}/releases/tag/v1.0.3` },
      },
    };
    const d = extractEventData(event, { ReleaseEvent: { published: '🚀' } });
    assert.strictEqual(d.emoji, '🚀');
    assert.strictEqual(d.ref, 'v1.0.3');
    assert.strictEqual(d.subject, 'release');
  });

  test('CreateEvent tag', () => {
    const event = {
      type: 'CreateEvent', public: true, repo: { name: REPO }, created_at: DATE,
      payload: { ref: 'v1', ref_type: 'tag' },
    };
    const d = extractEventData(event, {});
    assert.strictEqual(d.subject, 'a new tag');
    assert.strictEqual(d.url, `https://github.com/${REPO}/releases/tag/v1`);
  });

  test('GollumEvent counts pages', () => {
    const event = {
      type: 'GollumEvent', public: true, repo: { name: REPO }, created_at: DATE,
      payload: { pages: [{ action: 'created' }, { action: 'edited' }] },
    };
    const d = extractEventData(event, {});
    assert.strictEqual(d.action, 'Updated');
    assert.strictEqual(d.subject, '2 pages (+1 new page)');
  });

  test('IssueCommentEvent on a PR', () => {
    const event = {
      type: 'IssueCommentEvent', public: true, repo: { name: REPO }, created_at: DATE,
      payload: { action: 'created', issue: { number: 7, pull_request: {} }, comment: { id: 99 } },
    };
    const d = extractEventData(event, {});
    assert.strictEqual(d.action, 'Commented');
    assert.strictEqual(d.subject, 'on PR');
    assert.strictEqual(d.url, `https://github.com/${REPO}/issues/7#issuecomment-99`);
  });
});