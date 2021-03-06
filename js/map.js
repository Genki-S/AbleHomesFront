// This example adds a search box to a map, using the Google Place Autocomplete
// feature. People can enter geographical searches. The search box will return a
// pick list containing a mix of places and predicted search terms.

var _houseList = [];
var _searchMarker = null;
var _markers = [];
var _busAndRamps = [];
var _busAndRampsMarkers = [];
var busAndMarkerVisible = false;

function initAutocomplete() {
  var defaultIcon = {
    url: '/img/apin50.png',
    size: new google.maps.Size(50, 50),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(0, 32)
  };

  var hoverIcon = {
    url: '/img/apin50hover.png',
    size: new google.maps.Size(50, 50),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(0, 32)
  };

  var busIcon = {
    url: '/img/busStopIcon10x10.png',
    size: new google.maps.Size(10, 10),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(0, 32)
  };


  var map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 37.7785190, lng: -122.405640037},
    zoom: 13,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  // Create the search box and link it to the UI element.
  var input = document.getElementById('pac-input');
  var searchBox = new google.maps.places.SearchBox(input);

  var busControlDiv = document.createElement('div');
  var busControl = new BusAndRampsControl(busControlDiv);
  busControlDiv.index = 1;
  map.controls[google.maps.ControlPosition.TOP_CENTER].push(busControlDiv);


  // Bias the SearchBox results towards current map's viewport.
  map.addListener('bounds_changed', function() {
    searchBox.setBounds(map.getBounds());
  });

  map.addListener('idle', function() {
    var bounds = map.getBounds();
    var center = bounds.getCenter();
    var ne = bounds.getNorthEast();
    var radMeter = getDistanceMeter(center, ne);
    // update with retsly data
    $.ajax({
      type: 'GET',
      // url: 'https://rets.io/api/v1/test/listings?access_token=ac9d8bcc0a55c3d603a46c7bb7a0868e',
      url: 'http://localhost:8081/abledhomes/v1/listings',
      dataType: 'json',
      data: {
        near: center.lat() + ',' + center.lng(),
        radius: radMeter / 1000 + 'km',
      }
    }).done (function (res) {
      _houseList = res.bundle;
      houseListUpdatedHandler();
    });

    var sw = bounds.getSouthWest(); // LatLng of the south-west corner
    var NE = [ne.lng(), ne.lat()]; //format for mongo geoQuery [long,lat]
    var SW = [sw.lng(), sw.lat()];
    var box =  {
      NE: NE,
      SW: SW
    };
    //Make AJAX request, send box of bounds to 
    $.ajax({
      type: 'GET',
      url: 'http://localhost:8081/abledhomes/v1/busRamps',
      dataType: 'json',
      data: box,
    }).done (function (res) {
      _busAndRamps = res.ramps;
      busAndRampsUpdatedHandler();
    });
  });

  // [START region_getplaces]
  // Listen for the event fired when the user selects a prediction and retrieve
  // more details for that place.
  searchBox.addListener('places_changed', function() {
    var places = searchBox.getPlaces();

    if (places.length == 0) {
      return;
    }

    // For each place, get the icon, name and location.
    var bounds = new google.maps.LatLngBounds();
    places.forEach(function(place) {
      var icon = {
        url: place.icon,
        size: new google.maps.Size(71, 71),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(17, 34),
        scaledSize: new google.maps.Size(25, 25)
      };

      // Create a marker for each place.
      if (_searchMarker) { _searchMarker.setMap(null); }
      _searchMarker = new google.maps.Marker({
        map: map,
        icon: icon,
        title: place.name,
        position: place.geometry.location
      });

      if (place.geometry.viewport) {
        // Only geocodes have viewport.
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }
    });
    map.fitBounds(bounds);

    // scroll to the results
    $('html,body').animate({
      scrollTop:   $('#search-results').offset().top
    }, 500);
  });

  function houseListUpdatedHandler() {
    // Clear out the old markers.
    _markers.forEach(function(marker) { marker.setMap(null); });
    _markers = [];

    $('#house-list').text('');

    _houseList.forEach(function(house, i) {
      if (!house.accessibilityFeatures) {
        house.accessibilityFeatures = ["NA"];
      }
      console.log(house);

      var lat = house.coordinates[1];
      var lng = house.coordinates[0];

      // Create a marker for each place.
      var marker = new google.maps.Marker({
        map: map,
        icon: defaultIcon,
        title: house.address,
        position: {lat: lat, lng: lng},
      });
      _markers.push(marker);
      google.maps.event.addListener(marker, "mousedown", function() {
        $('#houseDetailModal #houseImage').text('');
        $('#houseDetailModal #houseImage').append(
          '<img src="https://maps.googleapis.com/maps/api/streetview?size=600x400&location=' + lat +',' + lng + '&key=AIzaSyD9zgc6nldepHmG7uY5ZEpakyBHPPz5Fq4">'
        );
        $('#houseAddress').text(house.address);
        $('#accessibilityFeatureList').text('');
        $('#accessibilityFeatureList').append(
          house.accessibilityFeatures.map(function(a) { return '<li>' + a + '</li>'; }).join('')
        );
        $('#saveForComparisonButton').data('house-list-index', i);
        $('#houseDetailModal').modal();
      });

      if (house.ascore > 10) {
        house.ascore = Math.round(house.ascore / 3.5);
      }

      var content = '<li data-house-list-index="' + i + '">' +
        '<img src="https://maps.googleapis.com/maps/api/streetview?size=150x100&location=' + lat +',' + lng + '&key=AIzaSyD9zgc6nldepHmG7uY5ZEpakyBHPPz5Fq4">' +
        '<img class="accessibilityIcon" width="30%" src="/img/accessibility-icon.png">' +
        '<div class="accessibilityScore">' + house.ascore + '</div>' +
        '<div class="accessibilityDescription">Accessibility Score</div>' +
        '</li>';
      $('#house-list').append(content);
    });
  }

  function busAndRampsUpdatedHandler() {
    // Clear out the old markers.
    _busAndRampsMarkers.forEach(function(marker) { marker.setMap(null); });
    _busAndRampsMarkers = [];
    console.log(_busAndRamps);
    _busAndRamps.forEach(function(bus) {
      var marker = new google.maps.Marker({
        map: map,
        icon: busIcon,
        position: {lat: bus.lat, lng: bus.long},
      });
      marker.setVisible(busAndMarkerVisible);
      _busAndRampsMarkers.push(marker);
    });
    console.log(_busAndRampsMarkers);
  }

  $('#house-list').on('mouseenter', 'li', function() {
    var idx = $(this).data('house-list-index');
    _markers[idx].setIcon(hoverIcon);
  });

  $('#house-list').on('mouseleave', 'li', function() {
    var idx = $(this).data('house-list-index');
    _markers[idx].setIcon(defaultIcon);
  });

  $('#house-list').on('click', 'li', function() {
    var idx = $(this).data('house-list-index');
    var lat = _houseList[idx].coordinates[1];
    var lng = _houseList[idx].coordinates[0];

    $('#houseDetailModal #houseImage').text('');
    $('#houseDetailModal #houseImage').append(
      '<img src="https://maps.googleapis.com/maps/api/streetview?size=600x400&location=' + lat +',' + lng + '&key=AIzaSyD9zgc6nldepHmG7uY5ZEpakyBHPPz5Fq4">'
    );
    $('#houseAddress').text(_houseList[idx].address);
    $('#accessibilityFeatureList').text('');
    $('#accessibilityFeatureList').append(
      _houseList[idx].accessibilityFeatures.map(function(a) { return '<li>' + a + '</li>'; }).join('')
    );
    $('#saveForComparisonButton').data('house-list-index', idx);
    $('#houseDetailModal').modal();
  });

  $('#saveForComparisonButton').click(function() {
    var arrStr = localStorage.getItem('comparing-houses') || '[]';
    var arr = JSON.parse(arrStr);
    console.log(arr);
    var idx = $(this).data('house-list-index');
    if (arr.find(function(house) { return house.id == _houseList[idx].id; })) {
    } else {
      arr.push(_houseList[idx]);
    }
    localStorage.setItem('comparing-houses', JSON.stringify(arr));
    $.notify({
      message: 'House Saved!',
    },{
      z_index: 9999,
      delay: 500,
    });
  });
}

var rad = function(x) {
  return x * Math.PI / 180;
};

var getDistanceMeter = function(p1, p2) {
  var R = 6378137; // Earth’s mean radius in meter
  var dLat = rad(p2.lat() - p1.lat());
  var dLong = rad(p2.lng() - p1.lng());
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(p1.lat())) * Math.cos(rad(p2.lat())) *
    Math.sin(dLong / 2) * Math.sin(dLong / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d; // returns the distance in meter
};

function BusAndRampsControl(controlDiv) {

  // Set CSS for the control border.
  var controlUI = document.createElement('div');
  controlUI.style.backgroundColor = '#fff';
  controlUI.style.border = '2px solid #fff';
  controlUI.style.borderRadius = '3px';
  controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
  controlUI.style.cursor = 'pointer';
  controlUI.style.marginBottom = '22px';
  controlUI.style.textAlign = 'center';
  controlUI.title = 'Toggle bus and ramps';
  controlDiv.appendChild(controlUI);

  // Set CSS for the control interior.
  var controlText = document.createElement('div');
  controlText.style.color = 'rgb(25,25,25)';
  controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
  controlText.style.fontSize = '16px';
  controlText.style.lineHeight = '38px';
  controlText.style.paddingLeft = '5px';
  controlText.style.paddingRight = '5px';
  controlText.innerHTML = 'Bus And Ramps';
  controlUI.appendChild(controlText);

  // Setup the click event listeners: simply set the map to Chicago.
  controlUI.addEventListener('click', function() {
    busAndMarkerVisible = !busAndMarkerVisible;
    _busAndRampsMarkers.forEach(function(m) {
      m.setVisible(busAndMarkerVisible);
    });
  });
}
