(function () {

    var module = angular.module('guideApp', ['ngCesium']);

    module.controller('mainController', function () {
        var vm = this;
        
        vm.angle = 0;

        vm.viewerClicked = function (cartesian, normal) {
            var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            vm.longitude = Cesium.Math.toDegrees(cartographic.longitude).toFixed(2);
            vm.latitude = Cesium.Math.toDegrees(cartographic.latitude).toFixed(2);
            
            vm.angle = Cesium.Cartesian3.angleBetween(cartesian, normal) * 180.0 / Math.PI;
           
            var normMag = Cesium.Cartesian3.magnitudeSquared(cartesian);
            var onSurface = Cesium.Cartesian3.subtract(normal, Cesium.Cartesian3.multiplyByScalar(cartesian, (Cesium.Cartesian3.dot(cartesian, normal) / normMag), new Cesium.Cartesian3()), new Cesium.Cartesian3());
            var north = Cesium.Cartesian3.fromElements(0, 0, 1);
            var surfaceNorth = Cesium.Cartesian3.subtract(north, Cesium.Cartesian3.multiplyByScalar(cartesian, (Cesium.Cartesian3.dot(north, cartesian) / normMag), new Cesium.Cartesian3()), new Cesium.Cartesian3());
            
            var directtion = Cesium.Cartesian3.dot(Cesium.Cartesian3.cross(onSurface, surfaceNorth, new Cesium.Cartesian3()), cartesian);
            var angle = Cesium.Cartesian3.angleBetween(surfaceNorth, onSurface) * 180.0 / Math.PI;
            vm.aspect = directtion > 0 ? angle : -angle;
        }
    });

})();