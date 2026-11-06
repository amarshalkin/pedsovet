import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadRules, lint } from '../lint-report.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rules = loadRules(readFileSync(join(root, 'assets', 'templates', 'default', 'профиль.md'), 'utf8'));
const levels = (res) => res.map((r) => `${r.level}:${r.line}`);

const goodDay = `## 12.11.2026

### Открытие программы

#### Задача блока.

Задать рамку четырёх дней.

#### Комментарий модератора

Группа собралась полностью. Настрой осторожный. Обсуждали ожидания. Позиции ровные.

### Осмысление дня

#### Тезисы участников (ключевые тезисы)

- Устала, но довольна.
- Впервые не страшно говорить вслух.

#### Комментарий модератора

К вечеру стало спокойнее. Группа сблизилась. Появились первые идеи. Завтра — проектная работа.
`;

test('the default profile carries machine rules', () => {
  assert.equal(rules.profile, 1);
  assert.equal(rules.block_level, 3);
  assert.ok(rules.reflection_required.length >= 2);
});

test('a clean day passes with no remarks', () => {
  assert.deepEqual(lint(goodDay, rules, 'day'), []);
});

test('placeholders and bold body text are errors', () => {
  const day = goodDay.replace('Позиции ровные.', 'Позиции ровные. [[нужно: как включилась группа]] **важно**');
  const res = lint(day, rules, 'day');
  assert.equal(res.filter((r) => r.level === 'ERROR').length, 2);
  assert.ok(res.some((r) => r.msg.includes('незаполненное')));
  assert.ok(res.some((r) => r.msg.includes('жирный')));
});

test('reflection without theses is an error; block without task is a warning', () => {
  const day = goodDay.replace(/#### Тезисы участников[\s\S]*?(?=#### Комментарий)/, '').replace(/#### Задача блока\.\n\nЗадать рамку четырёх дней\.\n\n/, '');
  const res = lint(day, rules, 'day');
  assert.ok(res.some((r) => r.level === 'ERROR' && r.msg.includes('Тезисы участников')));
  assert.ok(res.some((r) => r.level === 'WARN' && r.msg.includes('Задача блока.')));
});

test('list punctuation: theses end with a period, moderator lists use ; and .', () => {
  const day = goodDay.replace('- Устала, но довольна.', '- Устала, но довольна')
    .replace('Задать рамку четырёх дней.', 'Задать рамку:\n\n- первое\n- второе;\n- третье;');
  const res = lint(day, rules, 'day');
  assert.ok(res.some((r) => r.msg.startsWith('тезис должен')));
  assert.ok(res.some((r) => r.msg.startsWith('пункт списка')));
  assert.ok(res.some((r) => r.msg.startsWith('последний пункт')));
});

test('short comments are flagged as warnings', () => {
  const day = goodDay.replace('Группа собралась полностью. Настрой осторожный. Обсуждали ожидания. Позиции ровные.', 'Группа собралась.');
  assert.deepEqual(levels(lint(day, rules, 'day')), ['WARN:9']);
});

test('report mode requires the header and the final sections', () => {
  const res = lint(goodDay, rules, 'report');
  assert.ok(res.some((r) => r.msg.includes('ФИО модератора:')));
  assert.ok(res.some((r) => r.msg.includes('Комментарий модератора по программе')));
  const full = `# Отчёт\n\nФИО модератора: Иван Иванов\n\nНомер стола: 7\n\n${goodDay}\n## Комментарий модератора по программе\n\nТекст.\n\n## Список наиболее активных участников\n\nВсе.\n\n## Список наименее активных участников\n\nНе зафиксировано.\n`;
  assert.equal(lint(full, rules, 'report').filter((r) => r.level === 'ERROR').length, 0);
});

test('a profile without a checks section is rejected', () => {
  assert.throws(() => loadRules('# Профиль\n\n## Скелет\n'), /Проверки/);
});
