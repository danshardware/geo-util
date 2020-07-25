import { GeoCoordinate } from '../src/index';
import { GeoHash } from '../src/index';
import {Dms} from '../src/dms';

// Default DMS seperator is a narrow, non-blocking space. This makes testins hard, so just make it a space
Dms.separator = " " 

const WhiteHouse = new GeoCoordinate(38.897872, -77.036510);
const Pentagon = new GeoCoordinate(38.871894, -77.056290);
const Hub = new GeoCoordinate(42.355368, -71.060506);

// Testst validated against Google Maps and https://www.movable-type.co.uk/scripts/geohash.html
test('DMS parsing straight numbers', () =>{
    expect(Dms.parse(38.897872)).toBeCloseTo(38.897872)
    expect(Dms.parse('38.897872')).toBeCloseTo(38.897872)
})

test('DMS parsing cardinal coordinates', () =>{
    expect(Dms.parse('38°53\'52.3"N')).toBeCloseTo(38.897872)
    expect(Dms.parse('77°02\'11.4"W')).toBeCloseTo(-77.036510)
})

test('DMS precision', () => {
    expect(Dms.toDms(38.897872)).toBe('38.8979°')
    expect(Dms.toDms(38.897872,'dm')).toBe('38° 53.87′')
    expect(Dms.toDms(38.897872,'dms')).toBe('38° 53′ 52″')
    expect(Dms.toDms(38.897872,'dms', 2)).toBe('38° 53′ 52.34″')
})

test('Text output', () => {
    expect (WhiteHouse.toString()).toBe('Lat: 38.897872 Long: -77.036510')
    expect (WhiteHouse.toDMSString()).toBe('Lat: 38° 53′ 52″ N Long: 77° 2′ 11″ W')
})

test('Distance over a short span', () =>
    expect(WhiteHouse.distanceTo(Pentagon)).toBeCloseTo(3.36)    
)

test('Distance over a medium span', () => {
    expect(WhiteHouse.distanceTo(Hub)).toBeCloseTo(633.86)
    expect(Hub.distanceTo(WhiteHouse)).toBeCloseTo(633.86)
})

test ('Geohash calculations', () =>{
    expect(WhiteHouse.geoHash().geohash).toBe('dqcjqcps');
    expect(Pentagon.geoHash().geohash).toBe('dqcjns3m');
    expect(Hub.geoHash().geohash).toBe('drt2yyx3');
    expect(WhiteHouse.geoHash(7).geohash).toBe('dqcjqcp');
    expect(Pentagon.geoHash(6).geohash).toBe('dqcjns');
    expect(Hub.geoHash(5).geohash).toBe('drt2y');
})

test ('Geohash Class creation from coordinate', () => {
    let hashFromCoordinate = new GeoHash(WhiteHouse); 
    let hashFromString = new GeoHash('dqcjqcps');
    expect(hashFromCoordinate.geohash).toBe('dqcjqcps');
    expect(hashFromCoordinate.northWest.lat).toBeCloseTo(38.897953033447266);
    expect(hashFromCoordinate.northWest.long).toBeCloseTo(-77.03681945800781);
    expect(hashFromCoordinate.southEast.lat).toBeCloseTo(38.89778137207031);
    expect(hashFromCoordinate.southEast.long).toBeCloseTo(-77.0364761352539);
    expect(hashFromString.geohash).toBe('dqcjqcps');
    expect(hashFromString.northWest.lat).toBeCloseTo(38.897953033447266);
    expect(hashFromString.northWest.long).toBeCloseTo(-77.03681945800781);
    expect(hashFromString.southEast.lat).toBeCloseTo(38.89778137207031);
    expect(hashFromString.southEast.long).toBeCloseTo(-77.0364761352539);
})

test ('Geohash neighbors', () => {
    let hashFromCoordinate = new GeoHash(WhiteHouse);

    expect(hashFromCoordinate.getNeighborAsHashString('n')).toBe('dqcjqcpt')
    expect(hashFromCoordinate.getNeighborAsHashString('s')).toBe('dqcjqcpe')
    expect(hashFromCoordinate.getNeighborAsHashString('e')).toBe('dqcjqcpu')
    expect(hashFromCoordinate.getNeighborAsHashString('w')).toBe('dqcjqcpk')
    expect(hashFromCoordinate.getNeighborAsHashString('ne')).toBe('dqcjqcpv')
    expect(hashFromCoordinate.getNeighborAsHashString('se')).toBe('dqcjqcpg')
    expect(hashFromCoordinate.getNeighborAsHashString('nw')).toBe('dqcjqcpm')
    expect(hashFromCoordinate.getNeighborAsHashString('sw')).toBe('dqcjqcp7')
})

test('Getting hashes within a radius', () => {
    let WhiteHouseHash = new GeoHash(WhiteHouse);
    let neighboringWhiteHouse = WhiteHouseHash.getAllHashStringsWithinRadius(.03)
    expect(neighboringWhiteHouse).toContain('dqcjqcpk')
    expect(neighboringWhiteHouse).toContain('dqcjqcpm')
    expect(neighboringWhiteHouse).not.toContain('dqcjqcph')
    expect(neighboringWhiteHouse.length).toBe(9)
    neighboringWhiteHouse = WhiteHouseHash.getAllHashStringsWithinRadius(.03, 3)
    expect(neighboringWhiteHouse).toContain('dqcjqcpt')
    expect(neighboringWhiteHouse).not.toContain('dqcjqcpm')
    expect(neighboringWhiteHouse.length).toBe(5)
})