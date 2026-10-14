import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseExifDate, parseRange, matchBlock } from '../photo-dates.mjs';

const days = [
  {
    n: 2,
    date: '2026-04-29',
    blocks: [
      { id: 'd2b1', time: '09:00–09:10', title: 'Установка на день', in_report: true },
      { id: 'd2b2', time: '11:10–12:40', title: 'Проектная работа. Блок 1', in_report: true },
      { id: 'd2b3', time: '12:50–13:20', title: 'Обед', in_report: false },
      { id: 'd2b4', time: '19:00 - 20:20', title: 'Проектная работа. Блок 2', in_report: true },
    ],
  },
];

test('parseExifDate handles sips and exiftool formats', () => {
  assert.deepEqual(parseExifDate(' 2026:04:29 12:31:54'), { date: '2026-04-29', time: '12:31' });
  assert.deepEqual(parseExifDate('2026-04-29T08:05:00'), { date: '2026-04-29', time: '08:05' });
  assert.equal(parseExifDate(''), null);
});

test('parseRange accepts en dash, em dash and hyphen', () => {
  assert.deepEqual(parseRange('11:10–12:40'), [670, 760]);
  assert.deepEqual(parseRange('19:00 - 20:20'), [1140, 1220]);
  assert.equal(parseRange('весь день'), null);
});

test('matchBlock finds the block by time, with grace after the end', () => {
  assert.equal(matchBlock(days, { date: '2026-04-29', time: '12:31' }).block.id, 'd2b2');
  assert.equal(matchBlock(days, { date: '2026-04-29', time: '12:55' }).block.id, 'd2b2', 'grace window, lunch excluded');
  assert.equal(matchBlock(days, { date: '2026-04-29', time: '15:00' }).block, null);
  assert.equal(matchBlock(days, { date: '2026-04-29', time: '15:00' }).day.n, 2);
  assert.equal(matchBlock(days, { date: '2026-05-10', time: '10:00' }).day, null);
  assert.equal(matchBlock(days, null).day, null);
});
