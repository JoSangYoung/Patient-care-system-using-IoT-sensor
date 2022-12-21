// import node.js library
var express = require('express');
var fs = require('fs');
var mysql = require('mysql');
var app = express();
var server = require('http').createServer(app);
var multipart = require('connect-multiparty');
var bodyParser = require('body-parser');
var path = require('path');
var ejs = require('ejs');


// basic variables
var now = new Date();
var date = now.getDate();
var ringer;
var urine;
var waste;
var temp;
var humi;


// import the ARTIKCloud library
var ArtikCloud = require('artikcloud-js');


// configuration file to simplify retrieving the device ID and device token
var configPatient1 = require('./patient1.json');
var configRoom = require('./room.json');


// configure client to set the oauth2 access_token or use the device_token here
var defaultClient = ArtikCloud.ApiClient.instance;


// configure with oauth2 access_token or use the device_token 
var artikcloud_oauth = defaultClient.authentications['artikcloud_oauth'];


// get reference to Messages API
var api = new ArtikCloud.DevicesStatusApi();


// request parameters when making API call.
var optPatient1 = { 
  'count': 1, // {Number} Number of items to return per query.
  'sdids': configPatient1['device_id'] // {String} Comma separated list of source device
};

var optRoom = {
  'count': 1, // {Number} Number of items to return per query.
  'sdids': configRoom['device_id'] // {String} Comma separated list of source
};


// get respond from cloud
var callbackPatient1 = function(error, data, response) {
	if (error) {
		console.error(error);
	} else {
		var temp = data.data.pop().data.snapshot;
		ringer = temp.ringer.value;
		urine = temp.urineBag.value;

    	console.log('ringer data : ', ringer);
		console.log('urine data : ', urine);
	}
};

var callbackRoom = function(error, data, response) {
	if (error) {
		console.error(error);
	} else {
		waste = (data.data.pop().data.snapshot.wasteBasket.value-1150)/16; // min distance 1150
		console.log('waste data : ', waste);
	}
};


// message sender to ArtikCloud
var webSocketUrl = "wss://api.artik.cloud/v1.1/websocket?ack=true";
var device_id = configRoom['device_id'];
var device_token = configRoom['device_token'];

var WebSocket = require('ws');
var isWebSocketReady = false;
var ws = null;

var sensorLib = require('node-dht-sensor');

var sensor = {
	initialize:function(){
		return sensorLib.initialize(11,4);
        },
	read: function(){
		var readout = sensorLib.read();
		temp = readout.temperature.toFixed(2);
		humi = readout.humidity.toFixed(2);
		var data = { temp, humi }
		return data;
        },
}

function getTimeMillis(){
	return parseInt(Date.now().toString());
}

function start() {
	isWebSocketReady = false;
	ws = new WebSocket(webSocketUrl);
        
	ws.on('open', function() {
		console.log("websocket is connected");
		register();
        });

	ws.on('message', function(data) {
		//console.log("Received message: " + data + '\n');
		//handleRcvMsg(data);
        });

	ws.on('close', function() {
		console.log("websocket is disconnected");
		//exitClosePins();
        });
}

function register(){
	//console.log("Registering device on the WebSocket connection");

	try{
		var registerMessage = '{"type":"register", "sdid":"'+device_id+'", "Authorization":"bearer '+device_token+'", "cid":"'+getTimeMillis()+'"}';
		//console.log('Sending register message ' + registerMessage + '\n');
		ws.send(registerMessage, {mask: true});
		isWebSocketReady = true;
        }
	catch (e) {
		console.error('Failed to register messages. Error in registering message: ' + e.toString());
        }
}

function sendSensorValueToArtikCloud_emergencyCall(){
	try{
		ts = ', "ts": '+getTimeMillis();

		var data = {
			"emergencyCall": 1
		};

		//console.log(data);
		var payload = '{"sdid":"'+device_id+'"'+ts+', \ "data": '+JSON.stringify(data)+', \ "cid":"'+getTimeMillis()+'"}'; 
		//console.log('Sending payload ' + payload + '\n');
		ws.send(payload, {mask:true});

	} catch (e) {
		console.error('Error in sending a message: ' + e.toString() +'\n');
        }
}

function sendSensorValueToArtikCloud_humitemp(){
	try{
		ts = ', "ts": '+getTimeMillis();
		if(sensor.initialize()){
			temp = sensor.read().temp;
			humi = sensor.read().humi;
		}

		var data = {
			"temperature": temp,
			"humidity": humi
		};

		//console.log(data);
		var payload = '{"sdid":"'+device_id+'"'+ts+', \ "data": '+JSON.stringify(data)+', \ "cid":"'+getTimeMillis()+'"}';
		//console.log('Sending payload ' + payload + '\n');
		ws.send(payload, {mask: true});

	} catch (e) {
		console.error('Error in sending a message: ' + e.toString() +'\n');
        }
}

function exitClosePins() {
	console.log('Exit and destroy all pins!');
	//process.exit();
}

start();


// routing static path
app.use(multipart({uploadDir:__dirname+'/public/img'})); 
app.use(bodyParser.urlencoded({extended:false})); 
app.use(express.static('public')); 
app.use(express.static(path.join(__dirname,'public')));
app.use(express.static(path.join(__dirname+/public/,'img')));


//DB connection
var connection = mysql.createConnection({
	user : 'root',
	password : 'root',
	database : 'careDB'
});

connection.connect(function(err) {
	if(err) {
		console.error('mysql connection error');
		throw err;
	}else{
		console.log("mysql is connected");
	}
});


// main page //

app.get('/', function(req, res){
	sendSensorValueToArtikCloud_humitemp();
	fs.readFile('index.html','utf8',function(error, data) {
		res.end(ejs.render(data,{
			g_temp:temp,
			g_humi:humi
		}));
	});
	console.log("temperature : " + temp);
	console.log("humidity : " + humi);
});

// emergency call
app.post('/', function(req, res){
	fs.readFile('index.html', function(error, data) {
		sendSensorValueToArtikCloud_emergencyCall();
	});
	console.log("emergency call");
});


// timetable page //

app.get('/timetable',function(req, res){
	connection.query('select * from timetable where day=?', date, function(err, rows, fields) {
		year = rows[0].year;
		month = rows[0].month;
		day = rows[0].day;
		week = rows[0].week;
		t6 = rows[0].t06_08;
		t8 = rows[0].t08_10;
		t10 = rows[0].t10_12;
		t12 = rows[0].t12_14;
		t14 = rows[0].t14_16;
		t16 = rows[0].t16_18;
		t18 = rows[0].t18_20;
		t20 = rows[0].t20_22;

		fs.readFile('timetable.html','utf8',function(err, data){
			res.end(ejs.render(data,{
				g_year : year,
				g_month : month,
				g_day : day,
				g_week : week,
				g_t6 : t6,
				g_t8 : t8,
				g_t10 : t10,
				g_t12 : t12,
				g_t14 : t14,
				g_t16 : t16,
				g_t18 : t18,
				g_t20 : t20
			}));
		});
	});

	console.log("timetable page");
});


// medicine page //

app.get('/medicine',function(req, res){
	fs.readFile('medicine.html','utf8',function(err, data){
		res.send(data.toString());
	});
	console.log("medicine page");
});

app.get('/headache',function(req, res){
	connection.query('select * from medicine where symptom=?', "두통", function(err, rows, fields) {
		name1 = rows[0].name;
		name2 = rows[1].name;
		symptom1 = rows[0].symptom;
		symptom2 = rows[1].symptom;
		caution1 = rows[0].caution;
		caution2 = rows[1].caution;
		img1 = rows[0].img;
		img2 = rows[1].img;

		fs.readFile('headache.html','utf8',function(err, data){
			res.end(ejs.render(data,{
				g_name1 : name1,
				g_name2 : name2,
				g_symptom1 : symptom1,
				g_symptom2 : symptom2,
				g_caution1 : caution1,
				g_caution2 : caution2,
				g_img1 : img1,
				g_img2 : img2
			}));
		});
	});
	console.log("headache");
});

app.get('/toothache',function(req, res){
	connection.query('select * from medicine where symptom=?', "치통", function(err, rows, fields) {
		name1 = rows[0].name;
		name2 = rows[1].name;
		symptom1 = rows[0].symptom;
		symptom2 = rows[1].symptom;
		caution1 = rows[0].caution;
		caution2 = rows[1].caution;
		img1 = rows[0].img;
		img2 = rows[1].img;

		fs.readFile('toothache.html','utf8',function(err, data){
			res.end(ejs.render(data,{
				g_name1 : name1,
				g_name2 : name2,
				g_symptom1 : symptom1,
				g_symptom2 : symptom2,
				g_caution1 : caution1,
				g_caution2 : caution2,
				g_img1 : img1,
				g_img2 : img2
			}));
		});
	});
	console.log("toothache");
});

app.get('/indigestion',function(req, res){
	connection.query('select * from medicine where symptom=?', "소화불량", function(err, rows, fields) {
		name1 = rows[0].name;
		name2 = rows[1].name;
		symptom1 = rows[0].symptom;
		symptom2 = rows[1].symptom;
		caution1 = rows[0].caution;
		caution2 = rows[1].caution;
		img1 = rows[0].img;
		img2 = rows[1].img;

		fs.readFile('indigestion.html','utf8',function(err, data){
			res.end(ejs.render(data,{
				g_name1 : name1,
				g_name2 : name2,
				g_symptom1 : symptom1,
				g_symptom2 : symptom2,
				g_caution1 : caution1,
				g_caution2 : caution2,
				g_img1 : img1,
				g_img2 : img2
			}));
		});
	});
	console.log("indigestion");
});

app.get('/cold',function(req, res){
	connection.query('select * from medicine where symptom=?', "감기", function(err, rows, fields) {
		name1 = rows[0].name;
		name2 = rows[1].name;
		symptom1 = rows[0].symptom;
		symptom2 = rows[1].symptom;
		caution1 = rows[0].caution;
		caution2 = rows[1].caution;
		img1 = rows[0].img;
		img2 = rows[1].img;

		fs.readFile('cold.html','utf8',function(err, data){
			res.end(ejs.render(data,{
				g_name1 : name1,
				g_name2 : name2,
				g_symptom1 : symptom1,
				g_symptom2 : symptom2,
				g_caution1 : caution1,
				g_caution2 : caution2,
				g_img1 : img1,
				g_img2 : img2
			}));
		});
	});
	console.log("cold");
});

app.get('/stomachache',function(req, res){
	connection.query('select * from medicine where symptom=?', "속쓰림", function(err, rows, fields) {
		name1 = rows[0].name;
		name2 = rows[1].name;
		symptom1 = rows[0].symptom;
		symptom2 = rows[1].symptom;
		caution1 = rows[0].caution;
		caution2 = rows[1].caution;
		img1 = rows[0].img;
		img2 = rows[1].img;

		fs.readFile('stomachache.html','utf8',function(err, data){
			res.end(ejs.render(data,{
				g_name1 : name1,
				g_name2 : name2,
				g_symptom1 : symptom1,
				g_symptom2 : symptom2,
				g_caution1 : caution1,
				g_caution2 : caution2,
				g_img1 : img1,
				g_img2 : img2
			}));
		});
	});
	console.log("stomachache");
});

app.get('/cramps',function(req, res){
	connection.query('select * from medicine where symptom=?', "생리통", function(err, rows, fields) {
		name1 = rows[0].name;
		name2 = rows[1].name;
		symptom1 = rows[0].symptom;
		symptom2 = rows[1].symptom;
		caution1 = rows[0].caution;
		caution2 = rows[1].caution;
		img1 = rows[0].img;
		img2 = rows[1].img;

		fs.readFile('cramps.html','utf8',function(err, data){
			res.end(ejs.render(data,{
				g_name1 : name1,
				g_name2 : name2,
				g_symptom1 : symptom1,
				g_symptom2 : symptom2,
				g_caution1 : caution1,
				g_caution2 : caution2,
				g_img1 : img1,
				g_img2 : img2
			}));
		});
	});
	console.log("cramps");
});


// menu page //

app.get('/menu',function(req, res){
	fs.readFile('menu.html','utf8',function(err, data){
		res.send(data.toString());
	});
	console.log("menu page");
});

app.get('/breakfast',function(req, res){
	connection.query('select * from menu where day=?', date, function(err, rows, fields) {
		year = rows[0].year;
		month = rows[0].month;
		day = rows[0].day;
		week = rows[0].week;
		food = rows[0].breakfast;

		fs.readFile('breakfast.html','utf8',function(err, data){
			res.end(ejs.render(data,{
				g_year : year,
				g_month : month,
				g_day : day,
				g_week : week,
				g_food : food
			}));
		});
	});

	console.log("breakfast");
});

app.get('/lunch',function(req, res){
	connection.query('select * from menu where day=?', date, function(err, rows, fields) {
		year = rows[0].year;
		month = rows[0].month;
		day = rows[0].day;
		week = rows[0].week;
		food = rows[0].lunch;

		fs.readFile('lunch.html','utf8',function(err, data){
			res.end(ejs.render(data,{
				g_year : year,
				g_month : month,
				g_day : day,
				g_week : week,
				g_food : food
			}));
		});
	});

	console.log("lunch");
});

app.get('/dinner',function(req, res){
	connection.query('select * from menu where day=?', date, function(err, rows, fields) {
		year = rows[0].year;
		month = rows[0].month;
		day = rows[0].day;
		week = rows[0].week;
		food = rows[0].dinner;

		fs.readFile('dinner.html','utf8',function(err, data){
			res.end(ejs.render(data,{
				g_year : year,
				g_month : month,
				g_day : day,
				g_week : week,
				g_food : food
			}));
		});
	});

	console.log("dinner");
});


// data page //

app.get('/data',function(req, res){
	fs.readFile('data.html','utf8',function(err, data){
		res.send(data.toString());
	});

	artikcloud_oauth.accessToken = configPatient1['device_token']
	api.getDevicesStatus(configPatient1['device_id'],optPatient1, callbackPatient1);

	artikcloud_oauth.accessToken = configRoom['device_token']
	api.getDevicesStatus(configRoom['device_id'],optRoom, callbackRoom);

	console.log("data page");
});

app.get('/ringer',function(req, res){
	fs.readFile('ringer.html','utf8',function(err, data){
		res.end(ejs.render(data,{
			g_ringer : ringer
		}));
	});
	
});

app.get('/urine',function(req, res){
	fs.readFile('urine.html','utf8',function(err, data){
		res.end(ejs.render(data,{
			g_urine : urine
		}));
	});

});

app.get('/waste',function(req, res){
	fs.readFile('waste.html','utf8',function(err, data){
		res.end(ejs.render(data,{
			g_waste : waste
		}));
	});

});



server.listen(8000, function(){
	console.log('Server running at http://192.168.0.27:8000/');
});
