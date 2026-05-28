export function normalizeExecutionError(error: unknown) {
	const message =
		error instanceof Error ? error.message : 'Execution failed unexpectedly.';
	const lower = message.toLowerCase();

	if (lower.includes('user rejected') || lower.includes('user denied')) {
		return {
			errorCode: 'user_rejected',
			error: 'Wallet signature was rejected by the user.',
		};
	}

	if (lower.includes('simulation') || lower.includes('gas required exceeds')) {
		return {
			errorCode: 'wallet_simulation_failed',
			error:
				'The wallet simulation predicts this transaction will fail, so it was not broadcast.',
		};
	}

	if (lower.includes('timed out')) {
		return {
			errorCode: 'receipt_timeout',
			error:
				'The transaction was not confirmed before the timeout. Check the explorer or retry later.',
		};
	}

	if (lower.includes('cancelled in the wallet')) {
		return {
			errorCode: 'transaction_cancelled',
			error: message,
		};
	}

	if (lower.includes('wallet client is unavailable')) {
		return {
			errorCode: 'wallet_unavailable',
			error: message,
		};
	}

	return {
		errorCode: 'execution_failed',
		error: message,
	};
}
