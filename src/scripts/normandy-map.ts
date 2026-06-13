import maplibregl from "maplibre-gl";

type Place = {
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  tags: string[];
  description: string;
  markerKind?: "lighthouse";
};

type Movement = {
  from: string;
  to: string;
  force: string;
};

declare global {
  interface Window {
    __TRIP_PLACES__?: Place[];
    __TRIP_PLACE_CONTENT__?: Record<string, string>;
    __TRIP_MOVEMENTS__?: Movement[];
  }
}

const FORCE_COLORS: Record<string, string> = {
  US: "#d97706",
  British: "#3b82f6",
  Canadian: "#10b981",
  German: "#6b7280",
};

const getBearing = (
  from: [number, number],
  to: [number, number],
): number => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y =
    Math.sin(toRad(to[0] - from[0])) * Math.cos(toRad(to[1]));
  const x =
    Math.cos(toRad(from[1])) * Math.sin(toRad(to[1])) -
    Math.sin(toRad(from[1])) *
      Math.cos(toRad(to[1])) *
      Math.cos(toRad(to[0] - from[0]));
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
};

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

const selectPlaceByIndex = (index: number) => {
  const place = places[index];
  if (!place) {
    return;
  }

  if (selectedPlaceId !== null) {
    map.setFeatureState(
      { source: "places", id: selectedPlaceId },
      { selected: false },
    );
  }

  selectedPlaceId = index;
  map.setFeatureState(
    { source: "places", id: selectedPlaceId },
    { selected: true },
  );
  renderPlaceDetails(place);
};

const createLighthouseMarker = (place: Place, index: number) => {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "special-marker special-marker--lighthouse";
  element.setAttribute("aria-label", `Open ${place.name}`);
  element.innerHTML = `
    <svg viewBox="0 0 36 48" aria-hidden="true" focusable="false">
      <path d="M14 2h8v8H14z" fill="white" stroke="#333" stroke-width="1.5" stroke-linejoin="round"></path>
      <path d="M11 10h14l-2 26H13z" fill="white" stroke="#333" stroke-width="1.5" stroke-linejoin="round"></path>
      <path d="M13 16h10v4H13z" fill="#b74d2c"></path>
      <path d="M12 24h12v4H12z" fill="#b74d2c"></path>
      <path d="M9 36h18l-2 8H11z" fill="white" stroke="#333" stroke-width="1.5" stroke-linejoin="round"></path>
      <line x1="11" y1="14" x2="4" y2="19" stroke="#f4d08c" stroke-width="2" stroke-linecap="round"></line>
      <line x1="25" y1="14" x2="32" y2="19" stroke="#f4d08c" stroke-width="2" stroke-linecap="round"></line>
    </svg>
  `;

  element.style.width = "36px";
  element.style.height = "48px";
  element.style.padding = "0";
  element.style.border = "0";
  element.style.background = "transparent";
  element.style.cursor = "pointer";
  element.style.filter = "drop-shadow(0 10px 12px rgba(16, 36, 63, 0.28))";

  element.addEventListener("click", (event) => {
    event.stopPropagation();
    selectPlaceByIndex(index);
  });

  new maplibregl.Marker({ element, anchor: "bottom" })
    .setLngLat([place.coordinates.lng, place.coordinates.lat])
    .addTo(map);
};

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
  panelSelectedNode.scrollTop = 0;
  detailBodyNode.scrollTop = 0;
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
  const movements = window.__TRIP_MOVEMENTS__;
  if (movements?.length) {
    const coordByName = new Map(
      places.map((p) => [
        p.name,
        [p.coordinates.lng, p.coordinates.lat] as [number, number],
      ]),
    );

    const lineFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    const arrowFeatures: GeoJSON.Feature<GeoJSON.Point>[] = [];

    for (const m of movements) {
      const from = coordByName.get(m.from);
      const to = coordByName.get(m.to);
      if (!from || !to) continue;

      const color = FORCE_COLORS[m.force] ?? "#888";
      const arrowAt: [number, number] = [
        from[0] + (to[0] - from[0]) * 0.65,
        from[1] + (to[1] - from[1]) * 0.65,
      ];

      lineFeatures.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: [from, to] },
        properties: { color },
      });

      arrowFeatures.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: arrowAt },
        properties: { color, bearing: (getBearing(from, to) - 90 + 360) % 360 },
      });
    }

    map.addSource("movements", {
      type: "geojson",
      data: { type: "FeatureCollection", features: lineFeatures },
    });

    map.addSource("movement-arrows", {
      type: "geojson",
      data: { type: "FeatureCollection", features: arrowFeatures },
    });

    map.addLayer({
      id: "movements-line",
      type: "line",
      source: "movements",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": ["get", "color"],
        "line-width": 2.5,
        "line-opacity": 0.75,
      },
    });

    map.addLayer({
      id: "movements-arrows",
      type: "symbol",
      source: "movement-arrows",
      layout: {
        "text-field": "▶",
        "text-size": 13,
        "text-rotate": ["get", "bearing"],
        "text-rotation-alignment": "map",
        "text-pitch-alignment": "map",
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: {
        "text-color": ["get", "color"],
        "text-halo-color": "rgba(255,255,255,0.7)",
        "text-halo-width": 1.5,
      },
    });
  }

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

  places.forEach((place, index) => {
    if (place.markerKind === "lighthouse") {
      createLighthouseMarker(place, index);
    }
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

    selectPlaceByIndex(feature.id);
  });

  map.fitBounds(bounds, {
    padding: { top: 80, right: 80, bottom: 80, left: 80 },
    maxZoom: 9,
  });
});
