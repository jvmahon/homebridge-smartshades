'use strict';
var net = require('net');
var promiseHTTP = require("request-promise-native");
var chalk = require("chalk");
			

var exports = module.exports;
var globals = [];																																	
module.exports.globals = globals;

var Accessory, Service, Characteristic, UUIDGen;

// This is a crude attempt to avoid sending too fast. The NEO controller seems to have many errors if it receives http request too quickly.
// solution is a simple monitoring loop - every 2 seconds, the loop checks the queue for anything to send. As a extra check, it won't send if the last report was not more than 1 second prior
class SendQueue
{
	constructor()
	{
		this.lastSent = Date.now();
		this.queued = [];

		// Send no more than once per second
		var timer = setInterval( ()=> {
			if ((this.queued.length != 0) && ((Date.now() - this.lastSent) > 1000) )
			{
					var nextURL = this.queued.shift();
					this.lastSent = Date.now();
					
					var that = this;
					console.log(chalk.yellow("*Debug* Attempting URL: %s \n\t\tat time: %s"), nextURL.href, Date.now());

					var send = promiseHTTP({uri:nextURL.href})
					.then( function(result)
					{
						that.lastSent = Date.now();
						console.log("Sent URL: %s \n\t\tat time: %s", nextURL.href, Date.now());
					}
					)
					.catch( function(error)
					{
						console.log(chalk.red("*Error* code: " + error + ", when sending url: " + nextURL.href + ", at time: " + Date.now()));
					});
			}
		}, 2000)
	}
	
	
	send(url)
	{

		this.queued.push(url);
	}
}

var ShadeControl = new SendQueue;
	

module.exports = function (homebridge) {
    console.log("homebridge API version: " + homebridge.version);

    // Accessory must be created from PlatformAccessory Constructor
    Accessory = homebridge.platformAccessory;

    // Service and Characteristic are from hap-nodejs
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    homebridge.registerPlatform("homebridge-NEOShadePlatform", "NEOShades", NEOShadePlatform, true);
}



function NEOShadePlatform(log, config, api) {

	// if(!config) return([]);

	this.log = log;
    this.config = config;
	
	console.log("config:" + JSON.stringify(this.config) );


	globals.log = log; 
	globals.platformConfig = config; // Platform variables from config.json:  platform, name, host, temperatureScale, lightbulbs, thermostats, events, accessories
	globals.api = api; // _accessories, _platforms, _configurableAccessories, _dynamicPlatforms, version, serverVersion, user, hap, hapLegacyTypes,platformAccessory,_events, _eventsCount
}


NEOShadePlatform.prototype = 
{
    accessories: function (callback) 
	{
        var foundAccessories = [];
		var that = this;

		globals.log("Configuring NEOSmartPlatform:");
		for (var currentShade of this.config.shades) {
			// Find the index into the array of all of the HomeSeer devices
		globals.log("Setting up shade with config.json data set to:" + JSON.stringify(currentShade));

				try 
				{
					var accessory = new HomeSeerAccessory(that.log, that.config, currentShade);
				} 
				catch(error) 
				{
					console.log(chalk.red( "** Error ** creating new NEO Smart Shade in file index.js.")); 
					
					throw error
				}	

			foundAccessories.push(accessory);
		} //endfor.

		callback(foundAccessories);
	}
}


function HomeSeerAccessory(log, platformConfig, currentShade) {
    this.config = currentShade;
	this.platformConfig = platformConfig
    this.name = currentShade.name
    this.model = "Not Specified";
	this.uuid_base = currentShade.code;
}

HomeSeerAccessory.prototype = {

    identify: function (callback) {
        callback();
    },

    getServices: function () {
	
        var services = [];

		// The following function sets up the HomeKit 'services' for particular shade and returns them in the array 'services'. 
		setupShadeServices(this, services);
	
        return services;
    }
}


var setupShadeServices = function (that, services)
{
	let Characteristic 	= globals.api.hap.Characteristic;
	let Service 		= globals.api.hap.Service;
	
	// And add a basic Accessory Information service		
	var informationService = new Service.AccessoryInformation();
	informationService
		.setCharacteristic(Characteristic.Manufacturer, "NEO Smart")
		.setCharacteristic(Characteristic.Model, "Roller Shade")
		.setCharacteristic(Characteristic.Name, that.config.name )
		.setCharacteristic(Characteristic.SerialNumber, that.config.code )
	
	var thisService = new Service.WindowCovering()
	
	var currentPosition = thisService.getCharacteristic(Characteristic.CurrentPosition)
	var targetPosition = thisService.getCharacteristic(Characteristic.TargetPosition)
	
	// currentPosition.setProps({validValues: [0, 50, 100]})
	// targetPosition.setProps({validValues:[0, 50, 100]})	
	currentPosition.value = 50;
	targetPosition.value = 50;
	
		
	var upURL = new URL (that.platformConfig.host);	
		upURL.port = 8838;
		upURL.pathname = "neo/v1/transmit";
		upURL.searchParams.set("command", that.config.code + "-up")
		upURL.searchParams.append("id", that.platformConfig.controllerID)
		// upURL.searchParams.append("hash", "1234567");
		
	var downURL = new URL (that.platformConfig.host);	
		downURL.port = 8838;
		downURL.pathname = "neo/v1/transmit";
		downURL.searchParams.set("command", that.config.code + "-dn")
		downURL.searchParams.append("id", that.platformConfig.controllerID)
		// downURL.searchParams.append("hash", "1234567");	
	
	
	targetPosition
			.on('set', function(value, callback, context)
			{
	
				switch(value)
				{
					case 0: // Close the Shade!
					{
						var hashValue = Date.now().toString().slice(-7);
						
						downURL.searchParams.append("hash", hashValue )
						
							var send = ShadeControl.send(downURL)
							setTimeout( function(){
								targetPosition.updateValue(50);
								currentPosition.updateValue(50)
							}, 20000);

						break;
					}
					case 100: // Open the shade
					{
						var hashValue = Date.now().toString().slice(-7);
						upURL.searchParams.append("hash", hashValue )
						
							var send = ShadeControl.send(upURL)
							// NEO controller doesn't detect actual position, reset shade after 20 seconds to show the user the shade is at half-position - i.e., neither up or down!
							setTimeout( function(){
								targetPosition.updateValue(50);
								currentPosition.updateValue(50)
							}, 20000);

						break;
					}
					default:
					{
						// Do nothing if a value 1-49, or 51-99 is selected!
						console.log(chalk.red("*Debug* - You must slide window covering all the way up or down for anything to happen!"));
					}
				}

				callback(null);

			} );		

	services.push(thisService);
	services.push(informationService);
			
}

module.exports.platform = NEOShadePlatform;

////////////////////    End of Polling HomeSeer Code    /////////////////////////////		


