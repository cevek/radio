//Error.stackTraceLimit = 5;
require("helper");
var net = require("net");
var fs = require('fs');
var util = require('util');
var iconv = require('iconv-lite');
var db = require("./db.js");
var preparemp3 = require("./preparemp3.js");

var folder = "d://m2/";
var buffer_size = 1000*1000;
var max_filesize = 9*1024*1024;
var dir = "d:/music/m2/";
//process.exit();



console.red("NodeJS start")
var st = {};
loadStations();
setInterval(loadStations, 60*1000); // reload every minute

process.on('uncaughtException', function(err) {
	console.error(err);
});
var prevRestartTime = new Date();
function loadStations(){
	db.stationList(function(_st){
		console.log("Reload stations", new Date);

		// restart on the new day
		if (new Date().getHours() < prevRestartTime.getHours()){
			prevRestartTime = new Date();
			for (var id in st)
				stop(id);
		}

		// connect station
		for (var id in _st)
			if (!st[id]){
				st[id] = _st[id];
				connect(id);
			}

		// stop station
		for (var id in st)
			if (!_st[id])
				stop(id);

		for (var id in st)
			preparemp3.cut(st[id]);
	});
}

function stop(id)
{
	st[id].socket.destroy();
	delete st[id];
}

function reconnect(id)
{
	st[id].socket.destroy();
	console.red("reconnect: "+id);
	connect(id);
}

function connect(id)
{
	var r = st[id];

	var d = new Date();
	r.startTime = d;
	var dateDir = dir + d.getFullYear()+"."+("0"+(d.getMonth()+1)).slice(-2)+"."+("0"+d.getDate()).slice(-2)+"/";
	if (!fs.existsSync(dateDir))
		fs.mkdirSync(dateDir, 0777);
	r.dir = dateDir + st[id].title + "/";
	if (!fs.existsSync(r.dir))
		fs.mkdirSync(r.dir, 0777);

	r.fd = fs.openSync(r.dir+"../"+st[id].title+".mp3", "a+");
	//r.fd.on("error", function(e){ error("fs "+id+": "+e) });
	r.filepos = fs.fstatSync(r.fd).size;
	console.log("filepos", id, r.filepos);
	r.buffer = new Buffer(buffer_size);
	r.buffer.pos = 0;
	r.hasheaders = false;
	r.metaint = 0;
	r.offset = 0;

	var url_info = require("url").parse(r.url);
	if (url_info.hostname){
		var host = url_info.hostname;
		var port = (url_info.port ? url_info.port : 80);
		var path = (url_info.path ? url_info.path : "/");

		console.log(host, port, path);
		//r.socket.on("close", function() { error("socket closed "+id); reconnect(id) })
		r.socket = net.connect({host: host, port: port}, function(){
			console.log("connected", id);
			r.socket.write("GET "+path+" HTTP/1.1\r\nicy-metadata: 1\r\n\r\n");
			r.socket.on("data", function(data){
				receive(id, data);
			});
			r.socket.setTimeout(5000, function(e){
				console.error("socket timeout: "+id);
				reconnect(id);
			});
		});
		r.socket.on("error", function(e){ console.error("socket "+id+": "+e); connect(id) })
		r.socket.on("end",   function() { console.error("socket end "+id); reconnect(id) })
	}
}

function receive(id, data)
{
	var r = st[id];

	// flush buffer to the file
	if (r.buffer.pos + data.length >= buffer_size){
		console.error("write", id, r.fd, r.offset);
		fs.writeSync(r.fd, r.buffer, 0, r.offset, null);
		r.buffer.copy(r.buffer, 0, r.offset);
		r.buffer.pos -= r.offset;
		r.offset = 0;
	}

	data.copy(r.buffer, r.buffer.pos);
	r.buffer.pos += data.length;
	//console.error("w", r.buffer.pos);


	// если заголовки еще не пришли
	if (!r.hasheaders){
		var s = r.buffer.toString("ascii");
		var pos = s.indexOf("\r\n\r\n")+4;
		if (pos > 3){
			console.log("geting headers:", id);
			r.metaint = s.substr(0, pos).match(/icy-metaint: ?(\d+)/i);
			r.metaint = (r.metaint ? r.metaint[1]*1 : 0);
			console.log("metaint", id, r.metaint);
			r.buffer.copy(r.buffer, 0, pos);
			r.buffer.pos -= pos;
			r.hasheaders = true;
			console.log("pos", id, r.buffer.pos);
		}
	}
	else {

		// analise metaint
		while (r.metaint > 0 && r.offset+r.metaint+300 < r.buffer.pos){
			r.offset += r.metaint;
			r.filepos += r.metaint;

			var meta_length = r.buffer[r.offset]*16;
			//console.log("offset: ", r.offset, meta_length, r.buffer.pos);
			if (meta_length > 300){
				//error("break: "+id+" metalength: "+ meta_length);
				console.red("break: ",id, meta_length);
				//reconnect(id);
				//break;
			}

			var meta_data = new Buffer(1000);
			if (meta_length) {
				r.buffer.copy(meta_data, 0, r.offset+1, r.offset+1+meta_length);
				meta_data = (iconv.decode(meta_data, r.encoding).match(/StreamTitle='(.*?)\s*?';/) || ["", ""])[1];
				if (meta_data){
					db.getLastTrack(id, null, function(row){
						if (row.title != meta_data){
							if (row.id)
								db.updateTrack({id: row.id, size: r.filepos - row.pos});
							db.insertTrack({station_id: id, date: r.startTime, time: new Date, title: meta_data, pos: r.filepos});
						}
					});
				}

				//console.log("file pos:", id, r.filepos);
				console.log("Metadata:", id, meta_data);
			}

			r.buffer.copy(r.buffer, r.offset, r.offset + meta_length + 1);
			r.buffer.pos -= meta_length + 1;
		}
	}

}
