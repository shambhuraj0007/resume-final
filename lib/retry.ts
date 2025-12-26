interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoff?: 'linear' | 'exponential';
  shouldRetry?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoff: 'exponential',
  shouldRetry: (error: any) => {
    if (error.name === 'TypeError' || error.name === 'NetworkError') return true;
    if (error.status >= 500 && error.status < 600) return true;
    if (error.status === 408 || error.status === 429) return true;
    return false;
  },
  onRetry: (attempt: number, error: any) => {
    console.log(`[RETRY] Attempt ${attempt} failed:`, error.message);
  },
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (attempt === opts.maxAttempts || !opts.shouldRetry(error)) {
        throw error;
      }

      opts.onRetry(attempt, error);

      let delay = opts.delayMs;
      if (opts.backoff === 'exponential') {
        delay = opts.delayMs * Math.pow(2, attempt - 1);
      }

      const jitter = delay * 0.2 * (Math.random() * 2 - 1);
      delay = Math.floor(delay + jitter);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
