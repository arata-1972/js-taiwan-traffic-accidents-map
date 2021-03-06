var sidebar = new ol.control.Sidebar({
    element: 'sidebar',
    position: 'right'
});
var jsonFiles, filesLength, fileKey = 0;

var projection = ol.proj.get('EPSG:3857');
var projectionExtent = projection.getExtent();
var size = ol.extent.getWidth(projectionExtent) / 256;
var resolutions = new Array(20);
var matrixIds = new Array(20);
for (var z = 0; z < 20; ++z) {
    // generate resolutions and matrixIds arrays for this WMTS
    resolutions[z] = size / Math.pow(2, z);
    matrixIds[z] = z;
}

var sidebarTitle = document.getElementById('sidebarTitle');
var content = document.getElementById('sidebarContent');

var appView = new ol.View({
    center: ol.proj.fromLonLat([120.221507, 23.000694]),
    zoom: 14
});

var vectorPoints = new ol.layer.Vector({
    source: new ol.source.Vector({
        format: new ol.format.GeoJSON({
            featureProjection: appView.getProjection()
        })
    }),
    style: pointStyleFunction
});

var baseLayer = new ol.layer.Tile({
    source: new ol.source.WMTS({
        matrixSet: 'EPSG:3857',
        format: 'image/png',
        url: 'https://wmts.nlsc.gov.tw/wmts',
        layer: 'EMAP',
        tileGrid: new ol.tilegrid.WMTS({
            origin: ol.extent.getTopLeft(projectionExtent),
            resolutions: resolutions,
            matrixIds: matrixIds
        }),
        style: 'default',
        wrapX: true,
        attributions: '<a href="http://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
    }),
    opacity: 0.8
});

var map = new ol.Map({
    layers: [baseLayer, vectorPoints],
    target: 'map',
    view: appView
});

map.addControl(sidebar);
var pointClicked = false;
map.on('singleclick', function(evt) {
    pointClicked = false;
    map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
        if (false === pointClicked) {
            firstPosDone = true;
            var p = feature.getProperties();
            currentFeature = feature;
            vectorPoints.getSource().refresh();

            appView.setCenter(feature.getGeometry().getCoordinates());
            appView.setZoom(15);
            var lonLat = ol.proj.toLonLat(p.geometry.getCoordinates());
            var message = '<table class="table table-dark">';
            message += '<tbody>';
            message += '<tr><th scope="row" style="width: 100px;">類型</th><td>';
            message += p.type;
            message += '</td></tr>';
            message += '<tr><th scope="row">發生時間</th><td>' + p.time + '</td></tr>';
            message += '<tr><th scope="row">發生地點</th><td>' + p.location + '</td></tr>';
            message += '<tr><th scope="row">死亡受傷人數</th><td>' + p.casualties + '</td></tr>';
            message += '<tr><th scope="row">車種</th><td>' + p.units + '</td></tr>';
            message += '<tr><td colspan="2">';
            message += '<hr /><div class="btn-group-vertical" role="group" style="width: 100%;">';
            message += '<a href="https://www.google.com/maps/dir/?api=1&destination=' + lonLat[1] + ',' + lonLat[0] + '&travelmode=driving" target="_blank" class="btn btn-info btn-lg btn-block">Google 導航</a>';
            message += '<a href="https://wego.here.com/directions/drive/mylocation/' + lonLat[1] + ',' + lonLat[0] + '" target="_blank" class="btn btn-info btn-lg btn-block">Here WeGo 導航</a>';
            message += '<a href="https://bing.com/maps/default.aspx?rtp=~pos.' + lonLat[1] + '_' + lonLat[0] + '" target="_blank" class="btn btn-info btn-lg btn-block">Bing 導航</a>';
            message += '</div></td></tr>';
            message += '</tbody></table>';
            sidebarTitle.innerHTML = p.type;
            content.innerHTML = message;
            sidebar.open('home');

            pointClicked = true;
        }
    });
});

function pointStyleFunction(f) {
    var p = f.getProperties(),
        color, stroke, radius, pointCount;
    if (f === currentFeature) {
        stroke = new ol.style.Stroke({
            color: '#000',
            width: 5
        });
        radius = 25;
    } else {
        stroke = new ol.style.Stroke({
            color: '#fff',
            width: 2
        });
        if (p.type === 'a1') {
            radius = 15;
        } else {
            radius = 8;
        }
    }
    if (p.type === 'a1') {
        pointCount = 5;
        color = '#ff0000';
    } else {
        pointCount = 3;
        color = '#cccc00';
    }

    return new ol.style.Style({
        image: new ol.style.RegularShape({
            radius: radius,
            points: pointCount,
            fill: new ol.style.Fill({
                color: color
            }),
            stroke: stroke
        })
    })
}

var currentFeature = false;

var geolocation = new ol.Geolocation({
    projection: appView.getProjection()
});

geolocation.setTracking(true);

geolocation.on('error', function(error) {
    console.log(error.message);
});

var positionFeature = new ol.Feature();

positionFeature.setStyle(new ol.style.Style({
    image: new ol.style.Circle({
        radius: 6,
        fill: new ol.style.Fill({
            color: '#3399CC'
        }),
        stroke: new ol.style.Stroke({
            color: '#fff',
            width: 2
        })
    })
}));

var firstPosDone = false;
geolocation.on('change:position', function() {
    var coordinates = geolocation.getPosition();
    positionFeature.setGeometry(coordinates ? new ol.geom.Point(coordinates) : null);
    if (false === firstPosDone) {
        appView.setCenter(coordinates);
        firstPosDone = true;
    }
});

new ol.layer.Vector({
    map: map,
    source: new ol.source.Vector({
        features: [positionFeature]
    })
});

$('#btn-geolocation').click(function() {
    var coordinates = geolocation.getPosition();
    if (coordinates) {
        appView.setCenter(coordinates);
    } else {
        alert('目前使用的設備無法提供地理資訊');
    }
    return false;
});

var pointFeatures = [];
$.get('data/a2.csv', {}, function(c) {
    var lines = $.csv.toArrays(c);
    for (k in lines) {
        if (k > 0) {
            var pointFeature = new ol.Feature({
                geometry: new ol.geom.Point(
                    ol.proj.fromLonLat([parseFloat(lines[k][4]), parseFloat(lines[k][5])])
                )
            });
            pointFeature.setProperties({
                type: 'a2',
                time: lines[k][0],
                location: lines[k][1],
                casualties: lines[k][2],
                units: lines[k][3]
            });
            pointFeatures.push(pointFeature);
        }
    }
}).then(function() {
    $.get('data/a1.csv', {}, function(c) {
        var lines = $.csv.toArrays(c);
        for (k in lines) {
            if (k > 0) {
                var pointFeature = new ol.Feature({
                    geometry: new ol.geom.Point(
                        ol.proj.fromLonLat([parseFloat(lines[k][4]), parseFloat(lines[k][5])])
                    )
                });
                pointFeature.setProperties({
                    type: 'a1',
                    time: lines[k][0],
                    location: lines[k][1],
                    casualties: lines[k][2],
                    units: lines[k][3]
                });
                pointFeatures.push(pointFeature);
            }
        }
    }).then(function() {
        var vSource = vectorPoints.getSource();
        vSource.addFeatures(pointFeatures);
    });
});