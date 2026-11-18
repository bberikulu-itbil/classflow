// Interface translation (src/i18n): exact keys, templates, punctuation, unknown text left alone. Run: node replica/unit/i18n.test.mjs
import { build } from 'esbuild'; import assert from 'node:assert/strict';
await build({ entryPoints: ['src/i18n/index.ts'], bundle: true, format: 'esm', platform: 'node', outfile: 'replica/unit/.i18n.mjs', logLevel: 'error', external: ['react'] });
const { translate, loadDict } = await import('./.i18n.mjs');
await loadDict();
assert.equal(translate('Кіру', 'ru'), 'Войти');
assert.equal(translate('Кіру', 'en'), 'Sign in');
assert.equal(translate('  Құпиясөз ', 'en'), '  Password ');
assert.equal(translate('Слайд 3 / 12'.replace('Слайд', 'Бет'), 'en'), 'Page 3 / 12');
assert.equal(translate('Тапсырма жабылған · тапсырды 5 / 20', 'ru'), 'Задание закрыто · сдали 5 / 20');
assert.equal(translate('Нәтиже:', 'en'), 'Result:');
assert.equal(translate('Айдана Нұрланқызы', 'ru'), null, 'a name is left alone');
assert.equal(translate('Кіру', 'kk'), null);
assert.equal(translate('Hello', 'ru'), null);
console.log('i18n ok');
