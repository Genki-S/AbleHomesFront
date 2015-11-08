// This example adds a search box to a map, using the Google Place Autocomplete
// feature. People can enter geographical searches. The search box will return a
// pick list containing a mix of places and predicted search terms.

var _houseList = [];
var _searchMarker = null;
var _markers = [];

function initAutocomplete() {
  var map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 37.7785190, lng: -122.405640037},
    zoom: 13,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  // Create the search box and link it to the UI element.
  var input = document.getElementById('pac-input');
  var searchBox = new google.maps.places.SearchBox(input);

  // Bias the SearchBox results towards current map's viewport.
  map.addListener('bounds_changed', function() {
    searchBox.setBounds(map.getBounds());
  });

  map.addListener('idle', function() {
    var bounds = map.getBounds();
    var center = bounds.getCenter();
    var ne = bounds.getNorthEast();
    var radMeter = getDistanceMeter(center, ne) / 2.0;
    // update with retsly data
    $.ajax({
      type: 'GET',
      url: 'https://rets.io/api/v1/test/listings?access_token=ac9d8bcc0a55c3d603a46c7bb7a0868e',
      dataType: 'json',
      data: {
        near: center.lat() + ',' + center.lng(),
        radius: radMeter,
      }
    }).done (function (res) {
      _houseList = res.bundle;
      houseListUpdatedHandler();
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

    _houseList.forEach(function(house) {
      console.log(house);

      var lat = house.coordinates[1];
      var lng = house.coordinates[0];

      // Create a marker for each place.
      var marker = new google.maps.Marker({
        map: map,
        title: house.address,
        position: {lat: lat, lng: lng},
      });
      _markers.push(marker);
      google.maps.event.addListener(marker, "mousedown", function() {
        console.log(house);
      });
    });
  }
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
