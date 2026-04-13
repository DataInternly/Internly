const REISTIJD = {
  async berekenOV(vanPostcode, naarPostcode) {
    return new Promise(function(resolve) {
      if (!vanPostcode || !naarPostcode) {
        resolve({ minuten: null, tekst: '—', status: 'onbekend' });
        return;
      }
      if (typeof google === 'undefined' || !google.maps || !google.maps.DistanceMatrixService) {
        resolve({ minuten: null, tekst: '—', status: 'onbekend' });
        return;
      }
      var service = new google.maps.DistanceMatrixService();
      service.getDistanceMatrix({
        origins: [vanPostcode.trim() + ', Nederland'],
        destinations: [naarPostcode.trim() + ', Nederland'],
        travelMode: google.maps.TravelMode.TRANSIT,
        transitOptions: {
          modes: [
            google.maps.TransitMode.BUS,
            google.maps.TransitMode.RAIL,
            google.maps.TransitMode.SUBWAY,
            google.maps.TransitMode.TRAM,
            google.maps.TransitMode.TRAIN
          ],
          routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS
        },
        unitSystem: google.maps.UnitSystem.METRIC,
      }, function(response, status) {
        if (status !== 'OK') {
          resolve({ minuten: null, tekst: '—', status: 'fout' });
          return;
        }
        var element = response.rows[0] && response.rows[0].elements[0];
        if (!element || element.status !== 'OK') {
          resolve({ minuten: null, tekst: '—', status: 'onbekend' });
          return;
        }
        var minuten = Math.round(element.duration.value / 60);
        resolve({ minuten: minuten, tekst: minuten + ' min', status: 'ok' });
      });
    });
  },

  valideer: function(postcode) {
    return /^[1-9][0-9]{3}\s?[A-Za-z]{2}$/.test(postcode.trim());
  },

  normaliseer: function(postcode) {
    return postcode.trim().toUpperCase().replace(/\s/g, '');
  }
};
