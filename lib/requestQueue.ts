// lib/requestQueue.ts
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private readonly DELAY_BETWEEN_REQUESTS = 1000; // 1 second

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const request = this.queue.shift()!;

    await request();
    await new Promise(resolve => setTimeout(resolve, this.DELAY_BETWEEN_REQUESTS));

    this.processQueue();
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

export const openRouterQueue = new RequestQueue();
