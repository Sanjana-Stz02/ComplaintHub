import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow
});

const DEFAULT_CENTER = [23.8103, 90.4125];

export default function ComplaintsMap({ complaints, emptyHint, variant = "default" }) {
  const isMini = variant === "mini";

  const points = useMemo(
    () =>
      (complaints || []).filter(
        (item) =>
          item.location &&
          typeof item.location.lat === "number" &&
          typeof item.location.lng === "number"
      ),
    [complaints]
  );

  const center = useMemo(() => {
    if (points.length === 0) {
      return DEFAULT_CENTER;
    }

    return [points[0].location.lat, points[0].location.lng];
  }, [points]);

  const mapKey = useMemo(() => points.map((point) => point.complaintId).join("|") || "empty", [points]);

  const zoom = isMini && points.length === 1 ? 15 : 12;

  if (points.length === 0) {
    return (
      <div className="small map-empty">
        {emptyHint ||
          "No complaints with a saved location yet. Submit a complaint with location to see pins here."}
      </div>
    );
  }

  return (
    <div className={`leaflet-map-wrap${isMini ? " leaflet-map-wrap--mini" : ""}`}>
      <MapContainer
        key={mapKey}
        center={center}
        zoom={zoom}
        scrollWheelZoom={!isMini}
        className={`leaflet-map${isMini ? " leaflet-map--mini" : ""}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((complaint) => (
          <Marker key={complaint.complaintId} position={[complaint.location.lat, complaint.location.lng]}>
            <Popup>
              <div className="map-popup">
                <strong>{complaint.complaintId}</strong>
                <div>{complaint.title}</div>
                <div className="small">
                  {complaint.status} · {complaint.priority}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
