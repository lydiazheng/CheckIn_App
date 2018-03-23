'use strict'
var express = require('express');
const PORT = 8080;
var app = express();
var http = require('http');
var server = http.Server(app);
var bodyParser = require('body-parser');

//mongoDB
var MongoClient = require('mongodb').MongoClient; 
// var url = "mongodb://weilingz:zwl19950928@127.0.0.1:27017/cmpt218_weilingz?authSource=admin"; 
var url = "mongodb://127.0.0.1:27017/cmpt218_weilingz"; 

app.use( bodyParser.json() ); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // to support URL-encoded bodies

//create checkIn collection to allow students check in
MongoClient.connect(url, function(err, client){ 
	client.db('local').createCollection("checkIn", function(err, res) {
		if(err) throw err;
	});
});


// set html
app.get('/', function(req, res){
	res.sendFile('/view/login.html', {root: __dirname});
});
app.get('/admin_landing', function(req, res){
	res.sendFile('/view/admin_landing.html', {root: __dirname});
});
app.get('/check_in', function(req, res){
	res.sendFile('/view/check_in.html', {root: __dirname});
});
app.get('/error', function(req, res){
	res.sendFile('/view/error.html', {root: __dirname});
});
app.get('/err_check', function(req, res){
	res.sendFile('/view/err_check.html', {root: __dirname});
});
app.get('/success', function(req, res){
	res.sendFile('/view/success.html', {root: __dirname});
});
app.get('/history', function(req, res){
	res.sendFile('/view/history.html', {root: __dirname});
});

// land to the admin page with username && password
app.post('/admin', function(req,res){
	if(req.body.username === "admin" && req.body.password === "1234"){
		res.redirect('/admin_landing');
	}
	else
		res.redirect('/error');
});

// put checkID into database -- set the start time
app.post('/admin_landing_start', function(req,res, next){
	MongoClient.connect(url, function(err, client){ 
		if (err) console.log(err); 

		var database = client.db('local'); 
		var start_time = new Date();
		var myobj = {name: req.body.checkID, check: true};
		
		database.createCollection(req.body.checkID, function(err, res) {
		    if (err) throw err;
		    console.log(req.body.checkID, "Collection created!");
		    database.collection("checkIn").find({name: req.body.checkID}).toArray(function(err, result) {
	  			if(result.length == 0){   // if we dont have this course, create a new collection and turn on checking
	  				database.collection("checkIn").insertOne(myobj, function(err, data){ 
						if(err) console.log(err);
						client.close();
						
					}); 
	  			}
	  			else{ // if we already have checkID course, then turn on checking
	  				database.collection("checkIn").find({name: req.body.checkID}).toArray(function(err, data) {
	  					var myquery = { name: req.body.checkID};
						var newvalues = { $set: {check: true} };
						database.collection("checkIn").updateOne(myquery, newvalues, function(err, data) {
						    if (err) throw err;
						    client.close();
						});
	  				});
	  			}
	  		});
  		});
	});
});


// stop checkinID -- set the end time 
app.post('/admin_landing_end', function(req,res){
	MongoClient.connect(url, function(err, client){ 
		if (err) console.log(err); 
		var database = client.db('local'); 
		database.createCollection(req.body.checkID, function(err, res) {
			if (err) throw err;
			database.collection("checkIn").find({name: req.body.checkID}).toArray(function(err, result) {
				  var myquery = { name: req.body.checkID};
				  var newvalues = { $set: {check: false} };
				  database.collection("checkIn").updateOne(myquery, newvalues, function(err, data) {
				    if (err) throw err;
				    client.close();
				});
			});
		})
		setTimeout(function () {
  			res.send();
  		}, 500)
	});
});

// get the history of specific course after admin stop checking
app.post('/attendence', function(req, res){
	MongoClient.connect(url, function(err, client){ 
		if (err) console.log(err); 
		var database = client.db('local');
		database.collection(req.body.checkID).find().toArray(function(err, data) {
			res.send(data);
			client.close();
		});
	});
});

// students checkin the course
app.post('/check_in', function(req,res){
	if(req.body.check_in_string && req.body.username && req.body.user_id){
		MongoClient.connect(url, function(err, client){ 
			if (err) console.log(err); 
			var time = (new Date()).toString();
			var database = client.db('local'); 
			var collection = database.collection(req.body.check_in_string);
			var myobj = { name: req.body.username, address: req.body.user_id, time: time};

			database.collection("checkIn").find({name: req.body.check_in_string}).toArray(function(err, result) {
			    if (err) throw err;
			    console.log(result[0], result, req.body.check_in_string );
			    if(result[0] == undefined || result[0].check == false) {
			    	res.redirect('/err_check');
			    }
			    else {
			    	if(result[0].check == true){
				    	collection.insertOne(myobj, function(err, result){ 
							if(err) console.log(err);
							console.log(myobj, " interted!!");
							client.close();
						}); 
						res.redirect('/success');
				    }
				}
			});
			
		});
	}
	else{
		res.redirect('/err_check');
	}
});

// admin -- view history page
app.get('/history_table', function(req, res){
	MongoClient.connect(url, function(err, client){ 
		if (err) console.log(err); 
		var database = client.db('local'); 
		var myObj = {};

		database.listCollections().toArray(function(err, collInfos) {
			if(err) console.log(err);

			collInfos.forEach(function(coll){
				if(coll.name != "startup_log" && coll.name != "checkIn" && coll.name != "readMe"){
					console.log("coll.name ---> ", coll.name)
					if(!myObj[coll.name])	myObj[coll.name] = [];

					database.collection(coll.name).find().toArray(function(err, data) {
						myObj[coll.name] = data;
			        });
				}
			});

		});
		setTimeout(function () {
			res.send(myObj);
  		}, 1000)
	});
	
});

// delete collections in history page 
app.post('/delete_coll', function(req,res){
	MongoClient.connect(url, function(err, client){ 
		if (err) console.log(err); 
		var database = client.db('local');
		database.collection(req.body.checkID).drop(function(err, delOK) {
			if (err) throw err;
			if (delOK) console.log(req.body.checkID, "Collection deleted");
			client.close();
		});
	});
	setTimeout(function () {
		res.sendFile('/view/history.html', {root: __dirname});
	}, 500)
});

server.listen(PORT);
console.log('Magic is happening on port', PORT);










