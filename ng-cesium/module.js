(function () {

    var module = angular.module('ngCesium', []);

    module.directive('ngCesiumViewer', function () {

        return {
            scope: {
                viewer: '=',
                onClick: '&'
            },
            link: function(scope, element, attrs) {
                var viewerFactory = Cesium.Viewer;

                var viewer = new viewerFactory(element[0],{
                    imageryProvider : new Cesium.UrlTemplateImageryProvider({
                        url: 'http://{s}/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}&s=Ga',
                        subdomains: ['mt0.google.com', 'mt1.google.com']
                        //url : 'https://{s}/cycle/{z}/{x}/{y}.png',
                        //subdomains: ['a.tile.thunderforest.com', 'b.tile.thunderforest.com', 'c.tile.thunderforest.com']
                    }),
                    baseLayerPicker: false
                });
                var cesiumTerrainProviderMeshes = new Cesium.CesiumTerrainProvider({
                    url : '//assets.agi.com/stk-terrain/world',
                    requestVertexNormals : true
                });
                viewer.terrainProvider = cesiumTerrainProviderMeshes;
                
                scope.viewer = viewer;

                var scene = viewer.scene;

                // Mouse over the globe to see the cartographic position
                handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
                handler.setInputAction(function (click) {
                    var result = {};
                    
                    var pickRay = viewer.camera.getPickRay(click.position);
                    var cartesian = viewer.scene.globe.pick(pickRay, viewer.scene, result);                  

                    if (cartesian) {
                        scope.$apply(function () { scope.onClick({ cartesian: cartesian, normal: result.norm }) });                        
                    } 
                }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
            }
       
        }

    });

    function pickGlobe(scene, windowPosition) {
        var pickRay = scene.camera.getPickRay(windowPosition);
        var cartesian = scene.globe.pick(pickRay, scene);

        return cartesian;
    }

})();