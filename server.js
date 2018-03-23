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

var history_head = `
		<!DOCTYPE html>
		<html>
		<head>
			<title>Check-in App</title>
			<meta charset="utf-8">
			<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.6.4/angular.min.js"></script>
			<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta.2/css/bootstrap.min.css">
		</head>
		<style>
			body{
				background-color: #FAEBD7;
			}
			h1{
				text-align: center;
			}
			h4{
				text-align: center;
			}

			/* Style the tab */
			.tab {
			    overflow: hidden;
			    background-color: #f1f1f1;
			}

			/* Style the buttons inside the tab */
			.tab button {
				margin-left: 10%;
			    background-color: inherit;
			    float: left;
			    border: none;
			    outline: none;
			    cursor: pointer;
			    padding: 14px 16px;
			    transition: 0.3s;
			    font-size: 17px;
			}

			/* Change background color of buttons on hover */
			.tab button:hover {
			    background-color: #FFDAB9;
			    color: #FF6347;
			}

			/* Create an active/current tablink class */
			.tab button.active {
			    background-color: #ccc;
			}
			.table{
				text-align: center;
				margin-left: 15%;
				margin-right: 15%;
				width: 70%;
				background-color: #fef3e2;
			}
			.checkID{
				width: 20%;
			}
		</style>
	`;

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
app.get('/history', function(req, res){
	var history_body_start = `
		<body ng-app="myApp" ng-controller="myCtrl">
			<div>
				<div class="tab">
				    <form method="get" action="/">
						<button type="submit">Homepage</button>
					</form>
					<form method="get" action="/check_in" method="GET">
				    	<button type="submit">Student</button>
				    </form>
				</div>
				<br>
				<h1>Online Check-in Application </h1>
				<h4>History</h4><br>
		`;

	MongoClient.connect(url, function(err, client){ 
		if (err) console.log(err); 
		var database = client.db('local'); 
		var table_string = ``, table_body = ``, table_head_start=``;  // html string to store history table 
		database.listCollections().toArray(function(err, collInfos) {
			if(err) console.log(err);

			collInfos.forEach(function(coll){
				if(coll.name != "startup_log" && coll.name != "checkIn"){
					console.log("coll.name ---> ", coll.name)
					  	
					database.collection(coll.name).find().toArray(function(err, data) {
						// console.log(coll.name);
						table_body = ``;   table_head_start = '';
						table_head_start = `
							<table class="table">
							  <thead>
							    <tr>
							      <th scope="col" class="checkID">` + coll.name + `</th>
							      <th scope="col">Username</th>
							      <th scope="col">ID</th>
							      <th scope="col">CheckIn Time</th>
							      <th scope="col"><button type="button" class="btn btn-outline-danger" ng-click="DeleteColl(coll.name)">Delete</button></th>
							    </tr>
							  </thead>
							  <tbody>
					  	`;

			            for(var i = 0; i < data.length; i++){
			            	table_body = table_body+ '<tr><td>'+(i+1)+'</td><td>'+data[i].name+'</td><td>'+data[i].address+'</td><td>'+data[i].time+'</td></tr>';
			            }

			            var table_head_end = `
					        	</tbody>
							</table>`;
			            table_string = table_string+table_head_start+ table_body+ table_head_end;
			        });
				}
			});

		});
		var history_body_end = `
			</div>
		</body>
		<script>
			var app = angular.module('myApp', []);
			app.controller('myCtrl', function($scope) {
			    $scope.DeleteColl = function() {
			    	console.log("I M HERE")
		    	};
			});
		</script>`;

		setTimeout(function () {
  			res.send(history_head+history_body_start+table_string+history_body_end);
  			// console.log(history_head+history_body_start+table_string+history_body_end)
  		}, 1000)
	});
	
});


server.listen(PORT);
console.log('Magic is happening on port', PORT);










