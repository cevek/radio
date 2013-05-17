var mp3 = require("./mp3repair.js");
var fs = require("fs");
var data = fs.readFileSync("D:/music/m2/2013.01.12/Deep Mix/008. Melomano, Galo - Pie De Limon.mp3");
//var data = fs.readFileSync("D:/music/m2/2013.02.09/ChartHits/001. Flo Rida - Louder.mp3");
//var data = fs.readFileSync("D:/123.mp3");
//var data = fs.readFileSync("2.mp3");
var frames = mp3.getFrames(data);
//console.error(frames);


var sf = 10; // start frame
var size = 0;
var pos = 0;
//var bf = new Buffer(10000000);
var fd = fs.openSync("aaa.mp3", "w+");
for (var i=10; i<2000; i++){
	//console.log(i);
	//if (i % 5 == 0) continue;
	//if (frames[i] && frames[i].mdBegin == 0){
	var frame = frames[i];
	if (i < 2000){
		//console.log(mdSize);

		var bf = new Buffer(1000);
		bf.fill(0);
		if (frame.mdBegin > 0){



			frame.length2 = frames[i+1].start - frame.start;

			console.log("info", frame);
			if (frame.length2 != frame.length)
				console.log("===========================");

			bf.append(data, frames[i-2].start+36, frames[i-2].end);
			bf.append(data, frames[i-1].start+36, frames[i-1].end);
			bf.append(data, frames[i-0].start+36, frames[i-0].end);

			var bf_start = frames[i-2].length-36 + frames[i-1].length-36 - frame.mdBegin;

			var size320bps = 1044;

/*
			var frameData = new Buffer(size320bps);
			frameData.fill(0);

			data.setBits(frame.start, 16, 4, 14); // set 320kbps
			data.setBits(frame.start, 32, 9, 0); // set main_data_begin 0
			data.setBits(frame.start, 22, 1, 0); // set padding 0
			data.copy(frameData, 0, frame.start, frame.start + 36);
*/


			var frameData = new Buffer(size320bps);
			frameData.fill(0);
			//data.setBits(frame.start, 32, 9, 0); // set main_data_begin 0
			frameData.append(data, frame.start, frame.start+36);
			frameData.append(bf, bf_start, bf.length);

			frameData.setBits(0, 32, 9, 0); // set main_data_begin 0
			frameData.setBits(0, 16, 4, 14); // set 320kbps
			frameData.setBits(0, 22, 1, 0); // set padding 0

			//data.copy(frameData, 0, frame.start, frame.end);
			//bf.copy(frameData, 36, bf_start, bf_start + size320bps - 40);
			//fs.writeSync(fd, frameData, 0, frameData.length);
			//var bla = new Buffer(frame.length);
			//data.copy(bla, 0, frame.start, frame.end);


			fs.writeSync(fd, frameData, 0, frameData.length);
		}



		//console.log(newSize);
/*
		try{
			data.setBits(frames[i].start, 16, 4, 14); // set 320kbps
			data.setBits(frames[i].start, 32, 9, 0); // set main_data_begin
 			var newSize = mp3.framelength(data, frames[i].start);


			data.setBits(frames[i].start, 32, 9, 100); // set main_data_begin
			data.copy(bf, size, frames[i].start, frames[i].start + 36);
			data.copy(bf, size - 100, frames[i].start+36, frames[i].start+136);
			data.copy(bf, size + 36, frames[i].start + 136, frames[i].end);
		} catch (e){console.log(e)}
*/

		//console.log(frames[i].start);
		/*try{
		 	//data.setBits(frames[i].start, 16, 4, 13);// set 320kbps
			//data.setBits(frames[i].start, 32, 9, 0);// set main_data_begin
			data.setBits(frames[i].start, 20, 2, 2); // set freq 32000
			var newSize = 576 + data.getBits(frames[i].start, 22, 1); // + pad
			//var newSize = mp3.framelength(data, frames[i].start);

			data.copy(bf, size, frames[i].start, frames[i].end);

			//data.copy(bf, size, frames[i].start, frames[i].start + 36);
			//data.copy(bf, size + 36, frames[i].start - frames[i].mdBegin, frames[i].start);
			//data.copy(bf, size + 36 + frames[i].mdBegin, frames[i].start + 36, frames[i].end);
			//frames[i].data.copy(bf, size+36, 0, frames[i].data.length);
			size += newSize;
		} catch (e){console.log(e)}

*/

	}

}

//console.log(size);
//fs.writeFileSync("1.mp3", bf.slice(0, size));
//console.log(size);


/*
 var lame = require('lame');

var decoder = new lame.Decoder();
decoder.on('format', function(format){
	console.error('MP3 format: %j', format);

	// write the decoded MP3 data into a WAV file
	var writer = new wav.Writer(format);
	decoder.pipe(writer).pipe(output);

});
 */

/*
// create the Encoder instance
var encoder = new lame.Encoder({
	channels: 2,        // 2 channels (left and right)
	//bitDepth: 16,       // 16-bit samples
	sampleRate: 44100   // 44,100 Hz sample rate
});

var rs = fs.createReadStream("1.mp3");
var ws = fs.createWriteStream("1.mp3");

 // raw PCM data from stdin gets piped into the encoder
 process.stdin.pipe(encoder);

 // the generated MP3 file gets piped to stdout
 encoder.pipe(process.stdout);

encoder.
*/


