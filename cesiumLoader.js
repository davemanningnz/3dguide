/*global require*/
require({
    baseUrl : '../cesium/Source'
}, [
        'Cesium'
    ], function(Cesium) {
        window.Cesium = Cesium;
        angular.bootstrap(document, ['guideApp']);
});