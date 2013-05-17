
//setInterval(function(){}, 5000);

/*
var buf = new Buffer(5);
buf[0] = 0xFF;
buf[1] = 0xFF;
buf[2] = 0xFF;
buf[3] = 0xFF;
buf[4] = 0xFF;

Buffer.prototype.getBits = function(){
	return this;
}

//setBit(buf, 0, 5, 3, 1);

//console.log(getBit(buf, 1, 0, 2));

console.log(buf.getBits());

process.abort();
*/

Buffer.prototype.getBits = function(offset, bitpos, bitlength){
	offset += bitpos/8|0;
	bitpos %= 8;
	return this.readUInt16BE(offset) >> (16-bitpos-bitlength) & (Math.pow(2, bitlength)-1);
}

Buffer.prototype.setBits = function(offset, bitpos, bitlength, bitvalue){
	offset += bitpos/8|0;
	bitpos %= 8;
	var shift = 16-bitpos-bitlength;
	var num = (this.readUInt16BE(offset) & ~((Math.pow(2,bitlength)-1) << shift)) | (bitvalue << shift);
	this.writeUInt16BE(num, offset);
}

Buffer.prototype.append = function(buf, start, end){
	this.appendpos = this.appendpos || 0;
	buf.copy(this, this.appendpos, start, end);
	this.appendpos += end-start;
}


// check frame header
function isframe(data, i){
	//http://habrahabr.ru/post/103635/
	//console.log(data[i+2].toString(16), data[i+3].toString(16), data[i+2].toString(16).match(/^([1-9ABCDE])[0-3]$/i), data[i+3].toString(16).match(/^[0-7][04]$/));
	if (data[i+0]==0xFF && 
		data[i+1]==0xFB &&
		data[i+2].toString(16).match(/^([1-9ABCDE])[0-3]$/i) &&
		data[i+3].toString(16).match(/^[0-7][04]$/)){
		//console.log(i);
		return true;
	}

	return false;
}

exports.framelength = function(data, i){
	var bitrate = [1,32,40,48,56,64,80,96,112,128,160,192,224,256,320,1][data.getBits(i,16,4)];
	var freq = [44100,48000,32000,1][data.getBits(i,20,2)];
	var pad = data.getBits(i,22,1);
	return Math.floor(144 * bitrate * 1000 / freq + pad);
}

exports.mainDataSize = function(data, i){
	return data.getBits(i, 52, 12) + data.getBits(i, 52+59, 12) + data.getBits(i, 52+59+59, 12) + data.getBits(i, 52+59+59+59, 12);
}

exports.setgain = function(data, i, val){
	var p = 52;
	for (var gr=0; gr<2; gr++){
		for (var ch=0; ch<2; ch++){
			p += 21;
			var gain = data.getBits(i, p, 8);
			gain = (val ? Math.min(Math.max(0,gain+val),255) : 0)
			data.setBits(i, p, 8, gain);
			p += 38;
		}
	}
}

exports.getFrames = function(data){
	var frames = [];
	var newpos = 0; // cursor position new file
	// read frames and write its pos and length
	var hasprevframe = false; // we have previuos correct frame
	var tmpBuff = new Buffer(20000);
	for (var i=0; i<data.length; i++){
		if (isframe(data, i)){
			//console.log(i);

			if (hasprevframe){
				var start = i-length;
				var end = i;
				var mdBegin = data.getBits(start, 32, 9);





				/*
				var mdMaxSize = length - 36; // 36 = header + side
				var mdSizeBits = exports.mainDataSize(data, i-length);
				var mdSize = Math.ceil(mdSizeBits / 8);
				var mdBegin = data.getBits(i, 32, 9);



				var j = frames.length-1;
				if (frames.length > 3){

					//mdSize = 1000;
					//mdSize = (frames[j].mdBegin + frames[j].mdMaxSize) - mdBegin;
					//frames[j].mdSize = mdSize;
					var frameData = new Buffer(mdSize);

					//console.log(mdSize, mdSize2);

					data.copy(tmpBuff, 10000, start+36, end);
					data.copy(tmpBuff, 10000 - frames[j].mdMaxSize, frames[j].start+36, frames[j].end);
					data.copy(tmpBuff, 10000 - frames[j].mdMaxSize - frames[j-1].mdMaxSize, frames[j-1].start+36, frames[j-1].end);
					//console.log(tmpBuff.toString("hex", 1000-mdBegin, 1000-mdBegin + mdSize));
					//console.log(1000 - frames[j].mdMaxSize, 1000 - frames[j].mdMaxSize - frames[j-1].mdMaxSize);
					//console.log(-mdBegin, -mdBegin + mdSize, mdSize);
					//console.log(1000-mdBegin, 1000-mdBegin + mdSize);

					var sp = 10000-mdBegin;
					var ep = sp + mdSize;
					tmpBuff.copy(frameData, 0, sp, ep);
					//frames[j].data = frameData;

					/*
					var pp = 0;
					var j = frames.length-1;
					do {
						pp += frames[j].mdMaxSize;
						//console.log("writedata", j, pp);
						data.copy(tmpBuff, 10000 - pp, frames[j].start+36, frames[j].end);
					}
					while(pp < mdBegin);
					//console.log(mdSize);
					tmpBuff.copy(frameData, 0, 10000-mdBegin, 10000-mdBegin + mdSize);
					*/
				//}




				frames.push({
					start: start,
					end: end,
					length: length,
					//data: frameData,
					mdBegin: mdBegin,
					//mdSize: mdSize,
					//mdSize2: (j>3 ? (frames[j].mdBegin + frames[j].mdMaxSize) - mdBegin : 0),
					//mdMaxSize: mdMaxSize
				});








			}

			else // detect broken frames
			if (frames.length)
				frames[frames.length-1].nextbreak = true;

			var length = exports.framelength(data, i);
			i += length-1;
			hasprevframe = true;
		}
		else if(hasprevframe)
			hasprevframe = false;
	}
	return frames;
}


// fadein/fadeout, remove incorrect frames
exports.repair = function(data)
{
	var frames = exports.getFrames(data);
	// remake mp3 file
	//var fd = fs.openSync(file, "w");
	var new_data = new Buffer(data.length);
	new_data.pos = 0;
	for (var i=0; i<frames.length; i++){

		// fadein
		if (i <= 20){
			var x = (i - 20)/5;
			var gain = Math.round(-1*x*x) - 1;

			exports.setgain(data, frames[i].start, (i==0 ? 0 : gain));
			//console.log(gain);
		}

		// fadeout
		if (i+20 >= frames.length){
			var x = (i-frames.length+20)/5;
			var gain = Math.round(-1*x*x) - 1;
			exports.setgain(data, frames[i].start, (i==frames.length-1 ? 0: gain));
			//console.log(gain);
		}

		// mute 2 frames after broken ones
		if (frames[i].nextbreak){
			exports.setgain(data, frames[i+1].start, 0);
			exports.setgain(data, frames[i+2].start, 0);
			//console.log("break", i, Math.round(frames[i+1].start / 96000 * 8));
		}
		data.copy(new_data, new_data.pos, frames[i].start, frames[i].start+frames[i].length);
		new_data.pos += frames[i].length;
		//fs.writeSync(fd, data, frames[i].start, frames[i].length);
	}
	return new_data.slice(0, new_data.pos);
}
