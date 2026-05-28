import { streamText } from 'ai';
import { getAgentConfig } from '@/lib/agentConfig';
import { getModelFromConfig } from '@/lib/agentClient';
import {
	formatSupportedBusinessChainNames,
	formatSupportedBusinessChainsWithIds,
} from '@/lib/businessChains';
import { buildPlannerPrompt } from '@/lib/plannerPrompt';
import {
	buildPlannerFallback,
	detectIntentFromMessage,
	extractPlannerPayload,
	type PlannerOutput,
	type SupportedWalletChainId,
} from '@/lib/plannerRuntime';
import {
	requestMainnetIntentFlight,
	type IntentFlightRecord,
} from '@/lib/lifiIntents';
import {
	buildWalletContextResponse,
	isWalletContextQuestion,
} from '@/lib/walletContext';
import { earningAgentStream, type EarningStreamChunk } from './earning';

type MainAgentInput = {
	userMessage: string;
	userAddress: string;
	walletChainId: number;
	messages: Array<{ role: 'user' | 'ai'; content: string }>;
};

export type MainAgentStreamChunk =
	| { type: 'thinking'; content: string }
	| { type: 'response'; content: string }
	| { type: 'error'; content: string }
	| { type: 'plan'; plan: PlannerOutput }
	| { type: 'intent_flight_record'; record: IntentFlightRecord }
	| EarningStreamChunk
	| {
			type: 'done';
			intent: 'earn' | 'intent' | 'bridge' | 'monitor' | 'unknown';
			chainId: number;
	  };

async function* streamPlannerText(
	input: MainAgentInput,
): AsyncGenerator<string, string> {
	const fallback = buildPlannerFallback({
		message: input.userMessage,
		walletChainId: input.walletChainId,
	});

	try {
		const config = getAgentConfig('main');
		const model = getModelFromConfig(config);
		const result = streamText({
			model,
			temperature: 0,
			maxTokens: 220,
			system: [
				'You are the planner for a DeFi earn application.',
				'Return JSON only.',
				'Supported intents: earn.deposit, intent.transfer, bridge, monitor, unknown.',
				'Supported asset in this version: USDC.',
				`Supported chains in this version: ${formatSupportedBusinessChainsWithIds()}.`,
				'Use intent.transfer for Base USDC -> Arbitrum USDC transfer/swap/send requests that ask for LI.FI Intents or best received amount.',
				'Use execute mode only when the user clearly asks to proceed now.',
				'Schema:',
				'{"intent":"earn.deposit|intent.transfer|bridge|monitor|unknown","asset":"USDC","amount":500,"sourceChain":8453,"targetChain":42161,"minApy":null,"riskPreference":"low|medium|high","objective":"best_received|fastest|lowest_cost","needsConfirmation":true,"mode":"recommend|execute"}',
			].join('\n'),
			prompt: buildPlannerPrompt(input),
		});

		let text = '';
		for await (const delta of result.textStream) {
			text += delta;
			yield delta;
		}

		return text;
	} catch {
		return JSON.stringify(fallback);
	}
}

function unsupportedIntentMessage(intent: 'bridge' | 'monitor'): string {
	if (intent === 'bridge') {
		return [
			'## Bridge 暂未开放',
			'当前版本先把 Earn 主链路做稳，Bridge 会在后续阶段恢复。',
			'你现在可以这样问：Find the best USDC vault on Base',
		].join('\n\n');
	}

	return [
		'## Monitor 暂未开放',
		'当前版本先把 Earn 主链路做稳，Monitor 会在后续阶段恢复。',
		'你现在可以这样问：Find the best USDC vault on Arbitrum',
	].join('\n\n');
}

function unknownIntentMessage(): string {
	return [
		'我目前只开放了 Earn 主链路。',
		`支持链：${formatSupportedBusinessChainNames()}。`,
		'当前演示资产：USDC。',
		'你可以这样问：put 500 USDC into the safest vault above 5% APY on Arbitrum',
	].join('\n\n');
}

function buildUnknownIntentPrompt(input: MainAgentInput): string {
	const history = input.messages
		.slice(-6)
		.map((message) => `${message.role}: ${message.content}`)
		.join('\n');

	return [
		`User wallet: ${input.userAddress}`,
		`Wallet chain: ${input.walletChainId}`,
		`Current message: ${input.userMessage}`,
		history ? `Recent messages:\n${history}` : '',
	]
		.filter(Boolean)
		.join('\n\n');
}

async function* unknownIntentMessageFromModel(
	input: MainAgentInput,
): AsyncGenerator<string> {
	try {
		const model = getModelFromConfig(getAgentConfig('main'));
		const result = streamText({
			model,
			temperature: 0,
			maxTokens: 800,
			system: [
				'You are Avalokita, the LI.FI AI Earn agent for a USDC-focused DeFi assistant.',
				'You can call tools to gather facts when needed, but do not fabricate tool output.',
				'The current product scope is Earn only.',
				`Supported chains: ${formatSupportedBusinessChainsWithIds()}.`,
				'Supported asset in this demo: USDC.',
				'If the request is out of scope, politely explain scope and provide 1-2 valid Earn examples.',
			].join('\n'),
			prompt: buildUnknownIntentPrompt(input),
		});

		for await (const delta of result.textStream) {
			yield delta;
		}
	} catch {
		return;
	}
}

export async function* mainAgentStream(
	input: MainAgentInput,
): AsyncGenerator<MainAgentStreamChunk> {
	yield { type: 'thinking', content: 'Planning request, please wait...\n' };

	let plannerText = '';
	const plannerStream = streamPlannerText(input);
	while (true) {
		const next = await plannerStream.next();
		if (next.done) {
			plannerText = next.value;
			break;
		}

		yield { type: 'thinking', content: next.value };
	}

	const plan = extractPlannerPayload(plannerText, input.walletChainId);
	const detected = detectIntentFromMessage(input.userMessage);
	const effectiveIntent =
		plan.intent === 'unknown' && detected.intent !== 'unknown'
			? detected.intent
			: plan.intent;

	if (effectiveIntent === 'earn.deposit') {
		for await (const chunk of earningAgentStream({
			userMessage: input.userMessage,
			userAddress: input.userAddress,
			plan,
			messages: input.messages,
		})) {
			yield chunk;
		}

		yield {
			type: 'done',
			intent: 'earn',
			chainId: plan.targetChain as SupportedWalletChainId,
		};
		return;
	}

	if (effectiveIntent === 'intent.transfer') {
		const intentPlan =
			plan.intent === 'intent.transfer'
				? plan
				: buildPlannerFallback({
						message: input.userMessage,
						walletChainId: input.walletChainId,
					});

		yield { type: 'plan', plan: intentPlan };
		yield {
			type: 'thinking',
			content: 'Requesting a mainnet LI.FI Intents solver quote...\n',
		};

		const record = await requestMainnetIntentFlight({
			asset: 'USDC',
			amount: intentPlan.amount,
			sourceChain: intentPlan.sourceChain,
			targetChain: intentPlan.targetChain,
			objective: intentPlan.objective,
			userAddress: input.userAddress,
		});

		yield { type: 'intent_flight_record', record };
		yield {
			type: 'response',
			content:
				record.status === 'quote_ready'
					? [
							'## IntentLens Flight Recorder',
							record.educationSummary,
							'The record below is a mainnet LI.FI Intents quote/order preview. No funds move unless you manually confirm a wallet signature.',
						].join('\n\n')
					: [
							'## IntentLens Flight Recorder',
							record.educationSummary,
							`Mainnet LI.FI Intents response: ${record.quoteResult.success ? 'quote ready' : record.quoteResult.error}`,
						].join('\n\n'),
		};
		yield {
			type: 'done',
			intent: 'intent',
			chainId: intentPlan.targetChain,
		};
		return;
	}

	if (effectiveIntent === 'bridge' || effectiveIntent === 'monitor') {
		yield {
			type: 'response',
			content: unsupportedIntentMessage(effectiveIntent),
		};
		yield {
			type: 'done',
			intent: effectiveIntent,
			chainId: plan.targetChain,
		};
		return;
	}

	if (isWalletContextQuestion(input.userMessage)) {
		yield {
			type: 'response',
			content: buildWalletContextResponse({
				userAddress: input.userAddress,
				walletChainId: input.walletChainId,
			}),
		};
		yield {
			type: 'done',
			intent: 'unknown',
			chainId: input.walletChainId,
		};
		return;
	}

	let emittedUnknownResponse = false;
	for await (const delta of unknownIntentMessageFromModel(input)) {
		emittedUnknownResponse = true;
		yield { type: 'response', content: delta };
	}

	if (!emittedUnknownResponse) {
		yield { type: 'response', content: unknownIntentMessage() };
	}
	yield {
		type: 'done',
		intent: 'unknown',
		chainId: plan.targetChain,
	};
}
