import { GeoHash } from './GeoHash'
import {Dms } from './dms'

export class GeoCoordinate{
    lat: number;
    long: number;

    
    constructor(lattitude: number, longitude: number){
        this.lat = lattitude;
        this.long = longitude;
    }

    toString(): string{
        return `Lat: ${this.lat.toFixed(6)} Long: ${this.long.toFixed(6)}`
    }

    toDMSString(): string{
        return `Lat: ${Dms.toLat(this.lat,'dms')} Long: ${Dms.toLon(this.long, 'dms')}`
    }

    // returns the radians coordinates of the latitude
    latRadians(): number{
        return Math.PI * this.lat/180
    }

    // Uses math from https://www.geodatasource.com/developers/javascript.
    // Returns the number of KM between this and another coordinates
    distanceTo(where: GeoCoordinate): number{
        if (this.lat === where.lat && this.long === where.long)
            return 0;

        const thetaInRadians: number = (this.long - where.long) * Math.PI/180
        let distance = Math.sin(this.latRadians()) * Math.sin(where.latRadians()) +
            Math.cos(this.latRadians()) * Math.cos(where.latRadians()) * Math.cos(thetaInRadians)
        if (distance > 1)
            distance = 1;
        distance = Math.acos(distance) * (180/Math.PI) * 60 * 1.1515 * 1.609344
        return distance;
    }

    // methodology stolen from https://github.com/davetroy/geohash-js/blob/master/geohash.js
    geoHash(precision: number = 8): GeoHash{
        return new GeoHash(this, precision)
    }
}