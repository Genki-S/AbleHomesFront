$(function() {
  var housesStr = localStorage.getItem('comparing-houses') || '[]';
  var houses = JSON.parse(housesStr);
  $('#savedHousesTbody').text('');
  houses.forEach(function(house) {
    var lat = house.coordinates[1];
    var lng = house.coordinates[0];

    var row = '<tr data-house-id="' + house.id + '">' +
      '<td>' +'<img src="https://maps.googleapis.com/maps/api/streetview?size=200x100&location=' + lat +',' + lng + '&key=AIzaSyD9zgc6nldepHmG7uY5ZEpakyBHPPz5Fq4">' + '</td>' +
      '<td>' + house.address + '</td>' +
      '<td>' + '<button class="delete btn btn-danger">Delete</button>' + '</td>' +
      '</tr>';
    $('#savedHousesTbody').append(row);
  });

  $('#savedHousesTbody').on('click', 'button.delete', function() {
    var id = $(this).closest('tr').data('house-id');
    houses = houses.filter(function(h) { return h.id != id; });
    localStorage.setItem('comparing-houses', JSON.stringify(houses));
    location.reload();
  });
});
