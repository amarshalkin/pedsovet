import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportFileName, moderatorName, tablesPart, programPart, datesPart, PROGRAM_MAX } from '../report-filename.mjs';

const days = (...dates) => dates.map((date, i) => ({ n: i + 1, date }));

test('the example from the formula', () => {
  const res = reportFileName({
    language: { report: 'ru' },
    event: { name: 'Программа для директоров школ «Директор на высоте»' },
    moderator: { name: 'Маршалкин Артём Сергеевич', table: '9' },
    days: days('2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'),
  });
  assert.equal(res.file, 'Отчет_модератора_Маршалкин_А.С._стол_9_директор_на_высоте_02.11-05.11.2026.docx');
  assert.deepEqual(res.missing, []);
  assert.deepEqual(res.warnings, []);
  assert.equal(res.shortened, false);
});

test('moderator name forms', () => {
  assert.equal(moderatorName({ name: 'Маршалкин А.С.' }).value, 'Маршалкин_А.С.');
  assert.equal(moderatorName({ name: 'Маршалкин А. С.' }).value, 'Маршалкин_А.С.');
  assert.equal(moderatorName({ name: 'А.С. Маршалкин' }).value, 'Маршалкин_А.С.');
  assert.equal(moderatorName({ name: 'Артём Сергеевич Маршалкин' }).value, 'Маршалкин_А.С.');
  assert.equal(moderatorName({ name: 'Ирина Соколова', name_short: 'Соколова И.' }).value, 'Соколова_И.');
  const two = moderatorName({ name: 'Ирина Соколова' });
  assert.deepEqual(two.warnings, ['name-order']);
});

test('one table and several tables', () => {
  assert.equal(tablesPart({ table: '9' }), 'стол_9');
  assert.equal(tablesPart({ table: 9 }), 'стол_9');
  assert.equal(tablesPart({ table: '10, 9' }), 'столы_9_10');
  assert.equal(tablesPart({ tables: [9, 10] }), 'столы_9_10');
  assert.equal(tablesPart({ table: 'столы 9 и 10' }), 'столы_9_10');
  assert.equal(tablesPart({}), null);
});

test('program name: quoted proper name, short_name, shortening by whole words', () => {
  assert.equal(programPart({ name: 'Форум молодых педагогов «Восход»' }).value, 'восход');
  assert.equal(programPart({ name: 'Семинар-практикум «Весенний педсовет’26»' }).value, 'весенний_педсовет_26');
  assert.equal(programPart({ name: 'X', short_name: 'Директор на высоте' }).value, 'директор_на_высоте');
  const long = programPart({ name: 'Управление изменениями в образовательной организации: практикум 2026' });
  assert.ok(long.value.length <= PROGRAM_MAX);
  assert.equal(long.value, 'управление_изменениями');
  assert.equal(long.shortened, true);
  const tail = programPart({ name: 'Школа лидеров для руководителей' }, 18);
  assert.equal(tail.value, 'школа_лидеров');
});

test('dates: one year, across years, one day, fallback to event.dates', () => {
  assert.equal(datesPart({ days: days('2026-11-05', '2026-11-02') }), '02.11-05.11.2026');
  assert.equal(datesPart({ days: days('2026-12-30', '2027-01-02') }), '30.12.2026-02.01.2027');
  assert.equal(datesPart({ days: days('2026-11-02') }), '02.11.2026');
  assert.equal(datesPart({ event: { dates: '12.11.2026 — 15.11.2026' } }), '12.11-15.11.2026');
});

test('missing parts are left out and reported; English labels', () => {
  const res = reportFileName({ event: { name: '«Восход»' }, days: days('2026-11-12') });
  assert.equal(res.file, 'Отчет_модератора_восход_12.11.2026.docx');
  assert.deepEqual(res.missing, ['moderator.name', 'moderator.table']);
  const en = reportFileName({
    language: { report: 'en-GB' },
    event: { name: 'Leaders "Summit"' },
    moderator: { name: 'Smith J.', tables: [3, 4] },
    days: days('2026-11-02', '2026-11-03'),
  });
  assert.equal(en.file, 'Moderator_report_Smith_J._tables_3_4_summit_02.11-03.11.2026.docx');
});
