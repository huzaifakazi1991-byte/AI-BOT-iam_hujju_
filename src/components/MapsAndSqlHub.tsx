import React, { useCallback, useEffect, useState } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  Search,
  Compass,
  ExternalLink,
  Database,
  Plus,
  Trash2,
  LocateFixed,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { getAuthToken, signInWithGoogle } from '../firebase';
import { MapsGroundingPlaceLink, SqlTaskLogRecord } from '../types';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

interface DiscoveredPlaceMarker {
  id: string;
  name: string;
  address: string;
  position: LatLngPoint;
}

interface InteractiveMapControllerProps {
  searchQuery: string;
  searchTrigger: number;
  routeOrigin: LatLngPoint | null;
  routeDest: LatLngPoint | null;
  onPlacesFound: (places: DiscoveredPlaceMarker[]) => void;
  onRouteSummary: (summary: string) => void;
}

const InteractiveMapController: React.FC<InteractiveMapControllerProps> = ({
  searchQuery,
  searchTrigger,
  routeOrigin,
  routeDest,
  onPlacesFound,
  onRouteSummary,
}) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const placesLib = useMapsLibrary('places') as unknown as {
    Place?: {
      searchByText: (req: Record<string, unknown>) => Promise<{
        places?: Array<{
          id?: string;
          displayName?: string;
          formattedAddress?: string;
          location?: { lat: () => number; lng: () => number };
        }>;
      }>;
    };
  } | null;
  const routesLib = useMapsLibrary('routes') as unknown as {
    TravelMode?: { DRIVING: string };
    Route?: {
      new (): {
        computeRoutes: (req: Record<string, unknown>) => Promise<{
          routes?: Array<{
            distanceMeters?: number;
            polyline?: { encodedPolyline?: string };
            viewport?: { southwest: LatLngPoint; northeast: LatLngPoint };
          }>;
        }>;
      };
      decode: (encoded: string) => LatLngPoint[];
    };
  } | null;
  const [activePolyline, setActivePolyline] = useState<{ setMap: (m: unknown) => void } | null>(null);

  // Modern Places API (New): Place.searchByText
  useEffect(() => {
    if (!placesLib?.Place || !map || !searchQuery.trim() || searchTrigger === 0) return;

    let cancelled = false;
    const runSearch = async () => {
      try {
        const center = map.getCenter();
        const request: Record<string, unknown> = {
          textQuery: searchQuery,
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
          maxResultCount: 6,
          ...(center
            ? {
                locationBias: {
                  center: { lat: center.lat(), lng: center.lng() },
                  radius: 15000,
                },
              }
            : {}),
        };

        const { places } = await placesLib.Place!.searchByText(request);
        if (cancelled || !places) return;

        const mapped: DiscoveredPlaceMarker[] = [];
        for (const p of places) {
          if (p.location) {
            mapped.push({
              id: p.id || `${p.location.lat()}_${p.location.lng()}`,
              name: p.displayName || 'Point of Interest',
              address: p.formattedAddress || '',
              position: { lat: p.location.lat(), lng: p.location.lng() },
            });
          }
        }
        onPlacesFound(mapped);
        if (mapped.length > 0) {
          map.panTo(mapped[0].position);
          map.setZoom(13);
        }
      } catch (err) {
        console.warn('Places searchByText warning:', err);
      }
    };

    runSearch();
    return () => {
      cancelled = true;
    };
  }, [placesLib, map, searchQuery, searchTrigger, onPlacesFound]);

  // Modern Routes API: Route.computeRoutes
  useEffect(() => {
    if (!routesLib?.Route || !mapsLib || !map || !routeOrigin || !routeDest) return;

    if (activePolyline) {
      activePolyline.setMap(null);
      setActivePolyline(null);
    }

    const RouteClass = routesLib.Route;
    const routeService = new RouteClass();
    const request: Record<string, unknown> = {
      origin: routeOrigin,
      destination: routeDest,
      travelMode: routesLib.TravelMode?.DRIVING || 'DRIVING',
    };

    routeService
      .computeRoutes(request)
      .then((response) => {
        const route = response.routes?.[0];
        if (!route) return;

        if (route.polyline?.encodedPolyline) {
          const decodedPath = RouteClass.decode(route.polyline.encodedPolyline);
          const poly = new mapsLib.Polyline({
            path: decodedPath,
            geodesic: true,
            strokeColor: '#D97706',
            strokeOpacity: 0.95,
            strokeWeight: 4,
            map,
          });
          setActivePolyline(poly);
        }

        if (route.viewport) {
          map.fitBounds({
            south: route.viewport.southwest.lat,
            west: route.viewport.southwest.lng,
            north: route.viewport.northeast.lat,
            east: route.viewport.northeast.lng,
          });
        }

        const km = route.distanceMeters ? (route.distanceMeters / 1000).toFixed(1) : null;
        onRouteSummary(km ? `Route calculated (${km} km driving)` : 'Route calculated on map');
      })
      .catch((err: unknown) => {
        console.warn('Routes computeRoutes warning:', err);
      });
  }, [routesLib, mapsLib, map, routeOrigin, routeDest]);

  return null;
};

interface MapsAndSqlHubProps {
  user: User | null;
  sqlLogs: SqlTaskLogRecord[];
  onRefreshSqlLogs: () => Promise<void>;
  onCreateSqlLog: (title: string, category: string, modality: string, summary: string) => Promise<void>;
  onDeleteSqlLog: (id: number) => Promise<void>;
}

export const MapsAndSqlHub: React.FC<MapsAndSqlHubProps> = ({
  user,
  sqlLogs,
  onRefreshSqlLogs,
  onCreateSqlLog,
  onDeleteSqlLog,
}) => {
  // Interactive Map State
  const [mapCenter, setMapCenter] = useState<LatLngPoint>({
    lat: 37.3861,
    lng: -122.0839,
  });
  const [placeSearchInput, setPlaceSearchInput] = useState('Specialty coffee & coworking spaces');
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [discoveredPlaces, setDiscoveredPlaces] = useState<DiscoveredPlaceMarker[]>([
    {
      id: 'default_hq',
      name: 'Mountain View Innovation Hub',
      address: 'Mountain View, CA',
      position: { lat: 37.3861, lng: -122.0839 },
    },
  ]);
  const [selectedMarker, setSelectedMarker] = useState<DiscoveredPlaceMarker | null>(null);
  const [routeOrigin, setRouteOrigin] = useState<LatLngPoint | null>(null);
  const [routeDest, setRouteDest] = useState<LatLngPoint | null>(null);
  const [routeSummaryText, setRouteSummaryText] = useState<string>('');

  // Gemini Maps Grounding State
  const [groundingQuery, setGroundingQuery] = useState(
    'What are the best quiet cafes and tech lounges with reliable Wi-Fi near Mountain View?'
  );
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>({
    latitude: 37.3861,
    longitude: -122.0839,
  });
  const [groundingAnswer, setGroundingAnswer] = useState<string>('');
  const [groundingPlaces, setGroundingPlaces] = useState<MapsGroundingPlaceLink[]>([]);
  const [isGroundingLoading, setIsGroundingLoading] = useState(false);

  // Cloud SQL Form State
  const [sqlTitle, setSqlTitle] = useState('');
  const [sqlCategory, setSqlCategory] = useState('Geospatial & Field Ops');
  const [sqlModality, setSqlModality] = useState('Google Maps + Gemini');
  const [sqlSummary, setSqlSummary] = useState('');
  const [isSavingSql, setIsSavingSql] = useState(false);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setMapCenter(next);
        setUserCoords({ latitude: next.lat, longitude: next.lng });
        setRouteOrigin(next);
      },
      () => {}
    );
  };

  const handlePlacesFound = useCallback((places: DiscoveredPlaceMarker[]) => {
    if (places.length > 0) {
      setDiscoveredPlaces(places);
      setSelectedMarker(places[0]);
    }
  }, []);

  const handleRunMapsGrounding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groundingQuery.trim() || isGroundingLoading) return;

    setIsGroundingLoading(true);
    try {
      const res = await fetch('/api/hujju/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: groundingQuery,
          latitude: userCoords?.latitude,
          longitude: userCoords?.longitude,
        }),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setGroundingAnswer(data.text || '');
        setGroundingPlaces(data.places || []);
      }
    } finally {
      setIsGroundingLoading(false);
    }
  };

  const handleCreateSqlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sqlTitle.trim() || isSavingSql) return;
    setIsSavingSql(true);
    try {
      await onCreateSqlLog(
        sqlTitle.trim(),
        sqlCategory,
        sqlModality,
        sqlSummary.trim() || 'Recorded via Hujju Relational Ledger'
      );
      setSqlTitle('');
      setSqlSummary('');
    } finally {
      setIsSavingSql(false);
    }
  };

  useEffect(() => {
    if (user) {
      onRefreshSqlLogs();
    }
  }, [user]);

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Geospatial Maps Intelligence & Cloud SQL Relational Ledger
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Interactive Google Maps Platform (Places New & Routes API), Gemini Maps Grounding, and PostgreSQL persistence
          </p>
        </div>

        <button
          type="button"
          onClick={handleLocateMe}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-800 text-white rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
        >
          <LocateFixed className="w-3.5 h-3.5 text-amber-400" />
          <span>Use Current GPS Location</span>
        </button>
      </div>

      {/* Top Grid: Interactive Google Map (7 cols) + Gemini Maps Grounding (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Google Map Card */}
        <div className="lg:col-span-7 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-500" />
                Interactive Google Map — Places (New) & Routes API
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any marker to inspect details or compute a live driving route
              </p>
            </div>
            {routeSummaryText && (
              <span className="text-xs font-mono text-amber-600 dark:text-amber-400">
                {routeSummaryText}
              </span>
            )}
          </div>

          {/* Search Bar for Places API (New) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearchTrigger((prev) => prev + 1);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={placeSearchInput}
              onChange={(e) => setPlaceSearchInput(e.target.value)}
              placeholder="Search places on map (e.g., 'EV charging stations', 'Coworking spaces')..."
              className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              Search Map
            </button>
          </form>

          {/* Map Viewport Container with Explicit Height */}
          <div className="w-full h-[420px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative">
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <GoogleMap
                defaultCenter={mapCenter}
                defaultZoom={12}
                mapId="DEMO_MAP_ID"
                gestureHandling="greedy"
                internalUsageAttributionIds={[
                  'gmp_mcp_codeassist_v1_aistudio',
                  'gmp_git_agentskills_v1',
                ]}
                style={{ width: '100%', height: '100%' }}
              >
                <InteractiveMapController
                  searchQuery={placeSearchInput}
                  searchTrigger={searchTrigger}
                  routeOrigin={routeOrigin}
                  routeDest={routeDest}
                  onPlacesFound={handlePlacesFound}
                  onRouteSummary={setRouteSummaryText}
                />

                {discoveredPlaces.map((place) => (
                  <AdvancedMarker
                    key={place.id}
                    position={place.position}
                    onClick={() => setSelectedMarker(place)}
                  >
                    <Pin
                      background="#D97706"
                      borderColor="#0F172A"
                      glyphColor="#FFFFFF"
                    />
                  </AdvancedMarker>
                ))}

                {selectedMarker && (
                  <InfoWindow
                    position={selectedMarker.position}
                    onCloseClick={() => setSelectedMarker(null)}
                  >
                    <div className="p-1 max-w-[220px] text-slate-900 space-y-1.5">
                      <div className="text-xs font-bold">{selectedMarker.name}</div>
                      {selectedMarker.address && (
                        <div className="text-[11px] text-slate-600">{selectedMarker.address}</div>
                      )}
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setRouteOrigin(selectedMarker.position)}
                          className="px-2 py-1 text-[10px] font-semibold bg-slate-900 text-white rounded"
                        >
                          Set Origin
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!routeOrigin) {
                              setRouteOrigin(mapCenter);
                            }
                            setRouteDest(selectedMarker.position);
                          }}
                          className="px-2 py-1 text-[10px] font-semibold bg-amber-600 text-white rounded flex items-center gap-1"
                        >
                          <Navigation className="w-2.5 h-2.5" />
                          Route Here
                        </button>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </APIProvider>
          </div>
        </div>

        {/* Gemini Maps Grounding Assistant Card */}
        <div className="lg:col-span-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-amber-500" />
                Gemini Maps Grounding Assistant
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Model: gemini-3.8-flash with live Google Maps tool grounding & verified place links
              </p>
            </div>

            <form onSubmit={handleRunMapsGrounding} className="space-y-2.5">
              <textarea
                rows={3}
                value={groundingQuery}
                onChange={(e) => setGroundingQuery(e.target.value)}
                placeholder="Ask Hujju about real-world places, hours, ratings, or neighborhood recommendations..."
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 leading-relaxed"
              />
              <button
                type="submit"
                disabled={isGroundingLoading || !groundingQuery.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <Compass className="w-4 h-4" />
                {isGroundingLoading ? 'Querying Google Maps Data...' : 'Ask with Google Maps Grounding'}
              </button>
            </form>

            {groundingAnswer ? (
              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed max-h-56 overflow-y-auto">
                  {groundingAnswer}
                </div>

                {groundingPlaces.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Verified Google Maps Sources
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {groundingPlaces.map((place, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 text-xs space-y-1"
                        >
                          <a
                            href={place.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                          >
                            <span>{place.title}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                          {place.reviewSnippets && place.reviewSnippets.length > 0 && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                              &ldquo;{place.reviewSnippets[0]}&rdquo;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                Submit a location question above to retrieve grounded Google Maps places and direct source links.
              </div>
            )}
          </div>

          {groundingAnswer && user && (
            <button
              type="button"
              onClick={() =>
                onCreateSqlLog(
                  `Maps Grounding: ${groundingQuery.slice(0, 50)}`,
                  'Geospatial Grounding',
                  'Google Maps + gemini-3.8-flash',
                  groundingAnswer.slice(0, 600)
                )
              }
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Database className="w-3.5 h-3.5 text-amber-500" />
              Save Grounded Brief to Cloud SQL Ledger
            </button>
          )}
        </div>
      </div>

      {/* Bottom Section: Cloud SQL PostgreSQL Relational Ledger */}
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-500" />
              Cloud SQL Relational Task & Activity Ledger (PostgreSQL)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Structured relational records tied to your authenticated account via Drizzle ORM
            </p>
          </div>

          {!user && (
            <button
              type="button"
              onClick={() => signInWithGoogle().catch(() => {})}
              className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Sign In with Google to Access Cloud SQL
            </button>
          )}
        </div>

        {!user ? (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            Sign in with your Google account to create and query relational records in PostgreSQL.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form onSubmit={handleCreateSqlSubmit} className="lg:col-span-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Record Title
                </label>
                <input
                  type="text"
                  value={sqlTitle}
                  onChange={(e) => setSqlTitle(e.target.value)}
                  placeholder="e.g., European Field Deployment Audit"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={sqlCategory}
                    onChange={(e) => setSqlCategory(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="Geospatial & Field Ops">Geospatial & Field Ops</option>
                    <option value="AI Studio Sprint">AI Studio Sprint</option>
                    <option value="Creative Media Asset">Creative Media Asset</option>
                    <option value="Document Audit">Document Audit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Modality
                  </label>
                  <select
                    value={sqlModality}
                    onChange={(e) => setSqlModality(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="Google Maps + Gemini">Google Maps + Gemini</option>
                    <option value="Live Voice & Audio">Live Voice & Audio</option>
                    <option value="Image / Video / Music">Image / Video / Music</option>
                    <option value="3D Spatial Simulation">3D Spatial Simulation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Structured Summary / Deliverable Notes
                </label>
                <textarea
                  rows={3}
                  value={sqlSummary}
                  onChange={(e) => setSqlSummary(e.target.value)}
                  placeholder="Enter key metrics, coordinates, or milestone outcomes..."
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingSql || !sqlTitle.trim()}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                {isSavingSql ? 'Saving to PostgreSQL...' : 'Insert Relational Record'}
              </button>
            </form>

            <div className="lg:col-span-8 space-y-2.5 max-h-80 overflow-y-auto">
              {sqlLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No relational records saved yet. Insert a record on the left or log outputs from the Maps or Creative Media studios.
                </div>
              ) : (
                sqlLogs.map((row) => (
                  <div
                    key={row.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {row.title}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {row.summary}
                      </p>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-0.5">
                        <span>{row.category}</span>
                        <span>·</span>
                        <span>{row.modality}</span>
                        <span>·</span>
                        <span className="font-mono tabular-nums">
                          {new Date(row.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteSqlLog(row.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
