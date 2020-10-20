import { INCREMENTAL } from "./constants.js";
import { FORMATTER } from "/mjs/formatters.js";
import { ProjectilesCard } from "./theming.js";
import { RADDEG, DEGRAD } from "/mjs/qml.js";

INCREMENTAL.RegisterResource( "scrap", "Scrap", FORMATTER.Decimal );

export const PROJECTILE_CARD = {
    Draw2: new ProjectilesCard( "Draw 2", "card_draw2", 0, deck => deck.Draw( 2 ) ),
    Draw3: new ProjectilesCard( "Draw 3", "card_draw3", 0, deck => deck.Draw( 3 ) ),
    Draw4: new ProjectilesCard( "Draw 4", "card_draw4", 0, deck => deck.Draw( 4 ) ),
    Stack2: new ProjectilesCard( "Stack +1", "card_stack2", 0, deck => { deck.spawner.stackAmount += 1; deck.Draw( 1 ); } ),
    Stack3: new ProjectilesCard( "Stack +2", "card_stack3", 0, deck => { deck.spawner.stackAmount += 2; deck.Draw( 1 ); } ),
    Stack4: new ProjectilesCard( "Stack +3", "card_stack4", 0, deck => { deck.spawner.stackAmount += 3; deck.Draw( 1 ); } ),
    Arc5: new ProjectilesCard( "Arc + 5", "card_arc5", 0, deck => { deck.spawner.arc += 5 * DEGRAD; deck.Draw( 1 ); } ),
    Arc15: new ProjectilesCard( "Arc + 15", "card_arc15", 0, deck => { deck.spawner.arc += 15 * DEGRAD; deck.Draw( 1 ); } ),
    Arc45: new ProjectilesCard( "Arc + 45", "card_arc45", 0, deck => { deck.spawner.arc += 45 * DEGRAD; deck.Draw( 1 ); } ),
    ShapeI: new ProjectilesCard( "Formation: Behind", "card_formation_i", 0, deck => { deck.spawner.arc = 360 * DEGRAD; deck.Draw( 2 ); } ),
    ShapeW: new ProjectilesCard( "Formation: Trifurcate", "card_formation_w", 0, deck => { deck.spawner.arc = 90 * DEGRAD; deck.Draw( 3 ); } ),
    ShapeY: new ProjectilesCard( "Formation: Bifurcate", "card_formation_y", 0, deck => { deck.spawner.arc = 90 * DEGRAD; deck.Draw( 2 ); } ),
    ShapeT: new ProjectilesCard( "Formation: Above and Below", "card_formation_t", 0, deck => { deck.spawner.arc = 180 * DEGRAD; deck.Draw( 3 ); } ),
    SimpleBullet: new ProjectilesCard( "Bullet", "card_bullet_simple", 0, deck =>
    {
        let spawner = deck.BeginProjectile();
        spawner.templateProjectile.sprite = "bullet_round";
        spawner.templateProjectile.speed = 0.5;
        deck.EndProjectile();
    } ),
    TriggerBullet: new ProjectilesCard( "Bullet", "card_bullet_trigger", 0, deck =>
    {
        let spawner = deck.BeginProjectile();
        spawner.templateProjectile.sprite = "bullet_round_trigger";
        spawner.templateProjectile.speed = 1;
            let subSpawner = deck.BeginProjectile();
            subSpawner.templateProjectile.sprite = "bullet_round";
            subSpawner.templateProjectile.speed = 0.5;
        deck.EndProjectile();
        spawner.templateProjectile.triggerSpawner = subSpawner;
        deck.EndProjectile();
    } ),
    Syringe: new ProjectilesCard( "Syringe", "card_bullet_syringe", 0, deck =>
    {
        let spawner = deck.BeginProjectile();
        spawner.templateProjectile.sprite = "bullet_arrow";
        spawner.templateProjectile.speed = 1.0;
        spawner.templateProjectile.spread = 5 * DEGRAD;
        deck.EndProjectile();
    } )
}