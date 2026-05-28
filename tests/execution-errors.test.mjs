import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

async function loadExecutionErrorsModule() {
	const sourcePath = path.resolve('./lib/executionErrors.ts');
	const source = fs.readFileSync(sourcePath, 'utf8');
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.ES2022,
			target: ts.ScriptTarget.ES2022,
		},
		fileName: sourcePath,
	});

	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'execution-errors-'));
	const outputPath = path.join(tempDir, 'executionErrors.mjs');
	fs.writeFileSync(outputPath, outputText, 'utf8');
	return import(pathToFileURL(outputPath).href);
}

test('normalizeExecutionError maps wallet simulation failures deterministically', async () => {
	const { normalizeExecutionError } = await loadExecutionErrorsModule();

	const state = normalizeExecutionError(
		new Error('Wallet simulation failed before broadcast'),
	);

	assert.equal(state.errorCode, 'wallet_simulation_failed');
	assert.match(state.error ?? '', /not broadcast/i);
});

test('normalizeExecutionError maps wallet-side cancellation deterministically', async () => {
	const { normalizeExecutionError } = await loadExecutionErrorsModule();

	const state = normalizeExecutionError(
		new Error('Deposit transaction was cancelled in the wallet before confirmation.'),
	);

	assert.equal(state.errorCode, 'transaction_cancelled');
	assert.match(state.error ?? '', /cancelled/i);
});
