import * as v from 'valibot';

export const ProcessVideoOptionsSchema = v.object({
	inputPath: v.string(),
	outputPath: v.string(),
	resizePercentage: v.optional(v.number()),
	size: v.optional(v.string()),
	aspectRatio: v.optional(v.string()),
	videoCodec: v.optional(v.string()),
	audioCodec: v.optional(v.string()),
	format: v.optional(v.string()),
	outputOptions: v.optional(v.array(v.string())),
	audioFilters: v.optional(v.array(v.string())),
	noAudio: v.optional(v.boolean(), false),
	takeFrames: v.optional(v.number()),
	noVideo: v.optional(v.boolean(), false),
	enableAutopad: v.optional(v.boolean(), false),
	autopadColor: v.optional(v.string()),
	// autopad: v.optional(
	// 	v.object({
	// 		pad: v.optional(v.boolean()),
	// 		color: v.optional(v.string())
	// 	}),
	// 	{ pad: false, color: '' }
	// ),
	audioQuality: v.optional(v.number()),
	fps: v.optional(v.number()),
	preset: v.optional(
		v.union([
			v.literal('ultrafast'),
			v.literal('superfast'),
			v.literal('veryfast'),
			v.literal('faster'),
			v.literal('fast'),
			v.literal('medium'),
			v.literal('slow'),
			v.literal('slower'),
			v.literal('veryslow')
		]),
		'medium'
	),
	startTime: v.optional(v.union([v.string(), v.number()])),
	duration: v.optional(v.union([v.string(), v.number()])),
	audioBitrate: v.optional(v.number()),
	videoBitrate: v.optional(v.number()),
	audioChannels: v.optional(v.number()),
	ffprobePath: v.optional(v.string()),
	ffmpegPath: v.optional(v.string())
});
export type ProcessVideoOptions = v.InferOutput<typeof ProcessVideoOptionsSchema>;

export const OptionsEnableSchema = v.object({
	resizePercentage: v.boolean(),
	size: v.boolean(),
	aspectRatio: v.boolean(),
	videoCodec: v.boolean(),
	audioCodec: v.boolean(),
	format: v.boolean(),
	outputOptions: v.boolean(),
	audioFilters: v.boolean(),
	noAudio: v.boolean(),
	takeFrames: v.boolean(),
	noVideo: v.boolean(),
	autopadPad: v.boolean(),
	autopadColor: v.boolean(),
	audioQuality: v.boolean(),
	fps: v.boolean(),
	preset: v.boolean(),
	startTime: v.boolean(),
	duration: v.boolean(),
	audioBitrate: v.boolean(),
	videoBitrate: v.boolean(),
	audioChannels: v.boolean(),
	ffmpegPath: v.boolean()
});
export type OptionsEnable = v.InferOutput<typeof OptionsEnableSchema>;
