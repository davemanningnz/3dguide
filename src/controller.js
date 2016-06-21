(function () {

    var module = angular.module('guideApp', ['ngCesium']);

    module.controller('mainController', function () {
        var vm = this;
        var path;
        var filledPath;
        var points = [];   
        
        var report = new avyReport();

        vm.angle = 0;
        vm.showGaribaldi = showGaribaldi;
        vm.testPath = testPath;
        vm.viewerClicked = function (cartesian, normal) {
            var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            vm.longitude = Cesium.Math.toDegrees(cartographic.longitude).toFixed(8);
            vm.latitude = Cesium.Math.toDegrees(cartographic.latitude).toFixed(8);
            vm.height = cartographic.height;

            vm.angle = Cesium.Cartesian3.angleBetween(cartesian, normal) * 180.0 / Math.PI;
           
            var normMag = Cesium.Cartesian3.magnitudeSquared(cartesian);
            var onSurface = Cesium.Cartesian3.subtract(normal, Cesium.Cartesian3.multiplyByScalar(cartesian, (Cesium.Cartesian3.dot(cartesian, normal) / normMag), new Cesium.Cartesian3()), new Cesium.Cartesian3());
            var north = Cesium.Cartesian3.fromElements(0, 0, 1);
            var surfaceNorth = Cesium.Cartesian3.subtract(north, Cesium.Cartesian3.multiplyByScalar(cartesian, (Cesium.Cartesian3.dot(north, cartesian) / normMag), new Cesium.Cartesian3()), new Cesium.Cartesian3());
            
            var directtion = Cesium.Cartesian3.dot(Cesium.Cartesian3.cross(onSurface, surfaceNorth, new Cesium.Cartesian3()), cartesian);
            var angle = Cesium.Cartesian3.angleBetween(surfaceNorth, onSurface) * 180.0 / Math.PI;
            vm.aspect = directtion > 0 ? angle : -angle;

            extendPath(cartesian, normal);
        }

        function addPoint(cartesian) {
            vm.viewer.entities.add({
                position : cartesian,
                point : {
                    pixelSize : 5,
                    color : Cesium.Color.RED,
                    outlineColor : Cesium.Color.WHITE,
                    outlineWidth : 2
                }
            })
        }

        function createPath(polyline) {
            var colorLookup = [
                Cesium.Color.GREEN,
                Cesium.Color.YELLOW,
                Cesium.Color.ORANGE,
                Cesium.Color.RED,
                Cesium.Color.BLACK
            ];

            var colors = [];
            var positions = [];
            for (var i = 0; i < polyline.length; i++) {
                positions.push(polyline[i]);
                colors.push(Cesium.Color.fromAlpha(Cesium.Color.YELLOW, 0.25));
            }            
            
            if (polyline.length > 0) {
                var primitive = new Cesium.Primitive({
                    geometryInstances : new Cesium.GeometryInstance({
                        geometry : new Cesium.PolylineGeometry({
                            positions : positions,
                            width : 5,
                            vertexFormat : Cesium.PolylineColorAppearance.VERTEX_FORMAT,
                            colors : colors,
                            colorsPerVertex : true
                        })
                    }),
                    appearance : new Cesium.PolylineColorAppearance()
                })
                
                vm.viewer.scene.primitives.add(primitive);
                
                return primitive;
            }
        }

        function extendPath(cartesian, normal) {
            if (points.length == 0) {
                points.push(cartesian);
                return;
            }
            
            var lastPoint = points[points.length - 1];
            var origin = vm.viewer.camera.position;
            
            var rayA = new Cesium.Ray(origin, Cesium.Cartesian3.subtract(cartesian, origin, new Cesium.Cartesian3()));
            var rayB = new Cesium.Ray(origin, Cesium.Cartesian3.subtract(lastPoint, origin, new Cesium.Cartesian3()));

            var tiles = vm.viewer.scene.globe.fillPath(
                rayA
                , rayB
                , vm.viewer.scene
            );

            points.push(cartesian);

            //points = points.concat(path.map(function(point) { return { position: point, danger: report.evaluate(point, normal) }}));

            if (path) {
                vm.viewer.scene.primitives.remove(path);
            }
            if (filledPath) {
                vm.viewer.scene.primitives.remove(filledPath);
            }

            //filledPath = createPath(fill); 
            path = createPath(points);

            //vm.fill = fill.map(function(c){ return Cesium.Cartographic.fromCartesian(c) });

            for (var tileIndex = 0; tileIndex < tiles.length; tileIndex++){

                var tileColour = Cesium.Color.fromRandom({alpha: 1.0});

                var sections = tiles[tileIndex];
                
                for (var sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
                    var cur = sections[sectionIndex];
                    if (cur) {
                        vm.viewer.entities.add(
                        {
                            polyline : {
                                positions : cur,
                                width : 15,
                                material : new Cesium.PolylineArrowMaterialProperty(tileColour)
                            }
                        });
                    }
                }

            }
        }

        function avyReport(){
            
            var data = [
                [0,0,0,0,0,0,0,0],
                [0, 0, 1, 1, 1, 1, 0, 0],
                [0, 1, 1, 2, 2, 1, 1, 0],
            ]

            this.evaluate = function (cartesian, norm) {
                var elevation = Cesium.Cartographic.fromCartesian(cartesian).height;
                var elevationBand;
                if (elevation < 1500) {
                    elevationBand = data[0];
                } else if (elevation < 2000) {
                    elevationBand = data[1];
                } else {
                    elevationBand = data[2];
                }

                var aspectBand;
                var aspect = calculateAspect(cartesian, norm);
                if (aspect < 0) {
                    aspect = aspect + 360;
                }
                aspect = aspect + 22.5;
                if (aspect >= 360) {
                    aspect = aspect - 360;
                }
                var aspectBand = Math.floor((aspect ) / 45);
                                
                return elevationBand[aspectBand];
            }

            function calculateAspect(cartesian, normal) {
                var normMag = Cesium.Cartesian3.magnitudeSquared(cartesian);
                var onSurface = Cesium.Cartesian3.subtract(normal, Cesium.Cartesian3.multiplyByScalar(cartesian, (Cesium.Cartesian3.dot(cartesian, normal) / normMag), new Cesium.Cartesian3()), new Cesium.Cartesian3());
                var north = Cesium.Cartesian3.fromElements(0, 0, 1);
                var surfaceNorth = Cesium.Cartesian3.subtract(north, Cesium.Cartesian3.multiplyByScalar(cartesian, (Cesium.Cartesian3.dot(north, cartesian) / normMag), new Cesium.Cartesian3()), new Cesium.Cartesian3());
                
                var directtion = Cesium.Cartesian3.dot(Cesium.Cartesian3.cross(onSurface, surfaceNorth, new Cesium.Cartesian3()), cartesian);
                var angle = Cesium.Cartesian3.angleBetween(surfaceNorth, onSurface) * 180.0 / Math.PI;
                var aspect = directtion > 0 ? angle : -angle;

                return aspect;
            }

            return this;
        }
        
        function showGaribaldi(){
            
            vm.viewer.camera.setView({
                destination : Cesium.Rectangle.fromDegrees(-123.1, 49.8, -122.9, 49.9)
            });
                    
        }
        
        function testPath(){
            extendPath(Cesium.Cartesian3.fromDegrees(-123.01170273, 49.88335161))
            extendPath(Cesium.Cartesian3.fromDegrees(-123.00556561, 49.85082148))
        }
        
    });

})();