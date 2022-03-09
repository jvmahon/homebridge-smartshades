# NEOSmartShades

This is a Homebridge plugin for the NEO Smart Shade Controller (See http://neosmartblinds.com/smartcontroller/).

These instructions are in rough draft form, but should be enough to get you started
Linux Installation Instructions to be added!

# Need to Update These Instructions . . .
These instructions are, admittedly, quite outdated and sparse.

An important point is that the plugin now supports config-ui-x for configuration.  Please follow the instructions in settings menu

# I. Installing Homebridge 

For Homebridge installation instructions, please see the Homebridge wiki found here: https://github.com/homebridge/homebridge/wiki


## II. Install Plugin

Once homebridge is installed, you are ready to install your plugins. You should do this from the config-ui-x interface by searching for the plugin "homebridge-smartshades"

Once installed, you should configure the plugin from the config-ui-x interface.
![image](https://user-images.githubusercontent.com/15061942/157542543-fff878d0-d5d2-4625-b8e0-45efeb3a24bb.png)

## III. Operation
This plugin was designed for use with roller shades that have 1-way communication between the NEO controller and the shade. This means that the controller can instruct the shade to open or close, but it cannot track the position of the shade. That is, even though the shade has been instructed to open, another device (such as a hand-held remote) could change the shade position and the controller can't track this. In order to deal with this issue, I've designed the plugin so it is, effectively, stateless. That is, after a shade has been opened or closed from the iOS Home application, the Home application will show the shade as open or closed for about 20 seconds. After that, the shade is pictured as being at the 50% (half-way) position. I thought leaving the shade at 50% after an open or close operation better indicates that the controller does not really know if the shade is up or down.






