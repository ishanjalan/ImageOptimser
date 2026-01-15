// Worker Pool Manager
// Distributes image compression jobs across multiple Web Workers

import type { WorkerRequest, WorkerResponse, ImageFormat } from '$lib/workers/compress.worker';

export interface CompressionJob {
	id: string;
	imageBuffer: ArrayBuffer;
	inputFormat: ImageFormat;
	outputFormat: ImageFormat;
	quality: number;
	lossless: boolean;
	onProgress?: (progress: number) => void;
	onComplete: (result: ArrayBuffer, mimeType: string, width: number, height: number) => void;
	onError: (error: string) => void;
}

interface PoolWorker {
	worker: Worker;
	busy: boolean;
	currentJobId: string | null;
}

// Pool configuration
const MAX_WORKERS = 4;
const MIN_WORKERS = 1;

// Pool state
let workers: PoolWorker[] = [];
let jobQueue: CompressionJob[] = [];
let jobCallbacks: Map<string, CompressionJob> = new Map();
let poolInitialized = false;
let poolInitializing = false;

// Get optimal worker count based on hardware
function getOptimalWorkerCount(): number {
	if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
		// Use half of available cores, capped between MIN and MAX
		const cores = navigator.hardwareConcurrency;
		return Math.min(MAX_WORKERS, Math.max(MIN_WORKERS, Math.floor(cores / 2)));
	}
	return MIN_WORKERS;
}

// Create a single worker
function createWorker(): Promise<PoolWorker> {
	return new Promise((resolve, reject) => {
		try {
			const worker = new Worker(
				new URL('../workers/compress.worker.ts', import.meta.url),
				{ type: 'module' }
			);

			const poolWorker: PoolWorker = {
				worker,
				busy: false,
				currentJobId: null
			};

			// Handle messages from worker
			worker.onmessage = (event: MessageEvent<WorkerResponse | { type: string }>) => {
				const data = event.data;

				// Worker ready signal
				if ('type' in data && data.type === 'ready') {
					resolve(poolWorker);
					return;
				}

				// Compression response
				const response = data as WorkerResponse;
				const job = jobCallbacks.get(response.id);

				if (!job) return;

				// Progress update
				if (response.progress !== undefined && !response.result && !response.error) {
					job.onProgress?.(response.progress);
					return;
				}

				// Job completed
				if (response.success && response.result && response.mimeType) {
					job.onComplete(response.result, response.mimeType, response.width!, response.height!);
				} else if (!response.success) {
					job.onError(response.error || 'Unknown error');
				}

				// Clean up and process next job
				jobCallbacks.delete(response.id);
				poolWorker.busy = false;
				poolWorker.currentJobId = null;
				processNextJob();
			};

			worker.onerror = (error) => {
				console.error('Worker error:', error);
				
				// If worker had a job, report error
				if (poolWorker.currentJobId) {
					const job = jobCallbacks.get(poolWorker.currentJobId);
					if (job) {
						job.onError('Worker crashed');
						jobCallbacks.delete(poolWorker.currentJobId);
					}
				}

				// Mark worker as not busy and try to recover
				poolWorker.busy = false;
				poolWorker.currentJobId = null;
				processNextJob();
			};

			// Timeout for worker initialization
			setTimeout(() => {
				reject(new Error('Worker initialization timeout'));
			}, 10000);
		} catch (error) {
			reject(error);
		}
	});
}

// Initialize the worker pool
export async function initPool(): Promise<void> {
	if (poolInitialized || poolInitializing) return;
	
	poolInitializing = true;

	try {
		const workerCount = getOptimalWorkerCount();
		console.log(`Initializing worker pool with ${workerCount} workers`);

		const workerPromises = Array(workerCount).fill(null).map(() => createWorker());
		workers = await Promise.all(workerPromises);
		
		poolInitialized = true;
		console.log('Worker pool initialized');

		// Process any queued jobs
		processNextJob();
	} catch (error) {
		console.error('Failed to initialize worker pool:', error);
		throw error;
	} finally {
		poolInitializing = false;
	}
}

// Find an available worker
function getAvailableWorker(): PoolWorker | null {
	return workers.find(w => !w.busy) || null;
}

// Process the next job in queue
function processNextJob(): void {
	if (jobQueue.length === 0) return;

	const availableWorker = getAvailableWorker();
	if (!availableWorker) return;

	const job = jobQueue.shift()!;
	assignJobToWorker(availableWorker, job);
}

// Assign a job to a specific worker
function assignJobToWorker(poolWorker: PoolWorker, job: CompressionJob): void {
	poolWorker.busy = true;
	poolWorker.currentJobId = job.id;
	jobCallbacks.set(job.id, job);

	const request: WorkerRequest = {
		id: job.id,
		type: 'compress',
		imageBuffer: job.imageBuffer,
		inputFormat: job.inputFormat,
		outputFormat: job.outputFormat,
		quality: job.quality,
		lossless: job.lossless
	};

	// Transfer the buffer to the worker for better performance
	poolWorker.worker.postMessage(request, [job.imageBuffer]);
}

// Queue a compression job
export async function queueJob(job: CompressionJob): Promise<void> {
	// Ensure pool is initialized
	if (!poolInitialized) {
		await initPool();
	}

	// Check if a worker is available
	const availableWorker = getAvailableWorker();
	
	if (availableWorker) {
		// Assign immediately
		assignJobToWorker(availableWorker, job);
	} else {
		// Add to queue
		jobQueue.push(job);
	}
}

// Process an image and return a promise
export function processImage(
	id: string,
	imageBuffer: ArrayBuffer,
	inputFormat: ImageFormat,
	outputFormat: ImageFormat,
	quality: number,
	lossless: boolean,
	onProgress?: (progress: number) => void
): Promise<{ result: ArrayBuffer; mimeType: string; width: number; height: number }> {
	return new Promise((resolve, reject) => {
		const job: CompressionJob = {
			id,
			imageBuffer,
			inputFormat,
			outputFormat,
			quality,
			lossless,
			onProgress,
			onComplete: (result, mimeType, width, height) => resolve({ result, mimeType, width, height }),
			onError: (error) => reject(new Error(error))
		};

		queueJob(job);
	});
}

// Terminate all workers in the pool
export function terminatePool(): void {
	workers.forEach(({ worker }) => {
		worker.terminate();
	});
	workers = [];
	jobQueue = [];
	jobCallbacks.clear();
	poolInitialized = false;
	console.log('Worker pool terminated');
}

// Get pool status
export function getPoolStatus(): {
	initialized: boolean;
	workerCount: number;
	busyWorkers: number;
	queuedJobs: number;
} {
	return {
		initialized: poolInitialized,
		workerCount: workers.length,
		busyWorkers: workers.filter(w => w.busy).length,
		queuedJobs: jobQueue.length
	};
}
