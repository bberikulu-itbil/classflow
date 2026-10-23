// Checks src/curriculum/filter.ts. Run: node replica/unit/modfilter.test.mjs
import { build } from 'esbuild'; import assert from 'node:assert/strict';
await build({ entryPoints: ['src/curriculum/filter.ts'], bundle: true, format: 'esm', outfile: '/tmp/modfilter.mjs', logLevel: 'error' });
const { visible, gradeOf, gradesIn } = await import('/tmp/modfilter.mjs');
const courses = [{ id: 'c7', title: 'Информатика 7', grade: 7 }, { id: 'cx', title: 'Жалпы', grade: null }];
const M = (id, o) => ({ id, course_id: 'c7', title: id, position: 0, kind: 'lesson', quarter: null, grade: null, ...o });
const mods = [M('q1', { quarter: 1 }), M('q2', { quarter: 2 }), M('any'), M('g8', { grade: 8, quarter: 2 }), M('kurs', { kind: 'course', grade: 8 }), M('free', { course_id: 'cx' })];
const f = (o) => mods.filter(m => visible(m, courses, { show: 'now', grade: 0, quarter: 2, course: '', ...o })).map(m => m.id);
assert.deepEqual(f({}), ['q2', 'any', 'g8', 'free'], 'this quarter: its own + quarter-less lesson modules, never course modules');
assert.deepEqual(f({ quarter: 1 }), ['q1', 'any', 'free'], 'quarter 1');
assert.deepEqual(f({ show: 'lessons' }), ['q1', 'q2', 'any', 'g8', 'free'], 'all lesson modules');
assert.deepEqual(f({ show: 'courses' }), ['kurs'], 'course modules only');
assert.deepEqual(f({ show: 'lessons', grade: 7 }), ['q1', 'q2', 'any'], 'parallel falls back to the course grade; a module without any grade is in no parallel');
assert.deepEqual(f({ show: 'lessons', grade: 8 }), ['g8'], 'own grade wins over the course grade');
assert.deepEqual(f({ show: 'courses', grade: 8 }), ['kurs']);
assert.deepEqual(f({ show: 'lessons', course: 'cx' }), ['free'], 'course filter');
assert.equal(gradeOf(mods[0], courses), 7); assert.equal(gradeOf(mods[3], courses), 8); assert.equal(gradeOf(mods[5], courses), null);
assert.deepEqual(gradesIn(mods, courses), [7, 8], 'chips list only parallels that exist, ascending');
console.log('modfilter: all ok');
