var mysql = require("mysql");
var db = mysql.createConnection({
	database : 'radiosaver',
	host     : 'localhost',
	user     : 'root',
	password : ''
});
db.connect();

exports.stationList = function(callback)
{
	db.query("SELECT * FROM stations WHERE active=1", function(err, rows){
		if (err) console.error(err);
		var stations = {};
		for (var i=0; i<rows.length; i++)
			stations[rows[i].id] = rows[i];

		if (typeof callback == "function")
			callback(stations);
	});
}

exports.getTracks = function(station_id, callback)
{
	// find first not checked
	db.query("SELECT * FROM tracks WHERE state=0 AND station_id=? AND date=DATE(NOW()) ORDER BY pos ASC LIMIT 10", [station_id], function(err, rows){
		if (err) console.error(err);
		if (typeof callback == "function")
			callback(rows || []);
	});
}

exports.getLastTrack = function(station_id, state, callback)
{
	db.query("SELECT * FROM tracks WHERE station_id=? "+(state?"AND state=1":"")+" AND date=DATE(NOW()) ORDER BY pos DESC LIMIT 1", [station_id], function(err, rows){
		if (err) console.error(err);
		if (typeof callback == "function")
			callback(rows.shift() || {});
	});
}


exports.insertTrack = function(data, callback)
{
	var keys=[], values=[], placeholders=[];
	for (var key in data){
		keys.push(key);
		values.push(data[key]);
		placeholders.push("?");
	}
	db.query("INSERT INTO tracks ("+keys.join(",")+") VALUES ("+placeholders.join(",")+")", values, function(err, result){
		if (err) console.error(err);
		if (typeof callback == "function")
			callback(result.insertId);
	});
}

exports.updateTrack = function(data, callback)
{
	var keys=[], values=[];
	for (var key in data){
		keys.push(key+"=?");
		values.push(data[key]);
	}
	values.push(data.id);
	db.query("UPDATE tracks SET "+keys.join(",")+" WHERE id=?", values, function(err, result){
		if (err) console.error(err);
		if (typeof callback == "function")
			callback(result);
	});
}


