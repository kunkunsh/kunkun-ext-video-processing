# Kunkun Custom UI Extension Template (SvelteKit)

```ts
export type ProcessVideoOptions = {
	resizePercentage?: number;
	size?: string;
	aspectRatio?: string;
	videoCodec?: string;
	audioCodec?: string;
	format?: string;
	outputOptions?: string[];
	audioFilters?: string[];
	noAudio?: boolean;
	takeFrames?: number;
	noVideo?: boolean;
	autopad?: {
		pad?: boolean;
		color?: string;
	};
	audioQuality?: number;
	fps?: number;
	preset?:
		| 'ultrafast'
		| 'superfast'
		| 'veryfast'
		| 'faster'
		| 'fast'
		| 'medium'
		| 'slow'
		| 'slower'
		| 'veryslow';
	startTime?: string | number;
	duration?: string | number;
	audioBitrate?: number;
	videoBitrate?: number;
	audioChannels?: number;
	ffprobePath?: string;
	ffmpegPath?: string;
};
```
