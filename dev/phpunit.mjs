// Runs the PHP unit tests without a local PHP install: PHPUnit's phar on php-wasm.
// With a native PHP + Composer setup, `composer install && vendor/bin/phpunit` does the same.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

const phar = 'dev/.cache/phpunit-11.phar';
if (!existsSync(phar)) {
  mkdirSync('dev/.cache', { recursive: true });
  execFileSync('curl', ['-fsSL', '-o', phar, 'https://phar.phpunit.de/phpunit-11.5.57.phar'], { stdio: 'inherit' });
}
execFileSync('npx', ['-y', '@php-wasm/cli@3.1.62', phar, ...process.argv.slice(2)], { stdio: 'inherit' });
