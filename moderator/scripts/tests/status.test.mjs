import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectStatus, parseChecklist } from '../status.mjs';

function makeWorkspace() {
  const root = mkdtempSync(join(tmpdir(), 'moderator-'));
  const days = [
    {
      n: 1,
      date: '2026-04-28',
      title: '28 апреля, вторник',
      slug: 'день-1_28-04',
      status: 'final',
      blocks: [
        { id: 'd1b1', title: 'Установка на программу', kind: 'opening', in_report: true },
        { id: 'd1b2', title: 'Осмысление дня', kind: 'reflection', in_report: true },
      ],
    },
    {
      n: 2,
      date: '2026-04-29',
      title: '29 апреля, среда',
      slug: 'день-2_29-04',
      status: 'pending',
      blocks: [
        { id: 'd2b1', title: 'Проектная работа. Блок 1', kind: 'group-work', in_report: true },
        { id: 'd2b2', title: 'Осмысление дня', kind: 'reflection', in_report: true },
        { id: 'd2b3', title: 'Обед', kind: 'other', in_report: false },
      ],
    },
    {
      n: 3,
      date: '2026-04-30',
      title: '30 апреля, четверг',
      slug: 'день-3_30-04',
      blocks: [{ id: 'd3b1', title: 'Проектная работа. Блок 3', kind: 'group-work', in_report: true }],
    },
  ];
  mkdirSync(join(root, '.moderator'), { recursive: true });
  writeFileSync(
    join(root, '.moderator', 'state.json'),
    JSON.stringify({
      schema: 1,
      setup_complete: true,
      event: { name: 'Весенний педсовет' },
      template: { checklist: '03-отчет/чек-лист.md' },
      days,
    }),
  );
  mkdirSync(join(root, '02-рефлексия', 'день-1_28-04'), { recursive: true });
  writeFileSync(join(root, '02-рефлексия', 'день-1_28-04', 'рефлексия.md'), 'Устала');
  mkdirSync(join(root, '01-артефакты', 'день-1_28-04', 'фото'), { recursive: true });
  writeFileSync(join(root, '01-артефакты', 'день-1_28-04', 'фото', '1.HEIC'), 'x');
  writeFileSync(join(root, '01-артефакты', 'день-1_28-04', 'фото', 'readme.txt'), 'not an image');
  mkdirSync(join(root, '01-артефакты', 'общие'), { recursive: true });
  writeFileSync(join(root, '01-артефакты', 'общие', 'группы.pdf'), 'x');
  mkdirSync(join(root, '03-отчет'), { recursive: true });
  writeFileSync(
    join(root, '03-отчет', 'чек-лист.md'),
    [
      '# Чек-лист',
      '## Шапка отчёта',
      '- [x] ФИО модератора',
      '- [ ] Номер стола',
      '## День 1 — 28.04 <!-- day:1 -->',
      '- [x] Задача блока «Установка на программу»',
      '- [x] Тезисы участников',
      '## Day two — 29.04 <!-- day:2 -->',
      '- [ ] Фото проектной работы',
      '- [ ] Тезисы участников',
      '## Итоги программы',
      '- [ ] Результат работы группы',
    ].join('\n'),
  );
  writeFileSync(join(root, 'IMG_0001.HEIC'), 'loose');
  return root;
}

test('parseChecklist splits day and general sections', () => {
  const s = parseChecklist('## Шапка\n- [ ] a\n## Jour 2 — 29.04 <!-- day:2 -->\n- [x] b\n- [ ] c\n## День 3\n- [ ] d\n');
  assert.equal(s.length, 3);
  assert.equal(s[0].day, null);
  assert.deepEqual(s[0].open, ['a']);
  assert.equal(s[1].day, 2, 'day marker works in any language');
  assert.equal(s[1].title, 'Jour 2 — 29.04', 'marker is stripped from the title');
  assert.equal(s[1].done, 1);
  assert.deepEqual(s[1].open, ['c']);
  assert.equal(s[2].day, 3, 'legacy "День N" heading still recognised');
});

test('collectStatus uses folder names from state.layout', () => {
  const root = mkdtempSync(join(tmpdir(), 'moderator-en-'));
  mkdirSync(join(root, '.moderator'), { recursive: true });
  const layout = {
    program: '00-program', artifacts: '01-artifacts', reflection: '02-reflection', report: '03-report',
    common: 'general', photos: 'photos', files: 'files', checklist: '03-report/checklist.md',
  };
  writeFileSync(
    join(root, '.moderator', 'state.json'),
    JSON.stringify({
      schema: 1,
      layout,
      language: { dialogue: 'en', report: 'en' },
      days: [{ n: 1, date: '2026-04-28', slug: 'day-1_28-04', blocks: [{ kind: 'group-work', in_report: true }] }],
    }),
  );
  mkdirSync(join(root, '01-artifacts', 'day-1_28-04', 'photos'), { recursive: true });
  writeFileSync(join(root, '01-artifacts', 'day-1_28-04', 'photos', 'a.jpg'), 'x');
  mkdirSync(join(root, '03-report'), { recursive: true });
  writeFileSync(join(root, '03-report', 'checklist.md'), '## Day 1 <!-- day:1 -->\n- [ ] Task\n');
  const s = collectStatus(root, { today: '2026-04-28' });
  assert.equal(s.days[0].photos.length, 1);
  assert.deepEqual(s.days[0].gaps, []);
  assert.equal(s.days[0].checklist.open, 1);
  assert.deepEqual(s.loose, [], 'custom layout folders are not reported as loose');
  assert.equal(s.language.report, 'en');
});

test('collectStatus reports uninitialized folder', () => {
  const root = mkdtempSync(join(tmpdir(), 'moderator-empty-'));
  assert.equal(collectStatus(root).initialized, false);
});

test('collectStatus counts materials, checklist and gaps', () => {
  const root = makeWorkspace();
  const s = collectStatus(root, { today: '2026-04-29' });
  assert.equal(s.initialized, true);
  const [d1, d2, d3] = s.days;

  assert.equal(d1.reflection.length, 1);
  assert.equal(d1.photos.length, 1, 'non-image files are not counted as photos');
  assert.deepEqual(d1.gaps, []);
  assert.equal(d1.checklist.done, 2);

  assert.equal(d2.blocks, 2, 'blocks with in_report:false are excluded');
  assert.deepEqual(d2.gaps, ['no-reflection', 'no-group-work-photos']);
  assert.equal(d2.checklist.open, 2);

  assert.equal(d3.started, false);
  assert.deepEqual(d3.gaps, [], 'future days never produce reminders');
  assert.equal(d3.status, 'pending');

  assert.deepEqual(s.common.artifacts, ['группы.pdf']);
  assert.equal(s.general.length, 2);
  assert.deepEqual(s.loose, ['IMG_0001.HEIC']);
});
