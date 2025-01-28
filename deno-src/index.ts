// @ts-types="npm:@types/fluent-ffmpeg@2.1.27"
import ffmpeg from 'fluent-ffmpeg';
import type { API } from '../src/types.ts';
import type { ProcessVideoOptions, Progress } from '@hk/photographer-toolbox/types';
// ffmpeg.setFfprobePath('/opt/homebrew/bin/ffprobe');

import { video } from '@hk/photographer-toolbox';
import { expose } from '@kunkun/api/runtime/deno';

expose({
	getAvailableCodecsNamesByType: video.getAvailableCodecsNamesByType,
	convertVideo: (
		inputPath: string,
		outputPath: string,
		options: ProcessVideoOptions,
		startCallback?: () => void,
		progressCallback?: (progress: Progress) => void,
		endCallback?: () => void
	) => {
		return Promise.resolve(
			video.convertVideo(
				inputPath,
				outputPath,
				options,
				startCallback,
				progressCallback,
				endCallback
			)
		);
	},
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
	) => {
		console.error(inputPath, outputPath, options);
		const outputOptions = [
			`-vf scale=${options.scale ?? 480}:-1:flags=lanczos,fps=${options.fps ?? 10}`,
			'-f gif'
		];
		console.error('outputOptions', outputOptions);
		video.convertVideo(
			inputPath,
			outputPath,
			{
				outputOptions,
				duration: options.duration,
				startTime: options.startTime
			},
			startCallback,
			progressCallback,
			endCallback
		);
		return Promise.resolve();
	}
} satisfies API);
