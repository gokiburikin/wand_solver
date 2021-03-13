const INFO_TEXT = document.querySelector(".info").firstChild;
const BEST_INFO_TEXT = document.querySelector(".best_info").firstChild;
const FORMATTER = {
    Decimal: new Intl.NumberFormat( "en", { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 3 } ).format,
}

let url = new URL( window.location.href );
let query = new URLSearchParams( url.search );

const QUERY_SOLVER_PATH = `./js/${query.get( "solver" )}.js` ?? "./js/solver.js";
const QUERY_SOLVERS = Number( query.get( "solvers" ) ?? 1 );
const QUERY_SOLVER_ITERATIONS = Number( query.get( "iterations" ) ?? 100 );
const QUERY_PROJECTILE_LIMIT = Number( query.get( "projectile_limit" ) ?? 9999 );
const QUERY_MANA_LIMIT = Number( query.get( "mana_limit" ) ?? 20000 );
const QUERY_ACTION_LIMIT = Number( query.get( "action_limit" ) ?? 100000 );
const QUERY_EXTRA_MODIFIERS = query.get( "extra_modifiers" )?.split(",") ?? [];
const QUERY_FASTER_PROJECTILES = Number( query.get( "faster_projectiles" ) ?? 0 );
const QUERY_IMPROVEMENT_THRESHOLD = Number( query.get( "improvement" ) ?? 500 );
const QUERY_DECK_SIZE = Number( query.get( "deck_size" ) ?? 25 );
const QUERY_DECKS_TO_TEST = Number( query.get( "decks_to_test" ) ?? -1 );
const QUERY_SCORE_THESE = query.get( "score_these" )?.split(",") ?? [];
const QUERY_FLAGS = query.get( "flags" )?.split(",") ?? [];
for ( let i = 0; i < QUERY_FASTER_PROJECTILES; i++ ){ QUERY_EXTRA_MODIFIERS.push( "fast_projectiles" ); }

let best_deck_data = {};
let best_deck_score = 0;
let QUERY_ZETA_DECK = query.get( "zeta_deck" )?.split(",") ?? [];
let QUERY_WAND_DECK = query.get( "deck" )?.split(",") ?? [];
if ( QUERY_FLAGS.indexOf("info") === -1 )
{
    while ( QUERY_WAND_DECK.length < QUERY_DECK_SIZE ){
        QUERY_WAND_DECK.push( "DAMAGE" );
    }
}

/*[
    "DIVIDE_10",
    "DUPLICATE",
    "DUPLICATE",
    "DUPLICATE",
    "DUPLICATE",
    "HITFX_CRITICAL_WATER",
    "HEAVY_SHOT",
    "HITFX_CRITICAL_WATER",
    "HITFX_CRITICAL_WATER",
    "MU",
    "MU",
    "LIGHT_SHOT",
    "CHAOTIC_ARC",
    "PIERCING_SHOT",
    "HEAVY_SHOT",
    "MU",
    "MU",
    "RUBBER_BALL",
    "ACCELERATING_SHOT",
    "HOMING_ROTATE",
    "LIGHT_SHOT",
    "MU",
    "MU",
    "MU",
    "HEAVY_SHOT",
];
*/

/*[
    "DIVIDE_10",
    "DUPLICATE",
    "DUPLICATE",
    "DUPLICATE",
    "DUPLICATE",
    "HITFX_CRITICAL_WATER",
    "HEAVY_SHOT",
    "HITFX_CRITICAL_WATER",
    "HITFX_CRITICAL_WATER",
    "MU",
    "MU",
    "LIGHT_SHOT",
    "CHAOTIC_ARC",
    "PIERCING_SHOT",
    "HEAVY_SHOT",
    "MU",
    "MU",
    "RUBBER_BALL",
    "ACCELERATING_SHOT",
    "HOMING_ROTATE",
    "LIGHT_SHOT",
    "MU",
    "MU",
    "MU",
    "HEAVY_SHOT",
];*/

const SOLVER_COUNT = QUERY_SOLVERS ?? 10;
let solvers = [];
let solvers_data = [];

for ( let i=0; i < SOLVER_COUNT; i++ ){
    let new_solver = new Worker(QUERY_SOLVER_PATH);
    new_solver.onmessage = function(e){
        if ( e.data.type === "deck" ){
            if ( QUERY_FLAGS.indexOf( "info" ) !== -1 || e.data.score > best_deck_score )
            {
                best_deck_score = e.data.score;
                QUERY_WAND_DECK = e.data.deck;
                best_deck_data = e.data.data;
                for ( let solver of solvers ){
                    solver.postMessage( { type:"deck", deck:QUERY_WAND_DECK } );
                }
                RefreshBestInfo();
            }
        }
        if ( e.data.type === "heartbeat" ){
            solvers_data[i] = e.data;
            RefreshInfo();
        }
    }

    let score_these = {};
    for ( let trait of QUERY_SCORE_THESE ){ score_these[trait] = true; }
    let flags = {};
    for ( let trait of QUERY_FLAGS ){ flags[trait] = true; }
    new_solver.postMessage( { type: "settings",
        projectile_limit: QUERY_PROJECTILE_LIMIT,
        extra_modifiers: QUERY_EXTRA_MODIFIERS,
        iterations: QUERY_SOLVER_ITERATIONS,
        mana_limit: QUERY_MANA_LIMIT,
        action_limit: QUERY_ACTION_LIMIT,
        improvement_threshold: QUERY_IMPROVEMENT_THRESHOLD,
        decks_to_test: QUERY_DECKS_TO_TEST,
        score_these: score_these,
        flags: flags
    } );
    new_solver.postMessage( { type: "deck", deck: QUERY_WAND_DECK, zeta_deck: QUERY_ZETA_DECK } );
    solvers.push( new_solver );
}

function RefreshInfo(){

    let info_string = "";
    let decks_counted = 0;
    let solver_data_string = "";
    for ( let [solver_index,solver_data] of solvers_data.entries() ){
        if (solver_data != null ) {
            decks_counted += solver_data?.decks_tested ?? 0;
            solver_data_string += `Solver ${solver_index+1}: ${solver_data.shuffles} (${solver_data.shuffles_since_last_solve}) Shuffles - ${solver_data.same_deck_shuffles} Mutations - ${FORMATTER.Decimal(solver_data.best_deck_score)} Best Deck Score\n`;
        }
    }
    info_string += `Decks Tested: ${FORMATTER.Decimal( decks_counted )}\n${solver_data_string}`;
    INFO_TEXT.nodeValue = info_string;
}

function RefreshBestInfo(){
    let info_string = "";

    if ( best_deck_data ){
        for ( let [k,v] of Object.entries( best_deck_data ) ){
            info_string = info_string + `${k}\t${v.toString()}\n`;
        }
    }

    let best_deck_string = "";
    let compact_deck_string = "";
    for ( let [k,v] of QUERY_WAND_DECK.entries() )
    {
        best_deck_string = `${best_deck_string}[${k}]={action_id="${v}"},\n`;
        compact_deck_string = compact_deck_string + v +",";
    }

    info_string += `\n${best_deck_string}\n\n${compact_deck_string.substr(0,compact_deck_string.length-1)}`;

    document.title = "best: "+best_deck_data["Deck Score"];

    BEST_INFO_TEXT.nodeValue = info_string;
}