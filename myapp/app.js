//Requires
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var app = module.exports.app = express();
var server = http.createServer(app),
io = require('socket.io').listen(server),
sys = require('util'),
sensorLib = require('node-dht-sensor'),
exec = require('child_process').exec,
gpio = require('rpi-gpio'),
child,
child1;

//Metodo para buscar y colocar el favicon dentro de /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
//Metodo para usar archivos estaticos dentro de public
app.use(express.static(path.join(__dirname, 'public')));

//Control Relevadores
var GPIOS = require('onoff').Gpio;
var relay1 = new GPIOS(17, 'out');
var relay2 = new GPIOS(18, 'out');
var relay3 = new GPIOS(19, 'out');
var relay4 = new GPIOS(20, 'out');

//MongoDB
var MongoClient = require ('mongodb').MongoClient,
assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/raspberry';

//Conectar MongoDB
MongoClient.connect(url, function(err, db){
	assert.equal(null,err);
	console.log("Conectado correctamente a: "+url);
	db.close();
});

//Mostrar la base de datos buscada por MAC
var encuentraMAC = function(db, callback) {
   var cursor =db.collection('raspberry').find( { "datosRaspBerry.mac" : "b8:27:eb:e4:91:38" } );
   cursor.each(function(err, doc) {
      assert.equal(err, null);
      if (doc != null) {
         console.dir(doc);
				 return doc;
      } else {
         callback();
				 return null;
      }
   });
};

//Función para Modificar datos de la colección
var actualizarBASE = function(db, memoriaTotal, memLibre, memUsada, memCache, memBuffer,
															cpuUsage,	cpuTemp, daemons, casaTemp, casaHum, casaGas, callback) {
   db.collection('raspberry').updateOne(
		 { "datosRaspBerry.mac" : "b8:27:eb:e4:91:38" },
      {
        $set:{
					"statusRaspBerry.memTotal" : memoriaTotal,
					"statusRaspBerry.memLibre": memLibre,
					"statusRaspBerry.memUsada": memUsada,
					"statusRaspBerry.memCache": memCache,
					"statusRaspBerry.memBuffer": memBuffer,
					"statusRaspBerry.cpuUsage": cpuUsage,
					"statusRaspBerry.cpuTemp": cpuTemp,
					"statusRaspBerry.daemons" : daemons,
				  "statusCasa.casaTemp": casaTemp,
				  "statusCasa.casaHum": casaHum,
				  "statusCasa.gas": casaGas
				 }
      }, function(err, results) {
      //console.log(results);
      callback();
   });
};

var actualizarBASERelay1 = function(db, valRelay1, callback){
	db.collection('raspberry').updateOne(
		{ "datosRaspBerry.mac" : "b8:27:eb:e4:91:38" },
		 {
			$set:{
					"statusCasa.relay1": valRelay1
			}
		},function(err, results){
				callback();
		});
};

var actualizarBASERelay2 = function(db, valRelay2, callback){
	db.collection('raspberry').updateOne(
		{ "datosRaspBerry.mac" : "b8:27:eb:e4:91:38" },
		 {
			$set:{
					"statusCasa.relay2": valRelay2
			}
		},function(err, results){
				callback();
		});
};

var actualizarBASERelay3 = function(db, valRelay3, callback){
	db.collection('raspberry').updateOne(
		{ "datosRaspBerry.mac" : "b8:27:eb:e4:91:38" },
		 {
			$set:{
					"statusCasa.relay3": valRelay3
			}
		},function(err, results){
				callback();
		});
};

var actualizarBASERelay4 = function(db, valRelay4, callback){
	db.collection('raspberry').updateOne(
		{ "datosRaspBerry.mac" : "b8:27:eb:e4:91:38" },
		 {
			$set:{
					"statusCasa.relay4": valRelay4
			}
		},function(err, results){
				callback();
		});
};

//Puebas REST

var Client = require('node-rest-client').Client;
var client = new Client();

// registering remote methods
client.registerMethod("jsonMethod", "https://jsonplaceholder.typicode.com/posts/100", "GET");

/*
var args = {
    data: { test : "Hola mi nombre es Joan un gusto" },
    headers: { "Content-Type": "application/json" }
};


client.post("https://jsonplaceholder.typicode.com/posts", args, function (data, response) {
    // parsed response body as js object
    console.log(data);
});
*/
//Socket.io
io.sockets.on('connection', function(socket) {
	var memTotal, memUsed = 0, memFree = 0,
			memBuffered = 0, memCached = 0,
		  sendData = 1, percentBuffered,
			percentCached, percentUsed, percentFree;

	var address = socket.handshake.address;

//Variables para Uptade de la Base de Datos
  var memoriaTotal = 0, memLibre = 0, memUsada = 0,
			memCache = 0, memBuffer = 0, cpuUsage = 0,
			cpuTemp = 0, daemons = 0, casaTemp = 0,
			casaHum = 0, casaGas = 0, valRelay1 = 0,
			valRelay2 = 0, valRelay3 = 0, valRelay4 = 0;


//Imprime la dirección IP de la nueva conexión
console.log("Nueva conexion desde:" + address);

var mandarRelay1 = function(db, callback){
  var cursor =db.collection('raspberry').find();
   cursor.each(function(err, doc) {
assert.equal(err, null);
if (doc != null) {
socket.emit('statusRelay1', doc.statusCasa.relay1);
socket.emit('statusRelay2', doc.statusCasa.relay2);
socket.emit('statusRelay3', doc.statusCasa.relay3);
socket.emit('statusRelay4', doc.statusCasa.relay4);
}
else { callback(); }
});
}

MongoClient.connect(url,function(err,db){
	assert.equal(null, err);
	mandarRelay1(db, function(){
		db.close();
	});

});

  //usa GPIO 17 para encender/apagar relay 1
  socket.on('relay1', function (data) {
    console.log("Relay 1: " +data);
    if (data == 'on'){
        relay1.writeSync(1);
				valRelay1 = 1;
    }else{
        relay1.writeSync(0);
				valRelay1 = 0;
    }
		//Almaceno valRelay1 y muestro
		MongoClient.connect(url, function(err, db){
			assert.equal(null, err);
			actualizarBASERelay1(db, valRelay1, function(){
				db.close();
			});
		});//MongoClient
  });

  //usa GPIO 18 para encender/apagar relay 2
  socket.on('relay2', function (data) {
    console.log("Relay 2: "+data);
    if (data == 'on'){
        relay2.writeSync(1);
				valRelay2 = 1;
    }else{
        relay2.writeSync(0);
				valRelay2 = 0;
    }
		//Almaceno valRelay2 y muestro
		MongoClient.connect(url, function(err, db){
			assert.equal(null, err);
			actualizarBASERelay2(db, valRelay2, function(){
				db.close();
			});
		});//MongoClient
  });

	//usa GPIO 19 para encender/apagar relay 3
  socket.on('relay3', function (data) {
    console.log("Relay 3: "+data);
    if (data == 'on'){
        relay3.writeSync(1);
				valRelay3 = 1;
    }else{
        relay3.writeSync(0);
				valRelay3 = 0;
    }
		//Almaceno valRelay3 y muestro
		MongoClient.connect(url, function(err, db){
			assert.equal(null, err);
			actualizarBASERelay3(db, valRelay3, function(){
				db.close();
			});
		});//MongoClient
  });

	//usa GPIO 20 para encender/apagar relay 4
  socket.on('relay4', function (data) {
    console.log("Relay 4: "+data);
    if (data == 'on'){
          relay4.writeSync(1);
					valRelay4 = 1;
    }else{
         relay4.writeSync(0);
				 valRelay4 = 0;
    }
		//Almaceno valRelay1 y muestro
		MongoClient.connect(url, function(err, db){
			assert.equal(null, err);
			actualizarBASERelay4(db, valRelay4, function(){
				db.close();
			});
		});//MongoClient
  });


  // Funcion para revisar el estado de la memoria
    child = exec("egrep --color 'MemTotal' /proc/meminfo | egrep '[0-9.]{4,}' -o", function (error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
    } else {
			memTotal = stdout;
			socket.emit('memoryTotal', stdout);
			//variable para el update de la Base de Datos
			memoriaTotal = memTotal;
    }
  });

  // Funcion para obtener el nombre del host
    child = exec("hostname", function (error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
    } else {
      socket.emit('hostname', stdout);
    }
  });

    child = exec("uptime | tail -n 1 | awk '{print $1}'", function (error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
    } else {
      socket.emit('uptime', stdout);
    }
  });

	child = exec("uptime | tail -n 1 | awk '{print $3 $4 $5}'", function (error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
		} else {
			socket.emit('uptime', stdout);
		}
	});

    child = exec("uname -r", function (error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
    } else {
      socket.emit('kernel', stdout);
    }
  });

    child = exec("top -d 0.5 -b -n2 | tail -n 10 | awk '{print $12}'", function (error, stdout, stderr) {
	    if (error !== null) {
	      console.log('exec error: ' + error);
	    } else {
	      socket.emit('toplist', stdout);
	    }
	  });


  setInterval(function(){
    // Function for checking memory free and used
    child1 = exec("egrep --color 'MemFree' /proc/meminfo | egrep '[0-9.]{4,}' -o", function (error, stdout, stderr) {
    if (error == null) {
      memFree = stdout;
      memUsed = parseInt(memTotal)-parseInt(memFree);
      percentUsed = Math.round(parseInt(memUsed)*100/parseInt(memTotal));
      percentFree = 100 - percentUsed;
			//Variables usadas para el update de la Base de Datos
			memLibre = memFree;
			memUsada = memoriaTotal - memLibre;
			memLibre = (memUsada*100)/memoriaTotal;
			memUsada = 100 - memLibre;
    } else {
      sendData = 0;
      console.log('exec error: ' + error);
    }

	});

    // Function for checking memory buffered
    child1 = exec("egrep --color 'Buffers' /proc/meminfo | egrep '[0-9.]{4,}' -o", function (error, stdout, stderr) {
    if (error == null) {
      memBuffered = stdout;
      percentBuffered = Math.round(parseInt(memBuffered)*100/parseInt(memTotal));
			//Variable usada para el update de la Base de Datos
			memBuffer = (memBuffered*100)/memoriaTotal;
    } else {
      sendData = 0;
      console.log('exec error: ' + error);
    }
  });

    // Function for checking memory buffered
    child1 = exec("egrep --color 'Cached' /proc/meminfo | egrep '[0-9.]{4,}' -o", function (error, stdout, stderr) {
    if (error == null) {
      memCached = stdout;
      percentCached = Math.round(parseInt(memCached)*100/parseInt(memTotal));
			memCache = (memCached*100)/memoriaTotal;
    } else {
      sendData = 0;
      console.log('exec error: ' + error);
    }
  });

    if (sendData == 1) {
      socket.emit('memoryUpdate', percentFree, percentUsed, percentBuffered, percentCached);
    } else {
      sendData = 1;
    }
  //}, 3000);

  // Function for measuring temperature
  //setInterval(function(){
    child = exec("cat /sys/class/thermal/thermal_zone0/temp", function (error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
    } else {
      //Es necesario mandar el tiempo (eje X) y un valor de temperatura (eje Y).
      var date = new Date().getTime();
      var temp = parseFloat(stdout)/1000;
      socket.emit('temperatureUpdate', date, temp);
			cpuTemp = temp;
    }
  });
	//}, 2000);

  //setInterval(function(){
    child = exec("top -d 0.5 -b -n2 | grep 'Cpu(s)'|tail -n 1 | awk '{print $2 + $4}'", function (error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
    } else {
      //Es necesario mandar el tiempo (eje X) y un valor de temperatura (eje Y).
      var date = new Date().getTime();
      socket.emit('cpuUsageUpdate', date, parseFloat(stdout));
			//Variable usada para el update de la Base de Datos
			cpuUsage = parseFloat(stdout);
    }
  });
	//}, 2000);

	// Uptime
  //setInterval(function(){
    child = exec("uptime | tail -n 1 | awk '{print $3 $4 $5}'", function (error, stdout, stderr) {
	    if (error !== null) {
	      console.log('exec error: ' + error);
	    } else {
	      socket.emit('uptime', stdout);
	    }
	  });
	//}, 5000);

// TOP list
  //setInterval(function(){
    child = exec("ps aux --width 30 --sort -rss --no-headers | head  | awk '{print $11}'", function (error, stdout, stderr) {
	    if (error !== null) {
	      console.log('exec error: ' + error);
	    } else {
	      socket.emit('toplist', stdout);
				//Variable usada para el update de la Base de Datos
				daemons = stdout;
	    }
	  });
	//}, 5000);


//Script para obtener la Temperatura y Humedad del sensor DHT-11
//setInterval(function(){
var sensor = {
  sensors: [ {
      name: "Indoor",
      type: 11,
      pin: 4
  }],

read: function() {
  for (var a in this.sensors) {
    var b = sensorLib.readSpec(this.sensors[a].type, this.sensors[a].pin);
    var date = new Date().getTime();
    temp = parseFloat(b.temperature.toFixed(2));
    hum = parseFloat(b.humidity.toFixed(2));
    socket.emit('temperatura', temp, date);
    socket.emit('humedad', hum, date);

		//Variables para el update en la Base de Datos
		casaTemp = temp;
		casaHum = hum;
      }
  }
};
sensor.read();
//}, 2000);

//Script para obtener el valor de retorno del sensor de Gas
//setInterval(function(){
  gpio.setup(10, gpio.DIR_IN, readInput);

	function readInput(){
    gpio.read(10, function(err, value){
    	var date = new Date().getTime();
      socket.emit('gas', value, date);

			//Variable para el update en la Base de Datos
			casaGas = value;
		});
  }

//Update a base de datos
MongoClient.connect(url, function(err, db) {
  assert.equal(null, err);

  actualizarBASE(db, memoriaTotal, memLibre,
								memUsada, memCache, memBuffer,
								cpuUsage, cpuTemp, daemons,
								casaTemp, casaHum,casaGas, function() {
      db.close();
  });
});
/*
//mostrar BD
MongoClient.connect(url, function(err, db){
	assert.equal(null, err);
	encuentraMAC(db, function(){
		db.close();
	});
});
*/

//El siguiente codigo es para realizar el PUT a la pagina de la nube...
var args = {
    data: { status.cpuUsage = cpuUsage,
        		status.cpuTemp = cpuTemp,
        		status.memUsada = memUsada,
        		status.memLibre = memLibre,
        		status.memCache = memCache,
        		status.memBuffer = memBuffer,
        		status.daemons = daemons
					},
    headers: { "Content-Type": "application/json" }
};


client.("https://jsonplaceholder.typicode.com/posts", args, function (data, response) {
    // parsed response body as js object
    console.log(data);
});

}, 3000);

setInterval(function(){
	client.methods.jsonMethod(function (data, response) {
	    // parsed response body as js object
	    console.log(data);
	});
	/*
	var dato1 = 1, dato2 = 1, dato3 = 1, dato4 = 1;

	MongoClient.connect(url, function(err, db){
		assert.equal(null, err);
		actualizarBASERelay1(db, dato1, function(){
			db.close();
		});
		actualizarBASERelay2(db, dato2, function(){
			db.close();
		});
		actualizarBASERelay3(db, dato3, function(){
			db.close();
		});
		actualizarBASERelay4(db, dato4, function(){
			db.close();
		});
		//Para cuando esté el WebService
		//relay1.writeSync(dato1);
		//relay2.writeSync(dato2);
		//relay3.writeSync(dato3);
		//relay4.writeSync(dato4);
	});*/
}, 5000);

});

//Puerto en el que corre el servidor
server.listen(3001);
console.log("Servidor ASISA corriendo en http://localhost:3001");
