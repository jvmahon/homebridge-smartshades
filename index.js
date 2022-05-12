'use strict';
var net = require('net');
const pkg = require("./package.json");
const queue = require("queue");

var sendQueue = queue({autostart:true, concurrency:1})
		
var exports = module.exports;
var globals = [];																																
module.exports.globals = globals;

var Accessory, Service, Characteristic, UUIDGen;

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
	this.log = log;
    this.config = config;

	globals.log = log; 
	globals.platformConfig = config; // Platform variables from config.json
	globals.api = api; // _accessories, _platforms, _configurableAccessories, _dynamicPlatforms, version, serverVersion, user, hap, hapLegacyTypes,platformAccessory,_events, _eventsCount
}


NEOShadePlatform.prototype = {
    accessories: async function (callback)  {
        var foundAccessories = [];
		var that = this;

		globals.log("Configuring NEOSmartPlatform:");

		this.config?.shades?.forEach(currentShade => {
			globals.log("Setting up shade with config.json data set to:" + JSON.stringify(currentShade));

			try  {
				var accessory = new NEOShadeAccessory(that.log, that.config, currentShade);
			} catch(error) {
				console.log( "** Error ** creating new NEO Smart Shade in file index.js."); 
				throw error
			}	

			foundAccessories.push(accessory);
		})

		callback(foundAccessories);
	}
}

function NEOShadeAccessory(log, platformConfig, currentShade) {
    this.config = currentShade;
	this.platformConfig = platformConfig
    this.name = currentShade.name
    this.model = currentShade.motorType;
	this.uuid_base = currentShade.code;
}

NEOShadeAccessory.prototype = {

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
	function send(command) {
			function sendfunction(cb) {
				var telnetClient = net.createConnection(8839, that.platformConfig.host, ()=>  {
						telnetClient.write(command +"\r", ()=>  {
								var now = new Date();
								console.log(`Sent Command: ${command} at time: ${now.toLocaleTimeString()}`) 
								setTimeout( ()=> {cb()}, 500);
							});
					});
			}
			sendQueue.push(sendfunction)
		}
	
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
	
	currentPosition.value = 50;
	targetPosition.value = 50;
	
	targetPosition
		.on('set', function(value, callback, context) {
			switch(value) {
				case 0: // Close the Shade!
					send(that.config.code + "-dn!" + (that.config.motorType ? that.config.motorType : "bf") )
					setTimeout( function(){
						targetPosition.updateValue(50);
						currentPosition.updateValue(50)
					}, 25000);
					break;
				case 100: // Open the shade
					send(that.config.code + "-up!" + (that.config.motorType ? that.config.motorType : "bf"))

					// NEO controller doesn't detect actual position, reset shade after 20 seconds to show the user the shade is at half-position - i.e., neither up or down!
					setTimeout( function(){
						targetPosition.updateValue(50);
						currentPosition.updateValue(50)
					}, 25000);
					break;
				default:
					// Do nothing if a value 1-49, or 51-99 is selected!
					console.log("*Debug* - You must slide window covering all the way up or down for anything to happen!");
					break;
			}
			callback(null);
		} );		

	services.push(thisService);
	services.push(informationService);
}

module.exports.platform = NEOShadePlatform;
