import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

async function loadLifiIntentsModule() {
	return loadTsModule('./lib/lifiIntents.ts');
}

test('buildMainnetIntentQuoteRequest creates the supported Base to Arbitrum USDC request', async () => {
	const { buildMainnetIntentQuoteRequest } = await loadLifiIntentsModule();

	const request = buildMainnetIntentQuoteRequest({
		userAddress: '0x1111111111111111111111111111111111111111',
		amount: 10,
		sourceChain: 8453,
		targetChain: 42161,
	});

	assert.equal(request.success, true);
	assert.equal(request.data.route.fromChainId, 8453);
	assert.equal(request.data.route.toChainId, 42161);
	assert.equal(request.data.route.fromToken.symbol, 'USDC');
	assert.equal(request.data.route.toToken.symbol, 'USDC');
	assert.equal(request.data.amount, '10000000');
	assert.equal(request.data.user, '0x1111111111111111111111111111111111111111');
	assert.equal(request.data.receiver, '0x1111111111111111111111111111111111111111');
});

test('buildMainnetIntentQuoteRequest rejects unsupported routes', async () => {
	const { buildMainnetIntentQuoteRequest } = await loadLifiIntentsModule();

	const request = buildMainnetIntentQuoteRequest({
		userAddress: '0x1111111111111111111111111111111111111111',
		amount: 10,
		sourceChain: 1,
		targetChain: 42161,
	});

	assert.equal(request.success, false);
	assert.match(request.error, /Base USDC -> Arbitrum USDC/);
});

test('createLifiIntentsClient posts quote requests to the mainnet order API', async () => {
	const calls = [];
	const { createLifiIntentsClient } = await loadLifiIntentsModule();
	const client = createLifiIntentsClient(async (url, init) => {
		calls.push({ url: String(url), init });
		return new Response(JSON.stringify({ quotes: [{ id: 'solver-quote-1' }] }), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		});
	});

	const result = await client.requestQuote({
		user: '0x1111111111111111111111111111111111111111',
		receiver: '0x1111111111111111111111111111111111111111',
		amount: '10000000',
		route: {
			fromChainId: 8453,
			toChainId: 42161,
			fromToken: { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
			toToken: { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
		},
		objective: 'best_received',
	});

	assert.equal(result.success, true);
	assert.equal(calls.length, 1);
	assert.equal(calls[0].url, 'https://order.li.fi/quote/request');
	assert.equal(calls[0].init.method, 'POST');
	assert.equal(calls[0].init.headers['content-type'], 'application/json');
	assert.match(String(calls[0].init.body), /10000000/);
});

test('buildIntentFlightRecord records a truthful failed quote attempt', async () => {
	const { buildIntentFlightRecord } = await loadLifiIntentsModule();

	const record = buildIntentFlightRecord({
		goal: {
			asset: 'USDC',
			amount: 10,
			sourceChain: 8453,
			targetChain: 42161,
			objective: 'best_received',
			userAddress: '0x1111111111111111111111111111111111111111',
		},
		quoteRequest: {
			user: '0x1111111111111111111111111111111111111111',
			receiver: '0x1111111111111111111111111111111111111111',
			amount: '10000000',
			route: {
				fromChainId: 8453,
				toChainId: 42161,
				fromToken: { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
				toToken: { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
			},
			objective: 'best_received',
		},
		quoteResult: {
			success: false,
			status: 404,
			error: 'No solver quote is available.',
		},
	});

	assert.equal(record.mode, 'lifi_intents');
	assert.equal(record.status, 'quote_failed');
	assert.equal(
		record.steps.find((step) => step.key === 'request_solver_quote')?.status,
		'failed',
	);
	assert.match(record.educationSummary, /solver/i);
	assert.match(record.classicRouteComparison, /classic LI\.FI route/i);
});

test('requestMainnetIntentFlight builds and requests a mainnet flight record', async () => {
	const { requestMainnetIntentFlight } = await loadLifiIntentsModule();
	const seenRequests = [];

	const record = await requestMainnetIntentFlight(
		{
			asset: 'USDC',
			amount: 5,
			sourceChain: 8453,
			targetChain: 42161,
			objective: 'best_received',
			userAddress: '0x1111111111111111111111111111111111111111',
		},
		{
			requestQuote: async (request) => {
				seenRequests.push(request);
				return {
					success: true,
					status: 200,
					data: { quotes: [{ id: 'mainnet-quote' }] },
				};
			},
		},
	);

	assert.equal(seenRequests.length, 1);
	assert.equal(seenRequests[0].amount, '5000000');
	assert.equal(record.status, 'quote_ready');
	assert.deepEqual(record.orderPreview, { quotes: [{ id: 'mainnet-quote' }] });
});
