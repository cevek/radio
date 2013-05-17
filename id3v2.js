Buffer.prototype._write = function(type, data, encoding){
	if (!this.pos)
		this.pos = 0;
	switch(type){
		case "array":
			for (var i=0; i<data.length; i++){
				this[this.pos] = data[i];
				this.pos++;
			}
		 	break;

		 case "int":
			this.writeUInt32BE(data, this.pos);
			this.pos += 4;
		 	break;

		case "string":
			if (data.length){
				var size = Buffer.byteLength(data, encoding);
				this.write(data, this.pos, size, encoding);
				this.pos += size;
			}
		 	break;

		 case "buffer":
		 	data.copy(this, this.pos, 0, data.length);
		 	this.pos += data.length;
		 	break;
	}
}

exports.generate = function(attr)
{
	var id3v2 = new Buffer(1000000);
	id3v2._write("string", "ID3");
	id3v2._write("array", [0x3,0,0,   0,0,0,0]);

	var tags = {
		"COMM": attr.comment,
		"TALB": attr.album,
		"TCON": attr.genre,
		"TIT2": attr.title,
		"TPE1": attr.artist,
		"TPE2": attr.artist2,
		"TRCK": attr.track,
		"TPOS": attr.disk,
		"TCMP": attr.compilation?"1":"0"
		//"TYER": attr.year
	}

	for (var name in tags){
		if (!tags[name])
			continue;
		id3v2._write("string", name);
		var length = (name=="COMM" ? 10 : 3);
		if (tags[name].length)
			length += Buffer.byteLength(tags[name], "ucs2");
		id3v2._write("int", length);
		if (name=="COMM")
			id3v2._write("array", [0,0,1,101,110,103,255,254,0,0,255,254]);
		else
			id3v2._write("array", [0,0,1,255,254]);

		id3v2._write("string", tags[name], "ucs2");
	}

	// write cover art
	//var cover = fs.readFileSync("12.jpg");
	var cover = attr.cover;
	var mime = "image/jpeg";
	if (cover.toString("utf8", 1, 4) == "PNG"){
		mime = "image/png";
	}
	id3v2._write("string", "APIC");
	id3v2._write("int", cover.length+3+mime.length);
	id3v2._write("array", [0,0,0]);
	id3v2._write("string", mime);
	id3v2._write("array", [0,3,0]);
	id3v2._write("buffer", cover);

	// write id3 size
	var size = id3v2.pos - 9;
	size = (size>>21&127)<<24 | (size>>14&127)<<16 | (size>>7&127)<<8 | (size&127); // 1014 -> 1910
	id3v2.writeUInt32BE(size, 6);

	return id3v2.slice(0, id3v2.pos);
}
