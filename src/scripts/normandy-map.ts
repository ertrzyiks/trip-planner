import maplibregl from "maplibre-gl";

type Place = {
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  tags: string[];
  description: string;
};

declare global {
  interface Window {
    __TRIP_PLACES__?: Place[];
    __TRIP_PLACE_CONTENT__?: Record<string, string>;
  }
}

const places = window.__TRIP_PLACES__ ?? [];
const placeContent = window.__TRIP_PLACE_CONTENT__ ?? {};
const mapNode = document.getElementById("map");
const panelDefaultNode = document.getElementById("panel-default");
const panelSelectedNode = document.getElementById("panel-selected");
const detailNameNode = document.getElementById("selected-place-name");
const detailBodyNode = document.getElementById("selected-place-body");
const showOverviewButton = document.getElementById("show-overview");

const normalizePlaceKey = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

if (!mapNode || places.length === 0) {
  throw new Error(
    "Map initialization requires #map and a non-empty places list.",
  );
}

const map = new maplibregl.Map({
  container: "map",
  style: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    },
    layers: [
      {
        id: "osm",
        type: "raster",
        source: "osm",
      },
    ],
  },
  center: [-0.62, 49.23],
  zoom: 8,
  cooperativeGestures: true,
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

const bounds = new maplibregl.LngLatBounds();
let selectedPlaceId: number | null = null;

const placeFeatures = places.map((place, index) => ({
  type: "Feature" as const,
  id: index,
  geometry: {
    type: "Point" as const,
    coordinates: [place.coordinates.lng, place.coordinates.lat],
  },
  properties: {
    name: place.name,
  },
}));

const renderPlaceDetails = (place: Place) => {
  if (
    !detailNameNode ||
    !detailBodyNode ||
    !panelDefaultNode ||
    !panelSelectedNode
  ) {
    return;
  }

  detailNameNode.textContent = place.name;
  const fullContent = placeContent[normalizePlaceKey(place.name)];
  detailBodyNode.innerHTML =
    fullContent ??
    `
      <p>${place.description}</p>
      <p>${place.coordinates.lat.toFixed(4)}, ${place.coordinates.lng.toFixed(4)}</p>
      <p>${place.tags.join(" • ")}</p>
    `;

  panelDefaultNode.classList.add("is-hidden");
  panelSelectedNode.classList.remove("is-hidden");
};

const showOverview = () => {
  if (!panelDefaultNode || !panelSelectedNode) {
    return;
  }

  if (selectedPlaceId !== null) {
    map.setFeatureState(
      { source: "places", id: selectedPlaceId },
      { selected: false },
    );
    selectedPlaceId = null;
  }

  panelSelectedNode.classList.add("is-hidden");
  panelDefaultNode.classList.remove("is-hidden");
};

showOverviewButton?.addEventListener("click", showOverview);

for (const place of places) {
  bounds.extend([place.coordinates.lng, place.coordinates.lat]);
}

map.on("load", () => {
  map.addSource("places", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: placeFeatures,
    },
  });

  map.addLayer({
    id: "places-circles",
    type: "circle",
    source: "places",
    paint: {
      "circle-radius": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        12,
        8,
      ],
      "circle-color": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        "#0f6e8c",
        "#b74d2c",
      ],
      "circle-stroke-width": 3,
      "circle-stroke-color": "#fff4e8",
      "circle-opacity": 1,
    },
  });

  const hoverPopup = new maplibregl.Popup({
    offset: 18,
    closeButton: false,
    closeOnClick: false,
  });

  map.on("mouseenter", "places-circles", (event) => {
    map.getCanvas().style.cursor = "pointer";
    const feature = event.features?.[0] as any;
    if (!feature) {
      return;
    }

    hoverPopup
      .setLngLat(feature.geometry.coordinates)
      .setHTML(
        `<article class="popup"><h2>${feature.properties.name}</h2></article>`,
      )
      .addTo(map);
  });

  map.on("mousemove", "places-circles", (event) => {
    const feature = event.features?.[0] as any;
    if (!feature) {
      return;
    }

    hoverPopup.setLngLat(feature.geometry.coordinates);
  });

  map.on("mouseleave", "places-circles", () => {
    map.getCanvas().style.cursor = "";
    hoverPopup.remove();
  });

  map.on("click", "places-circles", (event) => {
    const feature = event.features?.[0] as any;
    if (!feature || typeof feature.id !== "number") {
      return;
    }

    if (selectedPlaceId !== null) {
      map.setFeatureState(
        { source: "places", id: selectedPlaceId },
        { selected: false },
      );
    }

    selectedPlaceId = feature.id;
    map.setFeatureState(
      { source: "places", id: selectedPlaceId },
      { selected: true },
    );
    renderPlaceDetails(places[selectedPlaceId]);
  });

  map.fitBounds(bounds, {
    padding: { top: 80, right: 80, bottom: 80, left: 80 },
    maxZoom: 9,
  });
});
