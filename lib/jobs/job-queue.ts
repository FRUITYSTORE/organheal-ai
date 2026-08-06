export interface BackgroundJobQueue {
  enqueue<T>(
    job: T
  ): Promise<void>;

  dequeue<T>(): Promise<T | null>;

  peek<T>(): Promise<T | null>;

  size(): Promise<number>;

  clear(): Promise<void>;
}