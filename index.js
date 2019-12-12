'use strict';
var net = require('net');
var promiseHTTP = require("request-promise-native");
var chalk = require("chalk");
			

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
		for (var currentAccessory of this.config.accessories) {
			// Find the index into the array of all of the HomeSeer devices
		globals.log("CurrentAccessory is:" + currentAccessory);

				try 
				{
					var accessory = new HomeSeerAccessory(that.log, that.config, currentAccessory);
				} catch(error) 
					{
					let err = chalk.red( "** Error ** creating new NEO Smart Shade in file index.js."); 
					
					throw err
				}			
			foundAccessories.push(accessory);
		} //endfor.
		
		globals.log("Executing Callback");

		callback(foundAccessories);
	}
}




function HomeSeerAccessory(log, platformConfig, accessoryConfig) {
    this.config = accessoryConfig;

    this.name = accessoryConfig.name
    this.model = "Not Specified";
    
	this.uuid_base = Math.round (Math.random() * 1000);
	


}




HomeSeerAccessory.prototype = {

    identify: function (callback) {
        callback();
    },

    getServices: function () {
		
		globals.log(chalk.red("Called HomeSeerAccessory.prototype"));
				
				
        var services = [];

		// The following function gets all the services for a device and returns them in the array 'services' 
		// and also populates the 'globals.statusObjects' array with the Characteristics that need to be updated
		// when polling HomeSeer
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
	
	thisService.getCharacteristic(Characteristic.CurrentPosition).setProps({maxValue:2})
	thisService.getCharacteristic(Characteristic.TargetPosition).setProps({maxValue:2})	
		
	
	thisService.getCharacteristic(Characteristic.TargetPosition)
			.on('set', function(value, callback, context)
			{
				globals.log(chalk.yellow("*Debug* - TargetPosition value is : " + value));
				
				callback(null);

			} );		

	services.push(thisService);
	services.push(informationService);
			
}

			

module.exports.platform = NEOShadePlatform;

////////////////////    End of Polling HomeSeer Code    /////////////////////////////		


