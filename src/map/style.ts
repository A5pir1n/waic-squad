import { layers, BLACK } from '@protomaps/basemaps';
import type { StyleSpecification } from 'maplibre-gl';

/**
 * Moonshot-black basemap: pure geometry, zero label layers (no glyph
 * server needed — all naming lives in our own DOM markers).
 * 黄浦江 is the one element allowed to glow.
 */
const flavor: typeof BLACK = {
  ...BLACK,
  background: '#000000',
  earth: '#0a0a0a',
  park_a: '#0d100c',
  park_b: '#0d100c',
  wood_a: '#0c0f0b',
  wood_b: '#0c0f0b',
  scrub_a: '#0b0d0a',
  scrub_b: '#0b0d0a',
  water: '#141d28',
  sand: '#0e0d0b',
  beach: '#0e0d0b',
  glacier: '#0e0e0e',
  buildings: '#111111',
  pedestrian: '#101010',
  hospital: '#0d0d0d',
  industrial: '#0d0d0e',
  school: '#0e0e0c',
  zoo: '#0d100c',
  military: '#0c0c0c',
  aerodrome: '#0d0d0e',
  runway: '#161616',
  pier: '#141414',
  railway: '#151515',
  boundaries: '#1c1c1c',
  other: '#121212',
  minor_service: '#141414',
  minor_a: '#161616',
  minor_b: '#161616',
  link: '#1a1a1a',
  major: '#222222',
  highway: '#2d2d2d',
  minor_service_casing: '#000000',
  minor_casing: '#000000',
  link_casing: '#000000',
  major_casing_early: '#000000',
  major_casing_late: '#000000',
  highway_casing_early: '#000000',
  highway_casing_late: '#000000',
  tunnel_other: '#0f0f0f',
  tunnel_minor: '#101010',
  tunnel_link: '#101010',
  tunnel_major: '#121212',
  tunnel_highway: '#161616',
  tunnel_other_casing: '#000000',
  tunnel_minor_casing: '#000000',
  tunnel_link_casing: '#000000',
  tunnel_major_casing: '#000000',
  tunnel_highway_casing: '#000000',
  bridges_other: '#121212',
  bridges_minor: '#161616',
  bridges_link: '#1a1a1a',
  bridges_major: '#222222',
  bridges_highway: '#2d2d2d',
  bridges_other_casing: '#000000',
  bridges_minor_casing: '#000000',
  bridges_link_casing: '#000000',
  bridges_major_casing: '#000000',
  bridges_highway_casing: '#000000',
};

export function buildMapStyle(pmtilesUrl: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      protomaps: {
        type: 'vector',
        url: `pmtiles://${pmtilesUrl}`,
        attribution: '© OpenStreetMap',
      },
    },
    layers: layers('protomaps', flavor, {}),
  } as StyleSpecification;
}
