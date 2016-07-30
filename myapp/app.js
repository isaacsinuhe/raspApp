var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

//ººººººººººººººººººººººººººººººººººººººWebService PRUEBA
var querystring = require('querystring');
var cerhttp = require('http');

var host = 'geo.groupkt.com';

function performRequest(endpoint, method, data, success){

var dataString = JSON.stringify(data);
var headers = {};

if(method == 'GET'){
	endpoint += '?' + querystring.stringify(data);
}else{
	headers = {
		'Content-Type': 'application/json',
		'Content-Length': dataString.length
	};
}

var options = {
	host: host,
	path: endpoint,
	method: method,
	headers: headers
};

var req = cerhttp.request(options, function(res){
	res.setEncoding('utf-8');

	var responseString = '';

	res.on('data', function(data){
	  responseString += data;
         });

	res.on('end', function(){
	  console.log(responseString);
	  var responseObject = JSON.parse(responseString);
	  success(responseObject);
	});
});

req.write(dataString);
req.end();

}//--------funcion performRequest--------


function obtenerDatos(){
	performRequest('/ip/201.141.11.78/json', 'GET', {
		"countryIso2": "MX"
	},function(data){
		console.log('Resultado: ' + data.result);
	});
}//--------funcion obtenerDatos--------

obtenerDatos();
//ºººººººººººººººººººººººººººººººººººººº

//Agregadas para pruebas--------------------------------->>
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
//------------------------------------------------------->>



// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


//CONTROL relays
//Declaración de variables y librerias necesarias
var fs = require('fs');
var sock;

var GPIOS = require('onoff').Gpio;
var relay1 = new GPIOS(17, 'out');
var relay2 = new GPIOS(18, 'out');
var relay3 = new GPIOS(19, 'out');
var relay4 = new GPIOS(20, 'out');
//Fin CONTROL relays

//MONGO DB

//variables para la conexiòn con la BD

var MongoClient = require ('mongodb').MongoClient,
assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/raspberry';

//funciòn para conectar con la Base de Datos

MongoClient.connect(url, function(err, db){

	assert.equal(null,err);
	console.log("Conectado correctamente al servidor de Base de Datos raspberry");

	db.close();
});

//Funciòn para insertar la collection a la Base de Datos -- YA INSERTADOS
/*
var insertarDocumentos = function(db, callback) {
   db.collection('raspberry').insertOne( {
      "ws" : {
	 "_id" : "",
	 "username" : "",
	 "password" : ""
	},
      "datosRaspBerry" : {
         "nombre" : "pi",
         "mac" : "b8:27:eb:e4:91:38",
         "kernel" : "4.1.19-v7+", //uname -r codigo para obtener kernel desde consola
     	 "uptime" : ""
	 },
      "statusRaspBerry" : {
	 "memTotal" : "",
	 "memLibre" : "",
	 "memUsada" : "",
	 "memCache" : "",
	 "memBuffer" : "",
	 "cpuUsage" : "",
	 "cpuTemp" : "",
	 "daemons" : ""
         },
      "statusCasa" : {
	 "casaTemp" : "",
	 "casaHum" : "",
	 "gas" : "",
	 "relay1" : "",
   "relay2" : "",
 	 "relay3" : "",
	 "relay4" : ""
	 },
	},
    function(err, result) {
    assert.equal(err, null);
    console.log("Se insertaron los documentos dentro de la coleciòn raspberry!!");
    callback();
  });
};

MongoClient.connect(url, function(err, db) {
  assert.equal(null, err);
  insertarDocumentos(db, function() {
      db.close();
  });
});


//Funciòn para recuperar el contenido de la colecciòn en la base de datos raspberry

var recuperarBD = function(db, callback) {
   var cursor = db.collection('raspberry').find( );
   cursor.each(function(err, doc) {
      assert.equal(err, null);
      if (doc != null) {
         console.dir(doc);
      } else {
         callback();
      }
   });
};

MongoClient.connect(url, function(err, db) {
  assert.equal(null, err);
  recuperarBD(db, function() {
      db.close();
  });
});
*/
//Funciòn para obtener un documento de la colección
var encuentraMAC = function(db, callback) {
   var cursor =db.collection('raspberry').find( { "datosRaspBerry.mac" : "b8:27:eb:e4:91:38" } );
   cursor.each(function(err, doc) {
      assert.equal(err, null);
      if (doc != null) {
         console.dir(doc);
      } else {
         callback();
      }
   });
};



//Función para Modificar datos de la colección
var actualizarBASE = function(db, memTotal, callback) {
   db.collection('raspberry').updateOne(
		 { "datosRaspBerry.mac" : "b8:27:eb:e4:91:38" },
      {
        $set:{
					 "statusRaspBerry.memTotal": memTotal,
					 "statusRaspBerry.memLibre": memTotal

				}
      }, function(err, results) {
      console.log(results);
      callback();
   });
};



//Funciòn para remover colecciòn de la Base de Datos
/*
var removerBD = function(db, callback) {
   db.collection('raspberry').deleteMany( {}, function(err, results) {
      console.log(results);
      callback();
   });
};

MongoClient.connect(url, function(err, db) {
  assert.equal(null, err);

  removerBD(db, function() {
      db.close();
  });
});
*/

//Fin MONGO DB

//Cuando abramos el navegador estableceremos una conexión con socket.io.
//Cada X segundos mandaremos a la gráfica un nuevo valor.
io.sockets.on('connection', function(socket) {
  var memTotal, memUsed = 0, memFree = 0, memBuffered = 0, memCached = 0, sendData = 1, percentBuffered, percentCached, percentUsed, percentFree;
  var address = socket.handshake.address;


  console.log("Nueva conexion desde:" + address);


  sock = socket;

  //usa GPIO 17 para encender/apagar relay 1
  socket.on('relay1', function (data) {
    console.log("Relay 1: " +data);
    if (data == 'on'){
        relay1.writeSync(1);


    }else{
        relay1.writeSync(0);

    }
  });

  //usa GPIO 18 para encender/apagar relay 2
  socket.on('relay2', function (data) {
    console.log("Relay 2: "+data);
    if (data == 'on'){
        relay2.writeSync(1);

    }else{
        relay2.writeSync(0);

    }
  });

	//usa GPIO 19 para encender/apagar relay 3
  socket.on('relay3', function (data) {
    console.log("Relay 3: "+data);
    if (data == 'on'){
        relay3.writeSync(1);
    }else{
        relay3.writeSync(0);
    }
  });

	//usa GPIO 20 para encender/apagar relay 4
  socket.on('relay4', function (data) {
    console.log("Relay 4: "+data);
    if (data == 'on'){
          relay4.writeSync(1);
    }else{
         relay4.writeSync(0);
    }
  });


  // Funcion para revisar el estado de la memoria
    child = exec("egrep --color 'MemTotal' /proc/meminfo | egrep '[0-9.]{4,}' -o", function (error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
    } else {
      socket.emit('memoryTotal', stdout);
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
	    }
	  });
	//}, 5000);


// Humidity
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
      }
  }
};
sensor.read();
//}, 2000);

//setInterval(function(){
  try{
  gpio.setup(10, gpio.DIR_IN, readInput);
     }catch(err){
   	console.log("error en el detector de gas");
    }

  try{
  function readInput(){
    gpio.read(10, function(err, value){
      var date = new Date().getTime();
      socket.emit('gas', value, date);
		});
  }
  }catch(err){
	console.log("error GAS 2");
  }

//update a base de datos
MongoClient.connect(url, function(err, db) {
  assert.equal(null, err);

  actualizarBASE(db, memTotal, function() {
      db.close();
  });
});//update bd

//mostrar BD
MongoClient.connect(url, function(err, db){
	assert.equal(null, err);
	encuentraMAC(db, function(){
		db.close();
	});
});
}, 3000);

});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });

});

server.listen(3001);
