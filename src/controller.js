(function () {

    var module = angular.module('guideApp', ['ngCesium']);

    module.controller('mainController', function () {
        var vm = this;
        var path;
        var filledPath;
        var currentRouteSource;
        var points = [];  
        var pathSections = []; 
        
        var report = new avyReport();

        vm.angle = 0;
        vm.showGaribaldi = showGaribaldi;
        vm.testPath = testPath;
        vm.newRouteClicked = onNewRouteClicked;
        vm.diverageOverlayClicked = onDiverageOverlayClicked;

        vm.viewerClicked = function (cartesian, normal) {
            var point = {position: cartesian, normal: normal};
            setPointInfo(point);
            
            if (vm.state === 'editRoute') {
                vm.currentRoute.addPoint(vm.viewer.camera.position, point);
                displayCurrentRoute();
            }
        }       

        function setPointInfo(point) {
            vm.lastClick = {
                hpr: getHeadingPitchRoll(point),
                cartographicPosition: toCartographic(point)
            };
        }

        function toCartographic(point) {
            var cartographic = Cesium.Cartographic.fromCartesian(point.position);
            return {
                longitude: Cesium.Math.toDegrees(cartographic.longitude).toFixed(8),
                latitude: Cesium.Math.toDegrees(cartographic.latitude).toFixed(8),
                height: cartographic.height
            }
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

        function onNewRouteClicked(){
            var route = createRoute();
            vm.state = 'editRoute';
            vm.currentRoute = route;
        }

        function onDiverageOverlayClicked() {
            var diverageArray = vm.viewer.scene.globe.diverganceOverlay();

            vm.viewer.scene.primitives.add(new Cesium.Primitive({
                geometryInstances : diverageArray.map(function(node){ 
                    var intensity = node.divergance;
                    intensity = intensity > 1 ? 1 : intensity;
                    intensity = intensity < -1 ? -1 : intensity;
                    return new Cesium.GeometryInstance({
                        geometry : new Cesium.CircleGeometry({
                            center : node.position,
                            height: Cesium.Cartographic.fromCartesian(node.position).height,
                            radius : 10
                        }) 
                        , attributes : {
                            color : intensity > 0 ? new Cesium.ColorGeometryInstanceAttribute(1.0, 0.0, 0.0, intensity) : new Cesium.ColorGeometryInstanceAttribute(0.0, 0.0, 1.0, intensity)
                        }
                    })
                })
                , appearance: new Cesium.PerInstanceColorAppearance()
            }));
        }

        function createRoute() {
            function Route() {
                this._points = []; 
            }
            Route.prototype.addPoint = function (origin, point) {

                if (this._points.length > 0) {

                    vm.viewer.entities.add(
                        {
                            polyline : {
                                positions : [point.position, this._points[this._points.length - 1].position],
                                width : 15,
                                material : new Cesium.PolylineArrowMaterialProperty(Cesium.Color.RED)
                            }
                        });

                    var tiles = vm.viewer.scene.globe.fillPath(
                        origin
                        , this._points[this._points.length - 1]
                        , point
                        , vm.viewer.scene
                    );

                    this._points = this._points.concat(tiles[0][0]);
                } else {
                    this._points.push(point);
                }
            }
            Route.prototype.toJson = function (){
                var geoJson = { 
                    "type": "FeatureCollection",
                    "features": []
                }

                if (this._points.length > 1) {
                    geoJson.features.push({ 
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": this._points.map(function(point) { 
                                var cart = Cesium.Cartographic.fromCartesian(point.position) 
                                return [ Cesium.Math.toDegrees(cart.longitude), Cesium.Math.toDegrees(cart.latitude), cart.height ];
                            })
                        }
                    });
                }

                return geoJson;
            }

            return new Route();
        }

        function displayCurrentRoute() {
            vm.currentRoute.stats = getSkiStats(vm.currentRoute);
            var geoJson = vm.currentRoute.toJson();
            if (currentRouteSource === undefined) {
                 
                 Cesium.GeoJsonDataSource.load(
                    geoJson
                    , {
                        stroke: Cesium.Color.HOTPINK,
                        fill: Cesium.Color.PINK,
                        strokeWidth: 3,
                        markerSymbol: '?'
                    }).then(function(dataSource){
                        currentRouteSource = dataSource;
                        vm.viewer.dataSources.add(currentRouteSource);
                    });
               
            } else {
                currentRouteSource.load(geoJson);
            } 
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
                positions.push(polyline[i].position);
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
            var surfacePoint = { position: cartesian, normal: normal };

            if (points.length == 0) {
                points.push(surfacePoint);
                return;
            }
            
            var lastPoint = points[points.length - 1];
            var origin = vm.viewer.camera.position;
            
            var tiles = vm.viewer.scene.globe.fillPath(
                origin
                , lastPoint
                , surfacePoint
                , vm.viewer.scene
            );

            points.push(surfacePoint);

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
                        pathSections.push(cur);
                        vm.viewer.entities.add(
                        {
                            polyline : {
                                positions : cur.map(function(point){return point.position}),
                                width : 15,
                                material : new Cesium.PolylineArrowMaterialProperty(tileColour)
                            }
                        });
                    }
                }

            }

            vm.pathDistance = pathSections.reduce(function(previous, current){
                return previous + current.reduce(function(prevSum, curPoint, pointIndex, array){
                    if (pointIndex > 0){
                        return prevSum + Cesium.Cartesian3.distance(curPoint.position, array[pointIndex - 1].position);
                    }
                    return prevSum + 0;
                }, 0);
            }, 0);
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
        
        function getSkiStats(route) {

            var path = route._points;
            var stats = {};

            if (path.length < 2) {
                return stats;
            }

            var cartopgraphicPath = path.map(function(point){ return Cesium.Cartographic.fromCartesian(point.position)});
            var slopes = path.map(function(point) {return getHeadingPitchRoll(point)});

            var sortedPitch = slopes.map(function(slope) {return -slope.pitch}).sort(function(a, b) { return a < b });
            stats.pitch = sortedPitch[Math.floor((9 * sortedPitch.length) / 10)];

            var prev = cartopgraphicPath[0];
            stats.descent = 0;
            stats.ascent = 0;
            stats.distance = 0;
            for (var i = 1; i < cartopgraphicPath.length; i++) {
                var deltaH = cartopgraphicPath[i].height - prev.height; 
                if (deltaH > 0) {
                    stats.ascent += deltaH;
                } else {
                    stats.descent -= deltaH;
                }
                stats.distance += Cesium.Cartesian3.distance(path[i].position, path[i - 1].position);

                prev = cartopgraphicPath[i];
            }

            return stats;
        }

        function getHeadingPitchRoll(surfacePoint, down){
            var transform = Cesium.Transforms.eastNorthUpToFixedFrame(surfacePoint.position);
            var invTransform = new Cesium.Matrix4();
            Cesium.Matrix4.inverseTransformation(transform, invTransform);
            var localNorm = Cesium.Matrix4.multiplyByPointAsVector(invTransform, surfacePoint.normal, new Cesium.Cartesian3());
            var gradH = new Cesium.Cartesian3(localNorm.x, localNorm.y, -(localNorm.x * localNorm.x + localNorm.y * localNorm.y) / localNorm.z);
            var direction = new Cesium.Cartesian3();
            Cesium.Cartesian3.normalize(gradH, direction);
            if (down) {
                Cesium.Matrix4.multiplyByPointAsVector(transform, direction, down);
            }
            return {
                heading: getHeading(direction, localNorm) * 180.0 / Math.PI
                , pitch: getPitch(direction) * 180.0 / Math.PI
                , roll: getRoll(direction, localNorm, Cesium.Cartesian3.cross(direction, localNorm, new Cesium.Cartesian3())) * 180.0 / Math.PI
            }
        }

        function getHeading(direction, up) {
            var heading;
            if (!Cesium.Math.equalsEpsilon(Math.abs(direction.z), 1.0, Cesium.Math.EPSILON3)) {
                heading = Math.atan2(direction.y, direction.x) - Cesium.Math.PI_OVER_TWO;
            } else {
                heading = Math.atan2(up.y, up.x) - Cesium.Math.PI_OVER_TWO;
            }

            return Cesium.Math.TWO_PI - Cesium.Math.zeroToTwoPi(heading);
        }

        function getPitch(direction) {
            return Cesium.Math.PI_OVER_TWO - Cesium.Math.acosClamped(direction.z);
        }

        function getRoll(direction, up, right) {
            var roll = 0.0;
            if (!Cesium.Math.equalsEpsilon(Math.abs(direction.z), 1.0, Cesium.Math.EPSILON3)) {
                roll = Math.atan2(-right.z, up.z);
                roll = Cesium.Math.zeroToTwoPi(roll + Cesium.Math.TWO_PI);
            }

            return roll;
        }

    });

})();