'use strict';
var net = require('net');
var promiseHTTP = require("request-promise-native");
var chalk = require("chalk");
var green = chalk.green.bold;
var red = chalk.red.bold;
var yellow = chalk.yellow.bold;
var cyan = chalk.cyan.bold;
var magenta = chalk.magenta.bold;
		

var exports = module.exports;
var globals = []
globals.log = console.log;
																																		
module.exports.globals = globals;

module.exports = function (homebridge) {
    console.log("homebridge API version: " + homebridge.version);

    // Accessory must be created from PlatformAccessory Constructor
    Accessory = homebridge.platformAccessory;

    // Service and Characteristic are from hap-nodejs
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    // For platform plugin to be considered as dynamic platform plugin,
    // registerPlatform(pluginName, platformName, constructor, dynamic), dynamic must be true
    homebridge.registerPlatform("homebridge-NEOSmartPlatform", "NEOSmart", NEOSmartPlatform, true);
}

function NEOSmartPlatform(log, config, api) {

	if(!config) return([]);

	this.log = log;
    this.config = config;

		globals.log = log; 
		globals.platformConfig = config; // Platform variables from config.json
		
		globals.api = api; // _accessories, _platforms, _configurableAccessories, _dynamicPlatforms, version, serverVersion, user, hap, hapLegacyTypes,platformAccessory,_events, _eventsCount
}


NEOSmartPlatform.prototype = 
{
    accessories: function (callback) 
	{
        var foundAccessories = [];
		var that = this;

		globals.log("Configuring NEOSmartPlatform");
		for (var currentAccessory of globals.platformConfig.accessories) {
			// Find the index into the array of all of the HomeSeer devices

				try 
				{
					var accessory = new NEOSmartAccessory(that.log, that.config, currentAccessory, thisDevice);
				} catch(err) 
					{
					let err = red( "** Error ** creating new NEO Smart Shade in file index.js."); 
					
					throw err
				}			
			foundAccessories.push(accessory);
		} //endfor.
		callback(foundAccessories);
	}
}


function NEOSmartAccessory(log, platformConfig, currentAccessoryConfig, status) {
    this.config = currentAccessoryConfig;
    
	this.uuid_base = this.config.uuid_base;

    var that = this; // May be unused?

}

NEOSmartAccessory.prototype = {

    identify: function (callback) {
        callback();
    },

    getServices: function () {
				
        var services = [];

		// The following function gets all the services for a device and returns them in the array 'services' 
		// and also populates the 'globals.statusObjects' array with the Characteristics that need to be updated
		// when polling HomeSeer
		setupShadeServices(this, services);
	
        return services;
    }
}

setupShadeServices = function (that, services)
{

	let Characteristic 	= globals.api.hap.Characteristic;
	let Service 		= globals.api.hap.Service;

	
	// And add a basic Accessory Information service		
	var informationService = new Service.AccessoryInformation();
	informationService
		.setCharacteristic(Characteristic.Manufacturer, "NEO Smart")
		.setCharacteristic(Characteristic.Model, "Roller Shade")
		.setCharacteristic(Characteristic.Name, that.config.name )
		.setCharacteristic(Characteristic.SerialNumber, Math.round((Math.random() * 1000000) )); //  For now, generate a random serial number!
	
	thisService = new Service.WindowCovering()
	
	thisService.getCharacteristic(Characteristic.CurrentPosition).setProps({maxValue:2})
	thisService.getCharacteristic(Characteristic.TargetPosition).setProps({maxValue:2})	
		
	
	thisService.getCharacteristic(Characteristic.TargetPosition)
			.on('set', function(value, callback, context)
			{
				globals.log(yellow("*Debug* - TargetPosition value is : " + value));
				
				callback(null);

			} );		

	services.push(thisService);
	services.push(informationService);
			
}




