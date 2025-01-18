// @ts-types="npm:@types/fluent-ffmpeg@2.1.27"
import ffmpeg from 'fluent-ffmpeg';
import type { API } from '../src/types.ts';
import type { ProcessVideoOptions, Progress } from '@hk/photographer-toolbox/types';
import { convertVideo } from 'https://jsr.io/@hk/photographer-toolbox/0.1.8/src/video/convert.ts';
// ffmpeg.setFfprobePath('/opt/homebrew/bin/ffprobe');

import { video } from '@hk/photographer-toolbox';
import { expose } from '@kunkun/api/runtime/deno';

expose({
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
});



