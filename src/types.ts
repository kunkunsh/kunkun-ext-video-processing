import type {
	DefaultVideoMetadata,
	ProcessVideoOptions,
	Progress
} from '@hk/photographer-toolbox/types';

export type API = {
	// setFfprobePath: (path: string) => void;
	// setFfmpegPath: (path: string) => void;
	readDefaultVideoMetadata: (path: string) => Promise<DefaultVideoMetadata | null>;
	getAvailableCodecsNamesByType: (
		type: 'video' | 'audio' | 'subtitle' | string,
		source?: string
	) => Promise<string[]>;
	convertVideo: (
		inputPath: string,
		outputPath: string,
		options: ProcessVideoOptions,
		startCallback?: () => void,
		progressCallback?: (progress: Progress) => void,
		endCallback?: () => void
	) => Promise<void>;
	convertToGif: (
		inputPath: string,
		outputPath: string,
		options: {
			scale?: number;
			fps?: number;
			duration?: number;
			startTime?: number;
		},
		startCallback?: () => void,
		progressCallback?: (progress: Progress) => void,
		endCallback?: () => void
	) => Promise<void>;
};
