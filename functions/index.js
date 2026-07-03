const admin = require("firebase-admin");
admin.initializeApp();

exports.onDriverAssigned = require("./src/onDriverAssigned").onDriverAssigned;
exports.onPickupSubmitted = require("./src/onPickupSubmitted").onPickupSubmitted;
exports.verifyPin = require("./src/verifyPin").verifyPin;
exports.checkVehicleArrival = require("./src/verifyPin").checkVehicleArrival;
exports.completeUnloading = require("./src/verifyPin").completeUnloading;
exports.expireOldPins = require("./src/expireOldPins").expireOldPins;
exports.onSaleLogged = require("./src/onSaleLogged").onSaleLogged;
