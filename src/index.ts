import Dms from './dms';

/**
 * Simple class for TypeScript the helps you manage geo locations. Can handle converting to 
 * various formats, and handling geohashes
 *
 * @module geo-util
 */

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

/**
 * A class for handling Gehashes
 */
export class GeoHash{
    // Constants to help calculate Geohashes
    private BITS = [16, 8, 4, 2, 1];
    private BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
    private NEIGHBORS = { 
                        e  : { 
                            even :  "bc01fg45238967deuvhjyznpkmstqrwx",
                            odd:    "p0r21436x8zb9dcf5h7kjnmqesgutwvy" 
                        },
                        w   : { 
                            even :  "238967debc01fg45kmstqrwxuvhjyznp",
                            odd:    "14365h7k9dcfesgujnmqp0r2twvyx8zb" 
                        },
                        n    : 
                        { 
                            even :  "p0r21436x8zb9dcf5h7kjnmqesgutwvy",
                            odd:    "bc01fg45238967deuvhjyznpkmstqrwx" 
                        },
                        s : { 
                            even :  "14365h7k9dcfesgujnmqp0r2twvyx8zb",
                            odd:    "238967debc01fg45kmstqrwxuvhjyznp" 
                        }
                    };
    private  BORDER = { 
        e  : { even : "bcfguvyz",
                   odd:   "prxz" },
        w   : { even : "0145hjnp",
                   odd:   "028b" },
        n    : { even : "prxz",
                   odd:   "bcfguvyz" },
        s : { even : "028b" ,
                   odd:   "0145hjnp" }
    };
    
    readonly coordinate: GeoCoordinate;
    readonly northWest: GeoCoordinate;
    readonly southEast: GeoCoordinate;
    readonly northEast: GeoCoordinate;
    readonly southWest: GeoCoordinate;
    readonly centroid: GeoCoordinate;
    readonly geohash: string;

    /**
     * 
     * @param coordinate - Either a geohash, or a GeoCoordinate object
     * @param precision - How many letters to return in the geohash. Thise determins precision with 4 being about 40 x 20km, 5 being about 5 x 5 km, 6 being 1.2 x .6km
     */
    constructor(coordinate: string);
    constructor(coordinate: GeoCoordinate, precision?: number);
    constructor(coordinate: string|GeoCoordinate, precision: number = 8){

        if (typeof coordinate === "string") {
            this.geohash = coordinate;
            [this.northWest, this.southEast, this.centroid] = this.decodeGeohash();
            this.northEast = new GeoCoordinate(this.northWest.lat, this.southEast.long)
            this.southWest = new GeoCoordinate(this.southEast.lat, this.northWest.long)
            this.coordinate = this.centroid;
        } else {
            this.coordinate = coordinate;
            this.geohash = this.hashString(precision);
            [this.northWest, this.southEast, this.centroid] = this.decodeGeohash();
            this.northEast = new GeoCoordinate(this.northWest.lat, this.southEast.long)
            this.southWest = new GeoCoordinate(this.southEast.lat, this.northWest.long)
        }
    }

    private refine_interval(interval:  number[], cd: number, mask:number) {
        if (cd&mask)
            interval[0] = (interval[0] + interval[1])/2;
        else
            interval[1] = (interval[0] + interval[1])/2;
    }

    /**
     * Gets all the coordinates for the bounding box plus centroid
     * @returns [northWest, northEast, southEast, southWest, centroid]
     */
    getAllCoordinates(): GeoCoordinate[]{
        return [this.northWest, this.northEast, this.southEast, this.southWest, this.centroid]
    }

    // This will fill in the bounding box values
    private decodeGeohash():GeoCoordinate[]{
        let is_even: boolean = true;
        let lat: number[] = []; let lon: number[] = [];
        lat[0] = -90.0;  lat[1] = 90.0;
        lon[0] = -180.0; lon[1] = 180.0;
        let lat_err: number = 90.0; let lon_err: number = 180.0;
        
        for (let i: number = 0; i<this.geohash.length; i++) {
            let c:string = this.geohash[i];
            let cd = this.BASE32.indexOf(c);
            for (let j:number=0; j<5; j++) {
                let mask:number = this.BITS[j];
                if (is_even) {
                    lon_err /= 2;
                    this.refine_interval(lon, cd, mask);
                } else {
                    lat_err /= 2;
                    this.refine_interval(lat, cd, mask);
                }
                is_even = !is_even;
            }
        }
        return [
            new GeoCoordinate(lat[0], lon[0]),
            new GeoCoordinate(lat[1], lon[1]),
            new GeoCoordinate((lat[0]+ lat[1])/2, (lon[0] + lon[1])/2)
        ]
    }

    /**
     * Converts this object to a GeoHash string at a given precision
     * 
     * @param precision - how precise should the geohash blocks be.  useful range for most applications is 4 (a large city) to 8(half a city block)
     * @returns a string representing the location at the precision required
     */
    hashString(precision: number = 8): string{
        let is_even: boolean = true;
        let i: number = 0;
        let lat: number[] = []; 
        let lon: number[] = [];
        let bit: number = 0;
        let ch: number = 0;
        let geohash: string = "";

        // Calculation vars
        lat[0] = -90.0;  lat[1] = 90.0;
        lon[0] = -180.0; lon[1] = 180.0;
        let mid: number;
        
        while (geohash.length < precision) {
            if (is_even) {
                    mid = (lon[0] + lon[1]) / 2;
                if (this.coordinate.long > mid) {
                        ch |= this.BITS[bit];
                        lon[0] = mid;
                } else
                        lon[1] = mid;
            } else {
                    mid = (lat[0] + lat[1]) / 2;
                if (this.coordinate.lat > mid) {
                        ch |= this.BITS[bit];
                        lat[0] = mid;
                } else
                        lat[1] = mid;
            }

                is_even = !is_even;
            if (bit < 4)
                    bit++;
            else {
                    geohash += this.BASE32[ch];
                    bit = 0;
                    ch = 0;
            }
        }
        return geohash;
    }

    /**
     * Gets a string with the requested neighbor of a given GeoHash string
     * 
     * @param direction Which direction the neighbor is in
     * @param hash The geohash to calculate the neighbor of. Defaults to the current object's GeoHash
     * @returns A string representing the requested neighbor at the same precision as the original hash
     */
    getNeighborAsHashString(direction: 'n'|'s'|'e'|'w'|'nw'|'ne'|'se'|'sw', hash:string = this.geohash): string{
        const lastChar = hash.slice(-1);
        const evenness = ((hash.length % 2) ? 'odd' : 'even');
        let base = hash.substr(0, hash.length - 1);
        let dir: 'n'|'s'|'e'|'w'; 
        switch(direction){
            case 'n': case 's': case 'e': case 'w':
                dir = direction; // removes a type issue 
                if(this.BORDER[direction][evenness].indexOf(lastChar) != -1) {
                    base = this.getNeighborAsHashString(direction, base)
                }
                break;
            case 'nw':
                base = this.getNeighborAsHashString('n', hash)
                base = this.getNeighborAsHashString('w', base)
                return base;
                break;
            case 'ne':
                base = this.getNeighborAsHashString('n', hash)
                base = this.getNeighborAsHashString('e', base)
                return base;
                break;
            case 'se':
                base = this.getNeighborAsHashString('s', hash)
                base = this.getNeighborAsHashString('e', base)
                return base;
                break;
            case 'sw':
                base = this.getNeighborAsHashString('s', hash)
                base = this.getNeighborAsHashString('w', base)
                return base;
                break;
        }
        return base + this.BASE32[this.NEIGHBORS[dir][evenness].indexOf(lastChar)];
    }

    /**
     * Returns a list of all string geohashes surrounding a center geohash
     * @param hash The hash you want the neighbors for. Defaults to the current object's saved geohash
     * @returns 8 string values representing the neighboring geohashes at the given resolution of the input hash. They are ordered starting in the North West corner and going clockwise around (nw, n, ne, etc)
     */
    getAllNeighborsAsHashStrings(hash:string = this.geohash): string[]{
        return [
            this.getNeighborAsHashString('nw', hash),
            this.getNeighborAsHashString('n', hash),
            this.getNeighborAsHashString('ne', hash),
            this.getNeighborAsHashString('e', hash),
            this.getNeighborAsHashString('se', hash),
            this.getNeighborAsHashString('s', hash),
            this.getNeighborAsHashString('sw', hash),
            this.getNeighborAsHashString('w', hash)
        ]
    }

    private countHashesUntilDistance(distance: number, direction: 'n'|'s'|'e'|'w', points: number=1):number
    {
        let hash = this.geohash
        let counter = 0
        let pointsInScope = 5
        while(pointsInScope >= points){
            counter++
            hash = this.getNeighborAsHashString(direction, hash)
            let currentBlock = new GeoHash(hash)
            pointsInScope = currentBlock.getAllCoordinates().map(o=>o.distanceTo(this.centroid)).filter(o => o <= distance).length
        }

        return counter
    }

    /**
     * Calculates all geeohash strings within a given radius
     * @param distance How far away to look
     * @param hash the starting hash to look at
     * @param method how do we calculate if a hash is inside: 'any' means that any part of the block is in range, 'mostly' means 3 or more points are in range, and 'entirely' means all points are in range.
     * @returns A string array with a list of hashes that meet the criteria
     */
    getAllHashStringsWithinRadius(distance: number, points: 1|2|3|4|5 = 1): string[]{
        // this is not a smart algorythm. It searches North and South until a hash goes out of scope
        // and sets that as an upper and lower bound offset. It then does the same to the West, 
        // and sets that distance as the bound for west and east. This gives us a box to search in. 
        // We pull in the box one row at a time and filter it by how many points are within the distance

        // This can be easily optimized by breaking this out into spherical coordinates, and working that way, 
        // but I can't be assed for the 10% improvement in speed

        const searchNorth = this.countHashesUntilDistance(distance, 'n', points)
        const searchSouth = this.countHashesUntilDistance(distance, 's', points)
        const searchWest = this.countHashesUntilDistance(distance, 'w', points)

        let hashes: GeoHash[] = []

        // North
        let currentRow = this.geohash
        for (let northCounter = 0; northCounter < searchNorth; northCounter++){
            hashes.push(new GeoHash(currentRow))

            //East and West
            let currentWest = currentRow;
            let currentEast = currentRow;
            for(let westCounter = 0; westCounter < searchWest; westCounter++){
                currentWest = this.getNeighborAsHashString('w', currentWest)
                currentEast = this.getNeighborAsHashString('e', currentEast)
                hashes.push(new GeoHash(currentWest))
                hashes.push(new GeoHash(currentEast))
            }
            currentRow = this.getNeighborAsHashString('n', currentRow)
        }

        //South 
        currentRow = this.getNeighborAsHashString('s', this.geohash)
        for (let southCounter = 0; southCounter < searchNorth; southCounter++){
            hashes.push(new GeoHash(currentRow))

            //East and West
            let currentWest = currentRow;
            let currentEast = currentRow;
            for(let westCounter = 0; westCounter < searchWest; westCounter++){
                currentWest = this.getNeighborAsHashString('w', currentWest)
                currentEast = this.getNeighborAsHashString('e', currentEast)
                hashes.push(new GeoHash(currentWest))
                hashes.push(new GeoHash(currentEast))
            }
            currentRow = this.getNeighborAsHashString('s', currentRow)
        }

        // and filter
        let hashesInRange = hashes.filter(o => o.getAllCoordinates().map(o=>o.distanceTo(this.centroid)).filter(o => o <= distance).length >= points)
        return hashesInRange.map(o => o.geohash)
    }
}