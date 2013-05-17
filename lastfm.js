//API Key: a575927e95a791f51f7a2ccf1bebd6d2
//Secret: is 99b45abe8c7ba9759740e118013d090a
var http = require('http');
var crypto = require('crypto');
var querystring = require('querystring');

exports.getCover = function(artist, title, callback){
	artist = (" "+artist+" ").replace(/\W(ft\W|feat\W|and\W|vs\W|with\W|\/|&|,).*?$/i, "").replace(/[^\w]+/, " ").replace(/ \w /g, "");
	title = (" "+title+" ").replace(/\W(ft\W|feat\W|\().*?$/i, "").replace(/ \w /g, "");
	console.log("search", artist, title);

	var data = {trackCover: "", artistCover: "", albumCovers: [], genre: "", artist: artist, title: title}
	var inprocess = 0;

	if (!artist)
		return callback(false, {});

	api({method: "artist.search", artist: artist}, ["results", "artistmatches", "artist"], function(r){
		r = r[0] || r;
		artist = r.name;
		if (!artist)
			return callback(false, {});

		if (r.image)
			data.artistCover = r.image.pop()["#text"];

		var parallel = 0;
		function _callback(){
			if (--parallel) return;

			var cover_url = "";
			if (data.trackCover)
				cover_url = data.trackCover;
			else if (data.albumCovers.length)
				cover_url = data.albumCovers[0];
			else if (data.artistCover)
				cover_url = data.artistCover;

			if (cover_url)
				downloadCover(cover_url, function(cover){
					callback(cover, data);
				});
			else
				callback(false, data);
		}

		parallel++;
		api({method: "track.search", track: artist+" - "+title}, ["results", "trackmatches", "track", "image", "#text"], function(r){
			data.trackCover = r;
			_callback();
		});

		parallel++;
		api({method: "artist.getTopTags", artist: artist}, ["toptags", "tag", "name"], function(r){
			data.genre = r;
			_callback();
		});

		parallel++;
		api({method: "artist.topAlbums", artist: artist}, ["results", "topalbums", "album"], function(r){
			r = r[0] ? r : [r];
			for (var i=0; i<r.length; i++)
				if (r[i]){
					var img = r[i].image.pop()["#text"];
					if (img.match(/last.fm/) && !img.match(/default_album/))
						data.albumCovers.push(img);
				}
			data.albumCovers.sort(function(){ return Math.random()-0.5 }); // random
			_callback();
		});

	});




	function downloadCover(cover_url, callback){
		cover_url = cover_url.replace(/\/serve\/.*?\//, "/serve/500/");
		http.get(cover_url, function(res){
			res.data = [];
			res.on("data", function(chunk){
				res.data.push(chunk);
			})
			res.on("end", function(){
				var cover = Buffer.concat(res.data);
				if (cover.length < 5000)
					cover = false;
				callback(cover);
			})
		});
	}


	function api(data, deepKeys, callback){
		var api_key = "a575927e95a791f51f7a2ccf1bebd6d2";
		var secret = "99b45abe8c7ba9759740e118013d090a";
		data.api_key = api_key;

		var d = [];
		var sign = "";
		var url = "http://ws.audioscrobbler.com/2.0/?format=json&"+querystring.stringify(data);
		for (var i in data)
			d.push([i, data[i]]);
		d.sort(function(a,b){ return a[0]>b[0] });
		for (var i=0; i<d.length; i++)
			sign += d[i][0]+d[i][1];
		sign += secret;
		sign = crypto.createHash('md5').update(sign).digest("hex");

		http.get(url, function(res){
			res.data = "";
			res.on("data", function(data){ res.data += data });
			res.on("end", function(){
				var data = {};
				try{data = JSON.parse(res.data)} catch(e){console.error(e)}
				for (var i=0; i<deepKeys.length; i++){
					if (data[0] && data[0][deepKeys[i]])
						data = data[0][deepKeys[i]];
					else if (data[deepKeys[i]])
						data = data[deepKeys[i]];
					else data = false;
				}
				callback(data);
			});
		});
	}

}