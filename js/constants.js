import { Incremental } from "/mjs/incremental.js";
import { WGLDD } from "/mjs/wgldd.js";
import { PROJECTILE_CARD } from "./content.js";
import { ProjectilesDeck } from "./theming.js";
import { InputTracker } from "/mjs/input3.0.js";

export const GL = new WGLDD();
export const INCREMENTAL = new Incremental();
export const GAME_INPUT = new InputTracker();
export const UI_INPUT = new InputTracker();
export function GLPrint( imageData, x, y, width, height, cropLeft, cropTop, cropRight, cropBottom, characterIndex, characterLineIndex, lineIndex )
{
    let scale = 1;
    GL.RenderRectFromSource( "tinyFont", x * scale, y * scale, width, height, 0, 0, 0, 1, 1, 1, cropLeft, cropTop, cropRight, cropBottom, 0 );
}

// stores image fonts loaded in index setup
export let IMAGE_FONT = {};


export let CURSOR_DATA = null;

/**
 * @param {WGLDD} context
 * @param {ProjectilesDeck} deck
 * @param {number} x
 * @param {number} y
 * @param {InputTracker} inputTracker
 */
export function UIProjectilesDeck( context, deck, x, y, inputTracker=UI_INPUT )
{
    let hoverCard = null;
    let mouseX = inputTracker.MouseX();
    let mouseY = inputTracker.MouseY();
    for ( let i = 0; i < deck.size; i++ ) {
        let sx = x + 21 * i;
        let sy = y;
        let size = 10;
        context.Render( "card_backing", sx, sy );
        if ( deck.order[i] != null ) {
            context.Render( deck.order[i].sprite, sx + 1, sy + 1 );
        }
        if ( mouseX >= sx - size && mouseY >= sy - size && mouseX <= sx + size && mouseY <= sy + size ) {
            if ( CURSOR_DATA != null && inputTracker.IsMouseReleased( 0 ) ) {
                if ( CURSOR_DATA.projectileCard != null ) {
                    deck.order[i] = CURSOR_DATA.projectileCard;
                    CURSOR_DATA = null;
                }
            }
            if ( deck.order[i] != null ) {
                if ( CURSOR_DATA == null && inputTracker.IsMousePressed( 0 ) ) {
                    CURSOR_DATA = { sprite: deck.order[i].sprite, projectileCard: deck.order[i] };
                    deck.order[i] = null;
                }
                hoverCard = deck.order[i];
            }
        }
    }
    if ( CURSOR_DATA != null && inputTracker.IsMouseReleased( 0 ) ) {
        if ( CURSOR_DATA.projectileCard != null ) {
            CURSOR_DATA = null;
        }
    }
    if ( hoverCard != null ) {
        IMAGE_FONT.Default.Print( GLPrint, hoverCard.name, mouseX, mouseY - 10 );
    }
}

/**
 * @param {WGLDD} context
 * @param {number} x
 * @param {number} y
 * @param {InputTracker} inputTracker
 */
export function UIProjectilesCardLibrary( context, x, y, inputTracker=UI_INPUT )
{
    let hoverCard = null;
    let projectilesCards = Object.entries( PROJECTILE_CARD );
    let mouseX = inputTracker.MouseX();
    let mouseY = inputTracker.MouseY();
    for ( let i = 0; i < projectilesCards.length; i++ ) {
        let card = projectilesCards[i][1];
        let sx = x + 21 * i;
        let sy = y;
        let size = 8;
        context.Render( card.sprite, sx + 1, sy + 1 );
        if ( mouseX >= sx - size && mouseY >= sy - size && mouseX <= sx + size && mouseY <= sy + size ) {
            hoverCard = card;
        }
    }
    if ( hoverCard != null ) {
        IMAGE_FONT.Default.Print( GLPrint, hoverCard.name, mouseX, mouseY - 10 );
        if ( inputTracker.IsMousePressed( 0 ) ) {
            CURSOR_DATA = { sprite: hoverCard.sprite, projectileCard: hoverCard };
        }
    }
}