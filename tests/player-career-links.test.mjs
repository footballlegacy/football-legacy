import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'career-mode/career-route.html', 'career-mode/start-created-club.html', 'player-career/setup.html', 'player-career/game.html'];

test('Player Career entry points and pages contain no broken local links', () => {
  const missing = [];
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const reference = match[1].split(/[?#]/)[0];
      if (!reference || /^(?:https?:|#|mailto:|data:)/.test(reference)) continue;
      const target = path.resolve(root, path.dirname(page), reference);
      if (!fs.existsSync(target)) missing.push(`${page} -> ${reference}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('main menus expose each career type once and route directly', () => {
  const main = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const route = fs.readFileSync(path.join(root, 'career-mode/career-route.html'), 'utf8');
  const manager = fs.readFileSync(path.join(root, 'career-mode/manager.html'), 'utf8');
  const mainScript = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(main, /href="player-career\/setup\.html"[^>]*>Player Career/);
  assert.match(main, /href="career-mode\/manager\.html\?route=take-charge"[^>]*>Take Charge/);
  assert.match(main, /href="career-mode\/manager\.html\?route=create-club"[^>]*>Create a Club/);
  assert.doesNotMatch(main, /route=grassroots/);
  assert.doesNotMatch(mainScript, /manager\.html\?route=/);
  assert.doesNotMatch(route, /data-route=/);
  assert.match(route, /route==='take-charge'/);
  assert.match(route, /route==='create-club'/);
  assert.match(manager, /directRoute==='take-charge'/);
  assert.match(manager, /directRoute==='create-club'/);
  assert.doesNotMatch(manager, /Previous (?:Job|Occupation)/i);
});
