var fs = require("fs"),
	http = require("http"),
	util = require("util"),
	id3v2 = require("./id3v2"),
	mp3repair = require("./mp3repair"),
	lastfm = require("./lastfm"),
	db = require("./db")



exports.cut = function(r)
{
	var default_cover = fs.readFileSync(r.cover || "d:/music/m2/covers/main.jpg");
	var max_size = 9.5*1000*1000;

	var tracks = [];
	var n = 0;
	db.getLastTrack(r.id, 1, function(row){
		n = row.n || 0;
		db.getTracks(r.id, function(rows){
			tracks = rows;
			//console.log(tracks);
			console.log("Cut Tracks", r.id, new Date);
			for (var i=0; i<tracks.length-1; i++)
				readFile(i);
		});
	});

	function readFile(i)
	{
		var title = tracks[i].title;
		var pos = tracks[i].pos;
		var size = tracks[i].size;
		var endpos = pos + size;

		if (title.match(/(ADWTAG|premium|Digitally Imported|these messages)/i) || size < 1000*1000){
			console.log("# out", title);
			db.updateTrack({id: tracks[i].id, state: -1});
			return;
		}


		var nn = n;
		n += Math.ceil(size / max_size);

		title = title.replace(/[\<\[\{]/g, "(");
		title = title.replace(/[\>\]\}]/g, ")");
		title = title.replace(/(^\W+|\W+$)/g, ""); // trim
		var m = title.match(/^.*? - (.*?) - (.*?)$/) || title.match(/^(.*?) - (.*?)$/) || title.match(/^(.*?)-(.*?)$/) ||  ["", "", title];
		var artist = m[1];
		title = m[2];

		console.log("get cover", artist, title);
		lastfm.getCover(artist, title, function(cover, info){
			if (!cover || cover.length < 5000)
				cover = default_cover;

			var d = new Date();
			var date = ("0"+d.getDate()).slice(-2) +"."+("0"+(d.getMonth()+1)).slice(-2) + "." + d.getFullYear();
			var disc_n = ("0"+(d.getMonth()+1)).slice(-2)+("0"+d.getDate()).slice(-2);
			// cut for parts max_size
			var k =0;
			do {
				nn++;
				k++;
				var filename = (artist ? artist + " - " : "") + title;
				filename = filename.replace(/[\/\\:*?"<>|\?]+g/, " ");
				filename = filename.replace(/"/g, "'");
				filename = filename.replace(/[\/\\]/g, " & ");
				filename = filename.replace(/(^\W+|\W+$)/g, "");
				filename = r.dir + ("00"+nn).slice(-3) + ". " + filename + ".mp3";
				tracks[i].n = nn;

				size = Math.min(max_size, endpos - pos);
				console.log(filename, pos, size);
				if (k == 1)
					db.updateTrack({id: tracks[i].id, filename: filename, genre: info.genre, n: nn, state: 1});
				else {
					var new_track = {
						n: nn,
						pos: pos,
						size: size,
						filename: filename,
						state: 1,
						station_id: tracks[i].station_id,
						title: tracks[i].title,
						genre: info.genre,
						date: tracks[i].date,
						time: tracks[i].time,
						onlyfile: 1
					};
					db.insertTrack(new_track);
					console.log("insert", new_track);
				}

				var data = new Buffer(size);
				fs.readSync(r.fd, data, 0, size, pos);
				fs.writeFile(filename, Buffer.concat([id3v2.generate({
					title: title,
					artist: artist,
					artist2: date,
					album: r.title,
					genre: info.genre || r.genre,
					comment: "http://tunemix.net",
					track: nn+"",
					disk: disc_n,
					cover: cover
				}), mp3repair.repair(data.slice(50000, data.length - 50000))]));

				pos += max_size;
			}
			while (pos < endpos);
		});
	}
}