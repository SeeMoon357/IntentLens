import { parseUnits } from 'viem';
import { getChainLabel, getUsdcAddress } from './businessChains';
import type { PlannerObjective } from './plannerRuntime';

const LIFI_INTENTS_MAINNET_BASE_URL = 'https://order.li.fi';
const INTENT_SOURCE_CHAIN_ID = 8453;
const INTENT_TARGET_CHAIN_ID = 42161;
const USDC_DECIMALS = 6;

type FetchLike = typeof fetch;

export type IntentToken = {
	symbol: 'USDC';
	address: string;
};

export type IntentRoute = {
	fromChainId: number;
	toChainId: number;
	fromToken: IntentToken;
	toToken: IntentToken;
};

export type IntentQuoteRequest = {
	user: string;
	receiver: string;
	amount: string;
	route: IntentRoute;
	objective: PlannerObjective;
};

export type IntentGoal = {
	asset: 'USDC';
	amount: number | null;
	sourceChain: number;
	targetChain: number;
	objective: PlannerObjective;
	userAddress: string;
};

export type LifiIntentsResult<T> =
	| {
			success: true;
			status: number;
			data: T;
	  }
	| {
			success: false;
			status: number | null;
			error: string;
			payload?: unknown;
	  };

export type IntentFlightStep = {
	key:
		| 'parse_goal'
		| 'build_intent'
		| 'request_solver_quote'
		| 'order_preview'
		| 'delivery_settlement_model';
	title: string;
	status: 'completed' | 'failed' | 'pending';
	summary: string;
};

export type IntentFlightRecord = {
	mode: 'lifi_intents';
	goal: IntentGoal;
	steps: IntentFlightStep[];
	quoteRequest: IntentQuoteRequest | null;
	quoteResult: LifiIntentsResult<unknown>;
	orderPreview: unknown | null;
	status: 'quote_ready' | 'quote_failed';
	educationSummary: string;
	classicRouteComparison: string;
};

function isSupportedIntentRoute(input: {
	sourceChain: number;
	targetChain: number;
}): boolean {
	return (
		input.sourceChain === INTENT_SOURCE_CHAIN_ID &&
		input.targetChain === INTENT_TARGET_CHAIN_ID
	);
}

function toErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Unknown error';
}

async function parseJsonResponse(response: Response): Promise<unknown> {
	const contentType = response.headers.get('content-type') || '';
	if (!contentType.includes('application/json')) {
		return response.text();
	}

	return response.json();
}

export function buildMainnetIntentQuoteRequest(input: {
	userAddress: string;
	amount: number | null;
	sourceChain: number;
	targetChain: number;
	objective?: PlannerObjective;
}):
	| { success: true; data: IntentQuoteRequest }
	| { success: false; error: string } {
	if (!isSupportedIntentRoute(input)) {
		return {
			success: false,
			error:
				'IntentLens MVP only supports Base USDC -> Arbitrum USDC for mainnet LI.FI Intents.',
		};
	}

	if (input.amount == null || !Number.isFinite(input.amount) || input.amount <= 0) {
		return {
			success: false,
			error: 'A positive USDC amount is required before requesting a mainnet intent quote.',
		};
	}

	const fromToken = getUsdcAddress(INTENT_SOURCE_CHAIN_ID);
	const toToken = getUsdcAddress(INTENT_TARGET_CHAIN_ID);
	if (!fromToken || !toToken) {
		return {
			success: false,
			error: 'USDC token configuration is missing for the supported Intents route.',
		};
	}

	return {
		success: true,
		data: {
			user: input.userAddress,
			receiver: input.userAddress,
			amount: parseUnits(String(input.amount), USDC_DECIMALS).toString(),
			route: {
				fromChainId: INTENT_SOURCE_CHAIN_ID,
				toChainId: INTENT_TARGET_CHAIN_ID,
				fromToken: { symbol: 'USDC', address: fromToken },
				toToken: { symbol: 'USDC', address: toToken },
			},
			objective: input.objective ?? 'best_received',
		},
	};
}

export function createLifiIntentsClient(fetchImpl: FetchLike = fetch) {
	return {
		async requestQuote(
			request: IntentQuoteRequest,
		): Promise<LifiIntentsResult<unknown>> {
			try {
				const response = await fetchImpl(
					`${LIFI_INTENTS_MAINNET_BASE_URL}/quote/request`,
					{
						method: 'POST',
						cache: 'no-store',
						headers: {
							'content-type': 'application/json',
						},
						body: JSON.stringify(request),
					},
				);
				const payload = await parseJsonResponse(response);

				if (!response.ok) {
					return {
						success: false,
						status: response.status,
						error:
							typeof payload === 'string'
								? payload
								: `LI.FI Intents quote request failed with status ${response.status}.`,
						payload,
					};
				}

				return {
					success: true,
					status: response.status,
					data: payload,
				};
			} catch (error) {
				return {
					success: false,
					status: null,
					error: toErrorMessage(error),
				};
			}
		},
	};
}

function buildSucceededSteps(): IntentFlightStep[] {
	return [
		{
			key: 'parse_goal',
			title: 'Parse Goal',
			status: 'completed',
			summary: 'IntentLens converted the natural-language request into a USDC outcome.',
		},
		{
			key: 'build_intent',
			title: 'Build Intent',
			status: 'completed',
			summary: 'The app scoped the intent to Base USDC -> Arbitrum USDC on mainnet.',
		},
		{
			key: 'request_solver_quote',
			title: 'Request Solver Quote',
			status: 'completed',
			summary: 'LI.FI Intents returned a real mainnet solver quote or order preview payload.',
		},
		{
			key: 'order_preview',
			title: 'Order Preview',
			status: 'completed',
			summary: 'The preview is shown before any wallet signature or mainnet spending.',
		},
		{
			key: 'delivery_settlement_model',
			title: 'Delivery / Settlement Model',
			status: 'pending',
			summary: 'A solver would deliver the target output, then settlement verifies delivery before release.',
		},
	];
}

function buildFailedSteps(error: string): IntentFlightStep[] {
	const steps = buildSucceededSteps();
	return steps.map((step) =>
		step.key === 'request_solver_quote'
			? {
					...step,
					status: 'failed' as const,
					summary: `LI.FI Intents did not return an executable quote: ${error}`,
				}
			: step.key === 'order_preview' || step.key === 'delivery_settlement_model'
				? { ...step, status: 'pending' as const }
				: step,
	);
}

export function buildIntentFlightRecord(input: {
	goal: IntentGoal;
	quoteRequest: IntentQuoteRequest | null;
	quoteResult: LifiIntentsResult<unknown>;
}): IntentFlightRecord {
	const quoteSucceeded = input.quoteResult.success;
	const fromChain = getChainLabel(input.goal.sourceChain);
	const toChain = getChainLabel(input.goal.targetChain);

	return {
		mode: 'lifi_intents',
		goal: input.goal,
		steps: quoteSucceeded
			? buildSucceededSteps()
			: buildFailedSteps(input.quoteResult.error),
		quoteRequest: input.quoteRequest,
		quoteResult: input.quoteResult,
		orderPreview: quoteSucceeded ? input.quoteResult.data : null,
		status: quoteSucceeded ? 'quote_ready' : 'quote_failed',
		educationSummary: quoteSucceeded
			? `This run asked LI.FI Intents for a real mainnet solver quote from ${fromChain} to ${toChain}. No funds move until the connected wallet signs.`
			: `This run still teaches the LI.FI Intents path: the app built an intent, asked the solver marketplace for a quote, and surfaced the real failure instead of inventing solver output.`,
		classicRouteComparison:
			'In a classic LI.FI route flow, the app requests route steps and the user signs a route transaction. In LI.FI Intents, the app defines the desired outcome while solvers compete to deliver it and settlement verifies the result.',
	};
}

export async function requestMainnetIntentFlight(
	goal: IntentGoal,
	client: Pick<ReturnType<typeof createLifiIntentsClient>, 'requestQuote'> =
		createLifiIntentsClient(),
): Promise<IntentFlightRecord> {
	const request = buildMainnetIntentQuoteRequest({
		userAddress: goal.userAddress,
		amount: goal.amount,
		sourceChain: goal.sourceChain,
		targetChain: goal.targetChain,
		objective: goal.objective,
	});

	if (!request.success) {
		return buildIntentFlightRecord({
			goal,
			quoteRequest: null,
			quoteResult: {
				success: false,
				status: null,
				error: request.error,
			},
		});
	}

	const quoteResult = await client.requestQuote(request.data);
	return buildIntentFlightRecord({
		goal,
		quoteRequest: request.data,
		quoteResult,
	});
}
