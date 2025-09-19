import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Clock, Users, Filter, Search, Route as RouteIcon, Navigation } from "lucide-react";
import { useEvacuationRoutes } from "@/hooks/useEvacuationRoutes";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom marker
const evacuationMarker = new L.Icon({
  iconUrl: "/favicon.ico",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const EvacuationRoutes = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { routes, loading, error } = useEvacuationRoutes();

  // Filter routes by search & status
  const filteredRoutes = routes.filter(route => {
    const matchesSearch =
      route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.from_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.to_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (route.state?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || route.current_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="p-6 text-center">Loading routes...</div>;
  if (error) return <div className="p-6 text-center text-red-600">Error: {error}</div>;

  // Status colors
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open": return "bg-green-500 text-white";
      case "congested": return "bg-orange-500 text-white";
      case "closed": return "bg-red-500 text-white";
      default: return "bg-gray-400 text-white";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">Evacuation Routes</h1>
          <p className="text-muted-foreground">Interactive safe routes across India with live updates</p>
        </div>
      </div>

      {/* Map */}
      <Card>
        <CardHeader>
          <CardTitle>Evacuation Map</CardTitle>
          <CardDescription>Markers & routes updated in real-time</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <MapContainer center={[20.5937, 78.9629]} zoom={5} className="h-96 w-full rounded-b-lg">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

            {filteredRoutes.map(route => {
              // Draw polyline if route_points exist
              const coords = route.route_points?.coordinates || [];
              const latlngs = coords.map(c => [c[1], c[0]]);
              return (
                <React.Fragment key={route.id}>
                  {latlngs.length > 0 && <Polyline positions={latlngs as [number, number][]} pathOptions={{ color: route.current_status === "open" ? "green" : route.current_status === "congested" ? "orange" : "red" }} />}
                  {latlngs[0] && <Marker position={latlngs[0] as [number, number]} icon={evacuationMarker}><Popup><strong>{route.name}</strong><br />From: {route.from_location}</Popup></Marker>}
                  {latlngs[latlngs.length - 1] && <Marker position={latlngs[latlngs.length - 1] as [number, number]} icon={evacuationMarker}><Popup>To: {route.to_location}</Popup></Marker>}
                </React.Fragment>
              );
            })}
          </MapContainer>
        </CardContent>
      </Card>

      {/* Search & Filter */}
      <Card>
        <CardContent className="p-4 flex gap-4">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search by name, state, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Routes</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="congested">Congested</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* List of Routes */}
      <div className="space-y-4">
        {filteredRoutes.map(route => (
          <Card key={route.id} className="border-l-4 border-primary">
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <RouteIcon className="h-4 w-4 text-primary" />
                  {route.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {route.from_location} → {route.to_location} ({route.state})
                </p>
                <p className="text-sm">
                  {route.distance_km} km · {route.estimated_time_minutes} min
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={getStatusColor(route.current_status)}>{route.current_status}</Badge>
                {route.ai_optimized && <Badge className="bg-blue-500 text-white">AI Optimized</Badge>}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(route.from_location)}&destination=${encodeURIComponent(route.to_location)}&travelmode=driving`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button size="sm">Open in Google Maps</Button>
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EvacuationRoutes;
