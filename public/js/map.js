/* eslint-disable */

export const displayMap = (locations) => {
  const map = L.map('map', {
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    touchZoom: false,
    zoomControl: false,
  });

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const markers = locations.map((loc) =>
    L.marker([...loc.coordinates].reverse())
      .addTo(map)
      .bindPopup(`Day ${loc.day}: ${loc.description}`),
  );

  const bounds = L.featureGroup(markers).getBounds();

  map.fitBounds(bounds, {
    paddingTopLeft: [100, 50],
    paddingBottomRight: [50, 150],
  });
};
