import type { OptionsEnable, ProcessVideoOptions as LocalProcessVideoOptions } from './types';
import type { ProcessVideoOptions } from '@hk/photographer-toolbox/types';

export function verifyFormOptions(
	options: LocalProcessVideoOptions,
	enabled: OptionsEnable
): ProcessVideoOptions | null {
	const options2: ProcessVideoOptions = {};
	if (enabled.resizePercentage) {
		options2.resizePercentage = options.resizePercentage;
	}
	if (enabled.size) {
		options2.size = options.size;
	}
	if (enabled.aspectRatio) {
		options2.aspectRatio = options.aspectRatio;
	}
	if (enabled.videoCodec) {
		options2.videoCodec = options.videoCodec;
	}
	if (enabled.audioCodec) {
		options2.audioCodec = options.audioCodec;
	}
	if (enabled.format) {
		options2.format = options.format;
	}
	if (enabled.outputOptions) {
		options2.outputOptions = options.outputOptions;
	}
	if (enabled.audioFilters) {
		options2.audioFilters = options.audioFilters;
	}
	if (enabled.noAudio) {
		options2.noAudio = options.noAudio;
	}
	if (enabled.takeFrames) {
		options2.takeFrames = options.takeFrames;
	}
	if (enabled.noVideo) {
		options2.noVideo = options.noVideo;
	}
	if (enabled.autopadPad) {
		options2.autopad = { pad: options.enableAutopad };
		if (enabled.autopadColor) {
			options2.autopad.color = options.autopadColor;
		}
	}
	if (enabled.audioQuality) {
		options2.audioQuality = options.audioQuality;
	}
	if (enabled.fps) {
		options2.fps = options.fps;
	}
	if (enabled.preset) {
		options2.preset = options.preset;
	}
	if (enabled.startTime) {
		options2.startTime = options.startTime;
	}
	if (enabled.duration) {
		options2.duration = options.duration;
	}
	if (enabled.audioBitrate) {
		options2.audioBitrate = options.audioBitrate;
	}
	if (enabled.videoBitrate) {
		options2.videoBitrate = options.videoBitrate;
	}
	if (enabled.audioChannels) {
		options2.audioChannels = options.audioChannels;
	}
	if (enabled.ffmpegPath) {
		options2.ffmpegPath = options.ffmpegPath;
	}
	return options2;
	return null;
}
