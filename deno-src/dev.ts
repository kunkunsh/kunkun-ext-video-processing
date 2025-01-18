import { video } from '@hk/photographer-toolbox';

// @ts-types="npm:@types/fluent-ffmpeg@2.1.27"
import ffmpeg from 'fluent-ffmpeg';

// video
// 	.readMainVideoMetadata('/Users/hacker/Dev/workspace/DJI_20240319171825_0014_D.MP4')
// 	.then(console.log);

// video
// 	.readVideoMetadata('/Users/hacker/Dev/workspace/DJI_20240319171825_0014_D.MP4')
// 	.then((data) => {
// 		console.log(data);

// 		// Deno.writeFileSync(
// 		// 	'./video-metadata.json',
// 		// 	new TextEncoder().encode(JSON.stringify(data, null, 2))
// 		// );
// 	});
// video.convertVideo(
// 	'/Users/hacker/Library/Mobile Documents/iCloud~me~damir~dropover-mac/Documents/Uploads/2022-07-01_08.08.02/crosscopy-cli-demo-sync.mp4',
// 	'/Users/hacker/Desktop/crosscopy-cli-demo-sync.mp4',
// 	{
// 		aspectRatio: '1:1',
// 		videoCodec: 'h264_videotoolbox',
// 		videoBitrate: 1000
// 	},
// 	() => {},
// 	(progress) => {
// 		console.log(progress.percent);
// 	}
// );

ffmpeg('/Users/hacker/Desktop/crosscopy-cli-demo-sync.mp4')
	.withAspectRatio('1:1')
	.save('/Users/hacker/Desktop/output.mp4')
	.on('progress', function (progress) {
		console.log('Processing: ' + progress.percent + '% done');
	});
