/*

the big think list

towers
    towers based on their size (tile size) will have a different amount of module slots
    module slots 
        can either be direct modifiers for the towers projectiles / attacks or passives
    pilots
        towers can have pilots to add stat bonuses or other passive effects
    turret heads will be the determining factor in how many projectiles per shot (3 barrels = 3 projectiles)

theming
    a competition to see if you can prevent the [enemy] from making their way to the [target]
    collect points by protecting your [target] and destroying [enemy] to trade for upgrades, etc

hit areas
    cones
    circles
    points
    raycast
    complex
    area

enemies
    normal
    herd / horde (many targets)
    fast (prediction / slow shots)
    shielded (regenerative shield, require quick/multi shots)
    flying (separate pathing)

maps
    single route
    multi route
    ping pong


*/
import { SLS } from "/mjs/sls.js";
import { Boil } from "/mjs/boil.js";
import { ImageFont } from "/mjs/ifl2.0.js";
import { Triangle, TriangleMesh } from "/mjs/collision.js";
import { Color } from "/mjs/color.js";
import { Enemy, ProjectileSpawner, Projectile, TowerGame, ProjectilesDeck } from "./theming.js";
import { DEGRAD, Angle } from "/mjs/qml.js";
import { PROJECTILE_CARD } from "./content.js";
import { GL, IMAGE_FONT, UIProjectilesCardLibrary, UIProjectilesDeck, CURSOR_DATA, UI_INPUT, GAME_INPUT } from "./constants.js";

const GAME_SCALING = 2;
let paused = false;
const canvas = document.querySelector( "canvas" );
const GAME = new TowerGame();

/**
 * @param {Boil} boil
 */
function Setup( boil )
{

    GL.Setup( canvas, GAME_SCALING, {x:800, y:600} );
    boil.sls.Promise( SLS.LoadImage( "./img/sprites.png" ).then( image =>
    {
        GL.AttachTextureSource( image, "sprites" );
        GL.DefineTexture( "sprites", "cursor", 1, 25, 15, 15, 0.5, 0.5 );
        GL.DefineTexture( "sprites", "bullet_round", 1, 1, 11, 11, 0.5, 0.5 );
        GL.DefineTexture( "sprites", "bullet_round_trigger", 31, 1, 11, 11, 0.5, 0.5 );
        GL.DefineTexture( "sprites", "bullet_arrow", 13, 1, 17, 7, 0.5, 0.5 );
        GL.DefineTexture( "sprites", "enemy", 0, 32, 32, 32, 0.5, 0.5 );
        GL.DefineTexture( "sprites", "card_empty", 1, 138, 17, 17, 0.5, 0.5 );
        GL.DefineTexture( "sprites", "card_backing", 17, 25, 21, 21, 0.5, 0.5 );
        
        GL.DefineTexture( "sprites", "card_draw2", 1, 84, 17, 17, 0.5, 0.5 );
        GL.DefineTexture( "sprites", "card_draw3", 19, 84, 17, 17, 0.5, 0.5 );
        GL.DefineTexture( "sprites", "card_draw4", 37, 84, 17, 17, 0.5, 0.5 );
        //GL.DefineTexture( "sprites", "card_draw2", 57, 84, 17, 17, 0.5, 0.5 );
        GL.DefineTexture( "sprites", "card_bullet_simple", 1, 102, 17, 17, 0.5, 0.5 );
        GL.DefineTexture( "sprites", "card_bullet_syringe", 19, 102, 17, 17, 0.5, 0.5 );
        GL.DefineTexture( "sprites", "card_bullet_trigger", 37, 102, 17, 17, 0.5, 0.5 );

        GL.DefineTexture( "sprites", "card_formation_y", 1, 120, 17, 17, 0.5, 0.5 );
        GL.DefineTexture( "sprites", "card_formation_w", 19, 120, 17, 17, 0.5, 0.5 );
        GL.DefineTexture( "sprites", "card_formation_i", 37, 120, 17, 17, 0.5, 0.5 );
        GL.DefineTexture( "sprites", "card_formation_t", 55, 120, 17, 17, 0.5, 0.5 );

        GL.DefineTexture( "sprites", "card_stack2", 1, 156, 17, 17, 0.5, 0.5 );
        GL.DefineTexture( "sprites", "card_stack3", 19, 156, 17, 17, 0.5, 0.5 );
        GL.DefineTexture( "sprites", "card_stack4", 37, 156, 17, 17, 0.5, 0.5 );

        GL.DefineTexture( "sprites", "card_arc5", 1, 174, 17, 17, 0.5, 0.5 );
        GL.DefineTexture( "sprites", "card_arc15", 19, 174, 17, 17, 0.5, 0.5 );
        GL.DefineTexture( "sprites", "card_arc45", 37, 174, 17, 17, 0.5, 0.5 );

        /*
        GL.AttachTextureSource( image, "sprites" );
        GL.DefineTexture( "sprites", "flashlight", 177, 177, 78, 78, 0.5, 0.5 );
        GL.DefineTextures( "sprites", [
            "tile0", "tile1", "tile2", "tile3",
            "tile4", "tile5", "tile6", "tile7",
            "tile8", null, null, null,
            "tile9", "tile10", "tile11", "tile12"
        ], 1, 1, 16, 16, 4, 4, 1, 0.5, 0.5 );
        */
    } ) );
    boil.sls.Promise( SLS.LoadImage( "./img/atex.png" ).then( image =>
    {
        GL.SetAlphaTexture( image );
    } ) );
    boil.sls.Promise( SLS.LoadXHTTP( "/fonts/tinyFont.ifl" ).then( data =>
    {
        //imageFont = ImageFont.FromImage( image, characterStringTextrea.value, -1, undefined, undefined, undefined, 0xFF00FF );
        IMAGE_FONT.Default = ImageFont.Import( data );
        boil.sls.Promise( SLS.LoadImage( IMAGE_FONT.Default.src ).then( image => 
        {
            GL.AttachTextureSource( image, "tinyFont" );
        } ) );
    } ) );

    UI_INPUT.Setup( window, GL.canvas );
    UI_INPUT.SetMouseScaling( 1 / GAME_SCALING, 1 / GAME_SCALING );
    GAME_INPUT.Setup( window, GL.canvas );
    GAME_INPUT.SetMouseScaling( 1 / GAME_SCALING, 1 / GAME_SCALING );
}

let enemy = new Enemy();
/** @type {ProjectilesDeck} */
let testDeck;
let t = 0;
let s = 0;

function Initialize()
{
    testDeck = new ProjectilesDeck();
    testDeck.order = [
        PROJECTILE_CARD.TriggerBullet,
    ];
}

function Update( dt )
{
    if ( paused === false ) {
        const dtt = dt / 1000;
    }
    enemy.position.x = Math.cos( Date.now() / 1000 ) * 100 + 100;
    enemy.position.y = 100;
    enemy.dirtyMatrix = true;

    /*
    let now = Date.now();
    if ( now - t >= 100 ) {
        t = now;
        let spawner = new ProjectileSpawner();
        //spawner.spread = Math.sin( now / 6000 ) * 10 * DEGRAD;
        spawner.stackAmount = Math.floor(s / 10) % 3 + 1;
        //spawner.spread = 2 * DEGRAD;
        spawner.arc = (36 * s % 360) * DEGRAD;
        spawner.amount = s % 10 + 1;
        spawner.Spawn( GL.targetSize.x / 2 / GL.scale, GL.targetSize.y / 2 / GL.scale, 0, ( projectile ) =>
        {
            projectile.lifetime = 1000;
            GAME.EntityAdd( projectile )
        } );
        s += 1;
    }
    */
    
    let mouseX = GAME_INPUT.MouseX( GL.canvas );
    let mouseY = GAME_INPUT.MouseY( GL.canvas );

    if ( GAME_INPUT.IsMousePressed( 0 ) === true ) {
        let px = GL.targetSize.x / 2 / GL.scale;
        let py = GL.targetSize.y / 2 / GL.scale;
        let angle = Angle( px, py, mouseX, mouseY );
        testDeck.Draw( 1 );
        testDeck.SpawnQueued( px, py, angle, projectile => GAME.EntityAdd( projectile ) );
    }

    GAME.Update( dt );

    //GL.Maintain();
    //GL.Flush();
    
    GAME_INPUT.Update( dt );
}

function Render( dt )
{
    if ( paused === false ) {
        let now = performance.now();
        GL.Maintain();
        GL.Clear( 0, 0, 0, 1 );
        let mouseX = UI_INPUT.MouseX();
        let mouseY = UI_INPUT.MouseY();
        //GL.Render( "bullet_arrow", mouseX, mouseY );
        GL.Save();
        for ( let mesh of enemy.meshes ) {
            //mesh = mesh.Transformed( enemy.mat4 );
            //let collision = TriangleMesh.PointIntersect( mouseX, mouseY, mesh );
            //if ( collision === true ) {
            //    GL.RenderTriangles( mesh.triangles, Color.FromRGB( 255, 0, 0 ) );
            //}
            //else {
            //    GL.RenderTriangles( mesh.triangles );
            //}
        }
        for ( let entity of GAME.map.entities ) {
            entity.Render( GL );
        }
        GL.Restore();

        UIProjectilesDeck( GL, testDeck, 13, 13 );
        UIProjectilesCardLibrary( GL, 13, 33 );
        if ( CURSOR_DATA != null && CURSOR_DATA.sprite != null ) {
            GL.Render( CURSOR_DATA.sprite, mouseX, mouseY );
        }
        else
        {
            GL.Render( "cursor", mouseX, mouseY );
        }

        GL.Flush();
        //GL.Maintain();
        //imageFont.Print( WGLDDPrint, `DEBUG MESSAGE` );
        //GL.Flush();
        UI_INPUT.Update( dt );
    }
}

function Refresh() { }

//window.onblur = () => paused = true;
//window.onfocus = () => paused = false;

window.onload = () =>
{
    new Boil( Setup, Initialize, Update, Render, Refresh, 16, 4, 0, 1 ).Run();
}