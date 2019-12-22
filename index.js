'use strict';
var net = require('net');
var promiseHTTP = require("request-promise-native");
var chalk = require("chalk");
			

var exports = module.exports;
var globals = [];																																	
module.exports.globals = globals;

var Accessory, Service, Characteristic, UUIDGen;

var lastSent = new Date();
	

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
		globals.log("currentShade is:" + JSON.stringify(currentShade));

				try 
				{
					var accessory = new HomeSeerAccessory(that.log, that.config, currentShade);
				} catch(error) 
					{
					console.log(chalk.red( "** Error ** creating new NEO Smart Shade in file index.js.")); 
					
					throw error
				}	

				
			foundAccessories.push(accessory);
		} //endfor.
		
		globals.log("Executing Callback");

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

		// The following function gets all the services for a device and returns them in the array 'services' 
		setupShadeServices(this, services);
	
        return services;
    }
}


var setupShadeServices = function (that, services)
{
			globals.log(chalk.red("Called setupShadeServices"));


	let Characteristic 	= globals.api.hap.Characteristic;
	let Service 		= globals.api.hap.Service;

	
	// And add a basic Accessory Information service		
	var informationService = new Service.AccessoryInformation();
	informationService
		.setCharacteristic(Characteristic.Manufacturer, "NEO Smart")
		.setCharacteristic(Characteristic.Model, "Roller Shade")
		.setCharacteristic(Characteristic.Name, that.config.name )
		.setCharacteristic(Characteristic.SerialNumber, Math.round((Math.random() * 1000000) )); //  For now, generate a random serial number!
	
	var thisService = new Service.WindowCovering()
	
	var currentPosition = thisService.getCharacteristic(Characteristic.CurrentPosition)
	var targetPosition = thisService.getCharacteristic(Characteristic.TargetPosition)
	
	currentPosition.setProps({maxValue:2})
	targetPosition.setProps({maxValue:2})	
	currentPosition.value = 1;
	targetPosition.value = 1;
	
		
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
				var now = new Date()
				var timeSinceLastTransmit = now.getTime() - lastSent.getTime();
				console.log(chalk.red("*Debug* - Time Since Last Transmit is: " + timeSinceLastTransmit));
				if (timeSinceLastTransmit < 500) 
				{
					console.log(chalk.red("*Warning* - transmitting too fast. This plugin is still under development and a future update will include code to limit sending rate to no more than one transmit per 500 milliseconds. For now, plugin will attempt to complete action!"));
				}
				lastSent = new Date();
	
				switch(value)
				{
					case 0: // Close the Shade!
					{
						
							var send = promiseHTTP({uri:downURL.href})
							.then( function(result) 
								{
									// Movement takes about 15 seconds, so after that, tell HomeKit the currentPosition is now 'down'
									setTimeout( function(){
										currentPosition.updateValue(0)
									}, 15000);
								}
							)
							.catch(function(error) 
								{
									globals.log(chalk.red("*error* - Closing Shade - Error value is : " + error));
								}
							)
							.finally( ()=>
								{
								// NEO controller doesn't detect actual position, reset shade after 20 seconds to show the user the shade is at half-position - i.e., neither up or down!
										setTimeout( function(){
										targetPosition.updateValue(1);
										currentPosition.updateValue(1)
									}, 20000);
								}
							)
							
							
						break;
					}
					case 1:
					{
						break;
					}
					case 2: // Open the shade
					{
							var send = promiseHTTP({uri:upURL.href})
							.then( function(result) 
								{
									// Movement takes about 15 seconds, so after that, tell HomeKit the currentPosition is now 'up'
									setTimeout( function(){
										currentPosition.updateValue(2)
									}, 15000);
								}
							)
							.catch(function(error) 
								{
									globals.log(chalk.red("*error* - Opening Shade - Error value is : " + error));
								}
							)
							.finally( ()=>
								{
									// NEO controller doesn't detect actual position, reset shade after 20 seconds to show the user the shade is at half-position - i.e., neither up or down!
										setTimeout( function(){
										targetPosition.updateValue(1);
										currentPosition.updateValue(1)
									}, 20000);
								}
							)
						break;
					}
					default:
					{
					}
				}

				callback(null);

			} );		

	services.push(thisService);
	services.push(informationService);
			
}

module.exports.platform = NEOShadePlatform;

////////////////////    End of Polling HomeSeer Code    /////////////////////////////		


