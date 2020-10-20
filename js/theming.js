/*

projectile deck system requires
    allow modifiers to affect arbitrarily many projectiles
    triggers much be arbitrarily appliable and repeatable

*/

import { Vector } from "/mjs/bvl.js";
import { Game } from "/mjs/game.js";
import { DistanceSquared, TriangleMesh } from "/mjs/collision.js";
import { Mat4 } from "/mjs/mat4.js";
import { WGLDD } from "/mjs/wgldd.js";

export class TowerGame extends Game
{
    constructor()
    {
        super();
        this.map = new TowerGameMap();
    }
    /**
     * @param {any} dt
     */
    Update( dt )
    {
        for ( let entity of this.map.entities ) {
            entity.Update( dt );
            if ( entity.alive === false ) {
                entity.exists = false;
                this.EntityRemove( entity );
            }
        }
    }
    /**
     * @param {Entity} entity
     */
    EntityAdd( entity )
    {
        if ( this.map.entities.includes( entity ) === false ) {
            this.map.entities.push( entity );
        }
    }
    /**
     * @param {Entity} entity
     */
    EntityRemove( entity )
    {
        if ( this.map.entities.includes( entity ) === true ) {
            this.map.entities.splice( this.map.entities.indexOf( entity ), 1 );
        }
    }
}

export class Card
{
    /**
     * @param {any} name
     */
    constructor( name, sprite="card_empty", energyCost = 0, handleCallback = null )
    {
        this.name = name;
        this.energyCost = energyCost;
        this.handleCallback = handleCallback;
        this.sprite = sprite;
    }
    /** @param {Deck} deck */
    Handle( deck )
    {
        if ( this.handleCallback != null ) {
            this.handleCallback( deck );
        }
        return this;
    }
}

export class Deck
{
    constructor()
    {
        /** @type {Card[]} */
        this.order = [];
        /** @type {Card[]} */
        this.cards = [];
        /** @type {Card[]} */
        this.hand = [];
        /** @type {Card[]} */
        this.discard = [];
        this.size = 10;
        this.drawStack = 0;
    }
    Rebuild()
    {
        this.cards = this.order.slice( 0 ).filter( value => value != null );
        this.hand = [];
        this.discard = [];
    }
    /**
     * @param {number} amount
     */
    Draw( amount )
    {
        if ( this.drawStack === 0 && this.cards.length === 0 ) {
            this.Rebuild();
        }
        this.drawStack += 1;
        let toDraw = Math.min( amount, this.cards.length );
        for ( let i = 0; i < toDraw; i++ ) {
            let card = this.cards.shift();
            if ( card == null ) {
                break;
            }
            card.Handle( this );
            this.discard.push( card );
        }
        this.drawStack -= 1;
    }
}

/*
This class should only deal with the meta of spawning projectiles.
If the property can be changed on the projectile itself it should NOT be handled here
*/
export class ProjectileSpawner
{
    constructor()
    {
        /** @type {Projectile[]} */
        this.templateProjectiles = [];
        this.spread = 0;
        this.arc = 0;
        this.stackAmount = 1;
        this.stackDistance = 8;
        this.speed = 1;
        this.distance = 0;
    }
    get templateProjectile()
    {
        if ( this.templateProjectiles.length === 0 ) {
            this.NextProjectile();
        }
        return this.templateProjectiles[this.templateProjectiles.length - 1];
    }
    NextProjectile()
    {
        this.templateProjectiles.push( new Projectile() );
    }
    Clear()
    {
        this.templateProjectiles = [];
    }
    /**
     * @param {function(Projectile, number, number):void} callback
     * @param {number} x
     * @param {number} y
     * @param {any} baseAngle
     */
    Spawn( x, y, baseAngle, callback )
    {
        let now = Date.now();
        let projectileAmount = this.templateProjectiles.length;
        for ( let projectileIndex = 0; projectileIndex < projectileAmount; projectileIndex++ ) {
            let templateProjectile = this.templateProjectiles[projectileIndex];
            let projectilePosition = new Vector( x, y );
            let angle = baseAngle;
            if ( projectileAmount > 1 ) {
                let adjustedArc = Math.min( this.arc, Math.PI * 2 - Math.PI * 2 / projectileAmount );
                angle += adjustedArc / Math.max( 1, projectileAmount - 1 ) * projectileIndex - ( adjustedArc * 0.5 );
            }
            projectilePosition = projectilePosition.Add( Vector.FromAngle( angle ).Normalize().Resize( this.distance ) );
            for ( let stackIndex = 0; stackIndex < this.stackAmount; stackIndex++ ) {
                let copy = templateProjectile.Copy( new Projectile() );
                let stackOffset = new Vector( this.stackDistance, 0 ).Rotate( angle + Math.PI * 0.5 );
                let projectileStackPosition = projectilePosition.Add( stackOffset.Resize( this.stackDistance * stackIndex ) ).Subtract( stackOffset.Resize(  ( this.stackAmount - 1 )  * this.stackDistance * 0.5 ) );
                copy.position = projectileStackPosition.Clone();
                let angleOffset = ( Math.random() - 0.5 ) * copy.spread;
                copy.velocity = Vector.FromAngle( angle  + angleOffset ).Resize( copy.speed );
                if ( callback != null ) {
                    callback( copy, projectileIndex, stackIndex );
                }
            }
        }
    }
    /** @param {ProjectileSpawner} target */
    Copy( target )
    {
        target.templateProjectiles = [];
        for ( let templateProjectile of this.templateProjectiles ) {
            target.templateProjectiles.push( templateProjectile.Copy( new Projectile() ) );
        }
        target.spread = this.spread;
        target.arc = this.arc;
        target.stackAmount = this.stackAmount;
        target.stackDistance = this.stackDistance;
        target.speed = this.speed;
        target.distance = this.distance;
        return target;
    }
}

export class ProjectilesCard extends Card
{
    /**
     * @param {function(ProjectilesDeck):void} handleCallback
     * @param {string} name
     * @param {string} icon
     * @param {number} energyCost
     */
    constructor( name, icon, energyCost, handleCallback )
    {
        super( name, icon, energyCost, handleCallback );
    }
}

export class ProjectilesDeck extends Deck
{
    constructor()
    {
        super();
        this.depth = 0;
        /** @type {ProjectileSpawner[]} */
        this.spawnerStack = [];
        /** @type {ProjectileSpawner[]} */
        this.spawnerQueue = [];
    }
    get spawner()
    {
        if ( this.spawnerStack[this.depth] == null ) {
            this.spawnerStack[this.depth] = new ProjectileSpawner();
        }
        return this.spawnerStack[this.depth];
    }
    BeginProjectile()
    {
        let spawner = this.spawner;
        spawner.NextProjectile();
        this.depth += 1;
        return spawner;
    }
    EndProjectile()
    {
        this.depth -= 1;
        let spawner = this.spawner;
        if ( this.spawnerQueue.includes( spawner ) === false ) {
            this.spawnerQueue.push( spawner );
        }
        return spawner;
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} baseAngle
     * @param {{ (projectile: any): void; (arg0: Projectile, arg1: number, arg2: number): void; }} callback
     */
    SpawnQueued( x, y, baseAngle, callback )
    {
        console.log( this.spawnerQueue );
        //for ( let spawner of this.spawnerQueue ) {
        //    spawner.Spawn( x, y, baseAngle, callback );
        //}
        if ( this.spawnerQueue != null ) {
            this.spawnerQueue[0].Spawn( x, y, baseAngle, callback );
        }
        this.spawnerQueue = [];
        this.spawnerStack = [];
    }
}

export class TowerGameMap
{
    constructor()
    {
        /** @type {Entity[]} */
        this.entities = [];
    }
}

export class Entity
{
    constructor()
    {
        this.position = new Vector();
        this.scale = new Vector( 1, 1 );
        this.acceleration = new Vector();
        this.velocity = new Vector();
        this.offset = new Vector();
        this.rotation = 0;
        this.spawnFrame = 0;
        this.sprite = null;
        this.transformationMatrix = new Mat4();
        /** @type {any[]} */
        this.buckets = [];
        this.distance = 0;
        this.hit = false;
        this.isSpriteRotationVelocityBased = true;
        this.lifetime = null;
        this.exists = true;
        this.alive = true;
    }
    get mat4()
    {
        if ( this.dirtyMatrix === true ) {
            this.transformationMatrix.Identity().Batch( this.position.x, this.position.y, this.rotation, this.scale.x, this.scale.y, this.offset.x, this.offset.y );
            this.dirtyMatrix = false;
        }
        return this.transformationMatrix;
    }
    /**
     * @param {number} dt
     */
    Update( dt )
    {
        this.position = this.position.Add( this.velocity );
        if ( this.isSpriteRotationVelocityBased === true ) {
            this.rotation = this.velocity.Angle();
        }
        if ( this.lifetime != null ) {
            if ( this.lifetime > 0 ) {
                this.lifetime -= dt;
            }
            else {
                this.alive = false;
            }
        }
    }
    /** @param {WGLDD} context */
    Render( context )
    {
        context.Save();
        context.Render( this.sprite, this.position.x, this.position.y, this.rotation );
        context.Restore();
    }
    // TODO
    /**
     * @param {Entity} target
     * @returns {Entity} */
    Copy( target )
    {
        target.sprite = this.sprite;
        return target;
    }
}

export class Actor extends Entity
{
    constructor()
    {
        super();
        /** @type {TriangleMesh[]} */
        this.meshes = [];
        this.meshRadius = 0;
        this.dirtyMesh = true;
        this.dirtyMatrix = true;
        this.meshRadius = 0;
    }
    /**
     * @param {Mat4} mat4
     */
    CalculateMeshRadius( mat4 )
    {
        if ( this.dirtyMatrix === false && this.dirtyMesh === false ) {
            return this.meshRadius;
        }

        let furthest = 0;
        for ( const mesh of this.meshes ) {
            for ( const triangle of mesh.Transformed( mat4 ).triangles ) {
                let distance = DistanceSquared( triangle.x1, triangle.y1, this.position.x, this.position.y );
                if ( distance > furthest ) {
                    furthest = distance;
                }
                distance = DistanceSquared( triangle.x2, triangle.y2, this.position.x, this.position.y );
                if ( distance > furthest ) {
                    furthest = distance;
                }
                distance = DistanceSquared( triangle.x3, triangle.y3, this.position.x, this.position.y );
                if ( distance > furthest ) {
                    furthest = distance;
                }
            }
        }
        this.dirtyMesh = false;
        this.meshRadius = Math.sqrt( Math.abs( furthest ) );
        return this.meshRadius;
    }
    /**
     * @param {TriangleMesh} triangleMesh
     */
    AddMesh( triangleMesh )
    {
        this.meshes.push( triangleMesh );
        return triangleMesh;
    }
    CreateMesh()
    {
        let mesh = new TriangleMesh();
        this.meshes.push( mesh );
        return mesh;
    }
    /** @param {Actor} target */
    Copy( target )
    {
        super.Copy( target );
        return target;
    }
}

export class Projectile extends Actor
{
    constructor()
    {
        super();
        this.penetrations = 0;
        /** @type {any[]} */
        this.damagedEntities = [];
        this.sprite = "bullet_arrow";
        this.speed = 0;
        this.spread = 0;
        this.damage = 0;
        /** @type {ProjectileSpawner} */
        this.triggerSpawner = null;
    }
    /** @param {Projectile} target */
    Copy( target )
    {
        super.Copy( target );
        target.penetrations = this.penetrations;
        target.damagedEntities = this.damagedEntities;
        target.sprite = this.sprite;
        target.speed = this.speed;
        target.spread = this.spread;
        target.damage = this.damage;
        if ( this.triggerSpawner != null ) {
            target.triggerSpawner = this.triggerSpawner.Copy( new ProjectileSpawner() );
        }
        return target;
    }
}

export class Enemy extends Actor
{
    constructor()
    {
        super();
        let mesh = new TriangleMesh();
        mesh.AddPolygon( 0, 0, 32, 5 );
        this.AddMesh( mesh );
    }
    /**
     * @param {any} dt
     */
    Update( dt )
    {

    }
    /**
     * @param {number} x
     * @param {number} y
     */
    PointIntersect( x, y )
    {
        for ( let mesh of this.meshes ) {
            if ( TriangleMesh.PointIntersect( x, y, mesh ) ) {
                return true;
            }
        }
        return false;
    }
}

export class Turret
{
    constructor()
    {
        this.pilot = null;
        this.head = null;
        this.body = null;
        this.stats = null;
    }
}

export class TurretStats
{
    constructor()
    {
        this.fireRate = 0.1;
    }
}

export class TurretPilot
{
    constructor()
    {
        this.name = "Pilot";
    }
}

export class TurretHead
{
    constructor()
    {
        this.barrels = 1;
    }
}

export class TurretBody
{
    constructor()
    {

    }
}