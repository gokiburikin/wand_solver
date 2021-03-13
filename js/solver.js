{

function QMLRandom( minimum, maximum, decimals ) {
    if ( decimals == null ) {
        return minimum + Math.random() * ( maximum - minimum );
    } else {
        let multiplier = Math.pow( 10, decimals );
        let value = minimum + Math.random() * ( maximum - minimum + 1 );
        return Math.floor( value * multiplier ) / multiplier;
    }
}
const FORMATTER = {
    Integer: new Intl.NumberFormat( "en", { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 0 } ).format,
    Decimal: new Intl.NumberFormat( "en", { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 3 } ).format,
    Precision: new Intl.NumberFormat( "en", { style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 9 } ).format,
}
function Random( min, max ) { return QMLRandom( min, max, 0 ); }

const ACTION_TYPE_PROJECTILE            = 0;
const ACTION_TYPE_STATIC_PROJECTILE     = 1;
const ACTION_TYPE_MODIFIER              = 2;
const ACTION_TYPE_DRAW_MANY             = 3;
const ACTION_TYPE_MATERIAL              = 4;
const ACTION_TYPE_OTHER                 = 5;
const ACTION_TYPE_UTILITY               = 6;
const ACTION_TYPE_PASSIVE               = 7;
const ACTION_DRAW_RELOAD_TIME_INCREASE  = 0;
const ACTION_MANA_DRAIN_DEFAULT         = 10;

const WAND_MANA = 5000;
const WAND_CAPACITY = 25;
const WAND_CAST_DELAY = -21;
const WAND_RECHARGE_TIME = -21;
const WAND_MANA_RECHARGE_SPEED = 5000;
const WAND_SPELLS_PER_CAST = 1;
const WAND_SHUFFLE = false;
let wand_deck = [];
let last_wand_deck = null;
let zeta_actions = [
	"HOMING_ACCELERATING"
];

const OPTIONS = {
    DontShuffleFirstTime: true,
    ShuffleWand: true,
    MutateWand: true,
    MutateScoreThreshold: 0,
    ProjectileScoreThreshold: 1000,
    ProjectileLimit: 100,
    AutoOptimize: true,
    SolverIterations: 100,
	MinimizeSpells: 0,
	ScoreSpeed: false,
	ScoreMana: false,
	ManaLimit: false,
	ImprovementThreshold: 500,
};

let required_actions = {
    ["PIERCING_SHOT"]: true,
    ["HOMING_ROTATE"]: true,
    ["ACCELERATING_SHOT"]: true,
    ["MATERIAL_WATER"]: true,
};

let mutate_actions = [
    "MU",
    "DIVIDE_2",
    "DIVIDE_3",
    "DIVIDE_4",
    "DIVIDE_10",
    "DUPLICATE",
    "HITFX_CRITICAL_WATER",
    "HEAVY_SHOT",
    //"LIGHT_SHOT",
    //"SPEED",
    "DAMAGE",
    "HOMING_ACCELERATING",
    //"DAMAGE_RANDOM",
    "CHAOTIC_ARC",
    "ZETA",
    "ALPHA",
    "GAMMA",
    "OMEGA",
    //"PINGPONG_PATH",
    //"LIFETIME",
    //"LIFETIME_DOWN",
];

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

let before_mutation = [];
let last_deck = [];
let last_deck_score = 0;
let last_best_deck = [];
let best_deck = [];
let last_best_deck_score = 0;
let best_deck_score = 0;
let best_deck_data = {};
let speed_multiplier_floor = 0.00205;
let shuffles = 0;
let shuffles_since_last_solve = 0;
let same_deck_shuffles = 0;
let first_build = true;
let called_actions = [];
let actions = [];
let actions_map = {};
let current_action = null;
let deck = [];
let discarded = [];
let hand = [];
let c = {};
let mana = 0;
let total_shot_mana = 0;
let shot_mana = 0;
let shot_effects = {};
let dont_draw_actions = false;
let force_stop_draws = false;
let playing_permanent_card = false;
let start_reload = false;
let reloading = false;
let got_projectiles = false;
let active_extra_modifiers = [];
let current_reload_time = 0;
let recursion_limit = 2;
let shot_projectile_count = 0;
let root_shot = null;
let first_shot = true;
let decks_tested = 0;
//let permutations = {};
//let permutations_sum = 0;
//let permutations_count = 0;

const extra_modifiers = 
{
	critical_hit_boost: function(){
		c.damage_critical_chance = c.damage_critical_chance + 5;
	},

	damage_projectile_boost: function(){
		c.damage_projectile_mul = c.damage_projectile_mul + 0.5;
	},

	game_effect_freeze: function(){
		c.game_effect_entities = c.game_effect_entities + "data/entities/misc/effect_frozen.xml,";
	},
	
	extra_knockback: function(){
		c.knockback_force = c.knockback_force + 6;
	},
	
	lower_spread: function(){
		c.spread_degrees = c.spread_degrees - 30;
		c.speed_multiplier = c.speed_multiplier * 1.2;
		shot_effects.recoil_knockback = shot_effects.recoil_knockback + 15.0;
	},
	
	bounce: function(){
		c.bounces = c.bounces + 3;
	},
	
	projectile_homing_shooter: function(){
		c.extra_entities = c.extra_entities + "data/entities/misc/perks/projectile_homing_shooter.xml,";
	},
	
	projectile_alcohol_trail: function(){
		c.trail_material = c.trail_material + "alcohol,";
		c.trail_material_amount = c.trail_material_amount + 5;
	},
	
	fizzle: function(){
		c.extra_entities = c.extra_entities + "data/entities/misc/fizzle.xml,";
	},
	
	explosive_projectile: function(){
		c.explosion_radius                  = c.explosion_radius + 15.0;
		c.damage_explosion_add              = c.damage_explosion_add + 0.4;
		c.damage_projectile_add             = c.damage_projectile_add + 0.2;
		c.fire_rate_wait                    = c.fire_rate_wait + 40;
		c.speed_multiplier                  = c.speed_multiplier * 0.75;
		shot_effects.recoil_knockback       = shot_effects.recoil_knockback + 30.0;
	},
	
	projectile_fire_trail: function(){
		c.trail_material = c.trail_material + "fire,";
		c.trail_material_amount = c.trail_material_amount + 5;
	},
	
	projectile_acid_trail: function(){
		c.trail_material = c.trail_material + "acid,";
		c.trail_material_amount = c.trail_material_amount + 5;
	},
	
	projectile_oil_trail: function(){
		c.trail_material = c.trail_material + "oil,";
		c.trail_material_amount = c.trail_material_amount + 5;
	},
	
	projectile_water_trail: function(){
		c.trail_material = c.trail_material + "water,";
		c.trail_material_amount = c.trail_material_amount + 5;
	},
	
	projectile_gunpowder_trail: function(){
		c.trail_material = c.trail_material + "gunpowder_unstable,";
		c.trail_material_amount = c.trail_material_amount + 5;
	},
	
	projectile_poison_trail: function(){
		c.trail_material = c.trail_material + "poison,";
		c.trail_material_amount = c.trail_material_amount + 5;
	},
	
	projectile_lava_trail: function(){
		c.trail_material = c.trail_material + "lava,";
		c.trail_material_amount = c.trail_material_amount + 5;
	},
	
	gravity: function(){
		c.gravity = c.gravity + 600.0;
	},
	
	antigravity: function(){
		c.gravity = c.gravity - 600.0;
	},
	
	duplicate_projectile: function(){
		let data = hand[hand.length];
		
		//SetRandomSeed( GameGetFrameNum(), GameGetFrameNum() - 523 );
		
		if ( ( data != null ) && ( Random( 1, 2 ) == 1 ) ) {
			data.action();
        }
	},
	
	high_spread: function(){
		c.spread_degrees = c.spread_degrees + 30;
	},
	
	extreme_spread: function(){
		c.spread_degrees = c.spread_degrees + 80;
	},
	fast_projectiles: function(){
		c.speed_multiplier = c.speed_multiplier * 1.75;
	}
}

function check_recursion( data, rec_ ){
	let rec = rec_ ?? 0;
	
	if ( data != null ) {
		if ( ( data.recursive != null ) && data.recursive ) {
			if ( rec >= recursion_limit ) {
				return -1;
            } else {
				return rec + 1;
            }
        }
    }
	
	return rec;
}

function create_shot( num_of_cards_to_draw ){
	let shot = {};
	shot.state = {};
	reset_modifiers( shot.state );
	shot.num_of_cards_to_draw = num_of_cards_to_draw;
	return shot;
}

function _start_shot( current_mana ){
    called_actions = [];
    last_deck.length = 0;
    shot_projectile_count = 0;
    
    for ( let [k,v] of deck.entries() ) {
        last_deck.push( v );
    }

	root_shot = create_shot( 1 );
	c = root_shot.state;

	//ConfigGunActionInfo_Copy( state_from_game, c )
	//ConfigGunShotEffects_Init( shot_effects )

	root_shot.num_of_cards_to_draw = WAND_SPELLS_PER_CAST;

	mana = current_mana;

	if ( first_shot ) {
		order_deck();
		current_reload_time = WAND_RECHARGE_TIME;
		first_shot = false;
    }

	got_projectiles = false;

    shot_mana = current_mana;
	total_shot_mana = 0;
}

function set_current_action( action ){
	c.action_id                	 = action.id;
	c.action_name              	 = action.name;
	//c.action_description       	 = action.description;
	//c.action_sprite_filename   	 = action.sprite;
	c.action_type              	 = action.type;
	c.action_recursive           = action.recursive;
	//c.action_spawn_level       	 = action.spawn_level;
	//c.action_spawn_probability 	 = action.spawn_probability;
	//c.action_spawn_requires_flag = action.spawn_requires_flag;
	//c.action_spawn_manual_unlock = action.spawn_manual_unlock ?? false;
	c.action_max_uses          	 = action.max_uses;
	//c.custom_xml_file          	 = action.custom_xml_file;
	//c.action_ai_never_uses		 = action.ai_never_uses ?? false;

	//c.action_is_dangerous_blast  = action.is_dangerous_blast;

	//c.sound_loop_tag = action.sound_loop_tag;

	c.action_mana_drain = action.mana;
	if ( action.mana == null ) {
		c.action_mana_drain = ACTION_MANA_DRAIN_DEFAULT;
    }

	//c.action_unidentified_sprite_filename = action.sprite_unidentified
	//if (action.sprite_unidentified == null ) {
	//	c.action_unidentified_sprite_filename = ACTION_UNIDENTIFIED_SPRITE_DEFAULT;
	//}

	current_action = action;
}

function reset_modifiers( state ){
	state.action_id = "";
    state.action_name = "";
    //state.action_description = "";
    //state.action_sprite_filename = "";
    //state.action_unidentified_sprite_filename = "data/ui_gfx/gun_actions/unidentified.png";
    state.action_type = ACTION_TYPE_PROJECTILE;
    state.action_spawn_level = "";
    state.action_spawn_probability = "";
    //state.action_spawn_requires_flag = "";
    //state.action_spawn_manual_unlock = false;
    state.action_max_uses = -1;
    //state.custom_xml_file = "";
    state.action_mana_drain = 10;
    //state.action_is_dangerous_blast = false;
    state.action_draw_many_count = 0;
    //state.action_ai_never_uses = false;
    //state.state_shuffled = false;
    //state.state_cards_drawn = 0;
    //state.state_discarded_action = false;
    //state.state_destroyed_action = false;
    state.fire_rate_wait = 0;
    state.speed_multiplier = 1.0;
    //state.child_speed_multiplier = 1.0;
    state.dampening = 1;
    state.explosion_radius = 0;
    state.spread_degrees = 0;
    state.pattern_degrees = 0;
    state.screenshake = 0;
    state.recoil = 0;
    state.damage_melee_add = 0.0;
    state.damage_projectile_add = 0.0;
    state.damage_electricity_add = 0.0;
    state.damage_fire_add = 0.0;
    state.damage_explosion_add = 0.0;
    state.damage_critical_chance = 0;
    state.damage_critical_multiplier = 0.0;
    state.explosion_damage_to_materials = 0;
    state.knockback_force = 0;
    state.reload_time = 0;
    state.lightning_count = 0;
    state.material = "";
    state.material_amount = 0;
    state.trail_material = "";
    state.trail_material_amount = 0;
    state.bounces = 0;
    state.gravity = 0;
    state.light = 0;
    state.blood_count_multiplier = 1.0;
    state.gore_particles = 0;
    state.ragdoll_fx = 0;
    state.friendly_fire = false;
    state.physics_impulse_coeff = 0;
    state.lifetime_add = 0;
    state.sprite = "";
    state.extra_entities = "";
    state.game_effect_entities = "";
    state.sound_loop_tag = "";
    state.projectile_file = "";
    state.fxcrit_chance = 1;
}

function move_discarded_to_deck()
{
    for ( let action of discarded ){
        deck.push( action );
    }
	discarded.length = 0;
}

function build_deck( action_ids ){
    let deck = [];

    let adjusted_action_ids = action_ids.slice();
    if ( first_build === false || OPTIONS.DontShuffleFirstTime === false ){
        if ( OPTIONS.ShuffleWand && action_ids.length > 1 ) {
			if ( OPTIONS.MinimizeSpells && Math.random() < 0.1 ) {
            	trim_table( Random, adjusted_action_ids, Random( 0, 1 ) );
			}
            if ( OPTIONS.MutateWand && best_deck_score >= OPTIONS.MutateScoreThreshold ) {
                mutate_table( Random, adjusted_action_ids, Random( 0, 1 ) );
            }
            nudge_table( Random, adjusted_action_ids, Random( 0, 3 ) );

            shuffles = shuffles + 1;
			shuffles_since_last_solve = shuffles_since_last_solve + 1;
            same_deck_shuffles = same_deck_shuffles + 1;
        }
    }
    first_build = false;

    last_wand_deck = adjusted_action_ids.slice();

    for ( let action_id of adjusted_action_ids ){
        deck.push( actions_map[action_id] );
    }
    return deck;
}

function order_deck()
{
    if ( WAND_SHUFFLE ){
		let rand = Random;
	    let iterations = deck.length;
	    let new_deck = [];

	    for ( let i = iterations; i > 1; i-- ){ // looping from iterations to 1 (inclusive)
			let index = rand( 1, i );
			let action = deck[ index-1 ];
            deck.splice( i, 1 );
            new_deck.push( action );
        }

		deck = new_deck;
    } else {
        deck.sort( ( a, b ) => a.deck_index - b.deck_index );
    }
}

function play_action( action )
{
    hand.push( action );

	set_current_action( action );
	action.action();

	let is_projectile = false;

	if ( action.type == ACTION_TYPE_PROJECTILE ){
		is_projectile = true;
		got_projectiles = true;
    }

	if ( action.type == ACTION_TYPE_STATIC_PROJECTILE ){
		is_projectile = true;
		got_projectiles = true;
    }

	if ( action.type == ACTION_TYPE_MATERIAL ){
		is_projectile = true;
		got_projectiles = true;
    }

	if ( is_projectile ){
		for ( let modifier of active_extra_modifiers) {
			extra_modifiers[modifier]();
        }
    }

	current_reload_time = current_reload_time + ACTION_DRAW_RELOAD_TIME_INCREASE;
}

function draw_action( instant_reload_if_empty )
{
	let action = null;

	if ( deck.length <= 0 ){
		if ( instant_reload_if_empty && force_stop_draws === false ) {
			move_discarded_to_deck();
			order_deck();
			start_reload = true;
        } else {
			reloading = true
			return true;
        }
    }

	if ( deck.length > 0 ) {
		action = deck[0];
        deck.shift();
		
		// update mana
		let action_mana_required = action.mana;
		if ( action.mana == null ) {
			action_mana_required = ACTION_MANA_DRAIN_DEFAULT;
        }

		if ( action_mana_required > mana ) {
            discarded.push( action );
			return false;
        }

		if ( action.uses_remaining == 0 ){
            discarded.push( action );
			return false;
        }
		
		total_shot_mana += action_mana_required;
		mana = mana - action_mana_required;
    }

	//--- add the action to hand and execute it ---
	if ( action != null ) {
		play_action( action );
    }
	return true;
}

function draw_actions( how_many, instant_reload_if_empty ){
	if ( dont_draw_actions === false ) {
		c.action_draw_many_count = how_many;
		
		if ( playing_permanent_card && how_many == 1 ) {
			return; // SPECIAL RULE: modifiers that use draw_actions(1) to draw one more action don't result in two actions being drawn after them if the modifier is permanently attached and wand 'casts 1'
		}

		for ( let i = 1; i <= how_many; i++ ){
			let ok = draw_action( instant_reload_if_empty );
			if ( ok == false ) {
				// attempt to draw other actions
				while ( deck.length > 0 ) {
					if ( draw_action( instant_reload_if_empty ) ){
						break;
                    }
                }
            }

			if ( reloading ) {
				return;
            }
        }
    }
}

function add_projectile( entity_filename ){
	shot_projectile_count = shot_projectile_count + 1;
}

// NOTE defined above
actions = [
	{
		id          : "HOMING_ACCELERATING",
		name 		: "$action_homing_accelerating",
		type 		: ACTION_TYPE_MODIFIER,
		spawn_level                       : "1,2,3,4",
		spawn_probability                 : "0.1,0.3,0.3,0.5",
		mana : 60,
		action 		: function(){
			//c.extra_entities = c.extra_entities .. "data/entities/misc/homing_accelerating.xml,data/entities/particles/tinyspark_white_small.xml,"
			c.accelerative_homing = c.homing_rotate_index != null ? null : ( c.accelerative_homing || 0 ) + 1;
			draw_actions( 1, true );
		},
	},
    {
        id: "HEAVY_SHOT",
        name : "Heavy Shot",
        type : ACTION_TYPE_MODIFIER,
        spawn_level : "2,3,4",
        spawn_probability : "0.4,0.4,0.4",
        mana : 7,
        action : function(){
            c.damage_projectile_add = c.damage_projectile_add + 1.75;
            c.fire_rate_wait    = c.fire_rate_wait + 10;
            //c.gore_particles    = c.gore_particles + 10;
            c.speed_multiplier = c.speed_multiplier * 0.3;
            shot_effects.recoil_knockback = shot_effects.recoil_knockback + 50.0;
            //c.extra_entities = c.extra_entities + "data/entities/particles/heavy_shot.xml,";
            draw_actions( 1, true );
        },
    },
    {
		id          : "DAMAGE",
		name 		: "$action_damage",
		type 		: ACTION_TYPE_MODIFIER,
		spawn_level                       : "1,2,3,4,5",
		spawn_probability                 : "0.6,0.6,0.6,0.6,0.6",
		mana : 5,
		action 		: function(){
			c.damage_projectile_add = c.damage_projectile_add + 0.4;
			//c.gore_particles    = c.gore_particles + 5;
			c.fire_rate_wait    = c.fire_rate_wait + 5;
			//c.extra_entities    = c.extra_entities .. "data/entities/particles/tinyspark_yellow.xml,"
			shot_effects.recoil_knockback = shot_effects.recoil_knockback + 10.0;
			draw_actions( 1, true );
        },
	},
    {
		id          : "DAMAGE_RANDOM",
		name 		: "$action_damage_random",
		spawn_requires_flag : "card_unlocked_duplicate",
		type 		: ACTION_TYPE_MODIFIER,
		spawn_level                       : "3,4,5",
		spawn_probability                 : "0.6,0.6,0.6",
		mana : 15,
		action 		: function(){
			//SetRandomSeed( GameGetFrameNum(), GameGetFrameNum() + 253 )
			let multiplier = 0;
			multiplier = Random( -3, 4 ) * Random( 0, 2 );
			let result = 0;
			result = c.damage_projectile_add + 0.4 * multiplier;
			c.damage_projectile_add = result;
			//c.gore_particles    = c.gore_particles + 5 * multiplier;
			c.fire_rate_wait    = c.fire_rate_wait + 5;
			//c.extra_entities    = c.extra_entities .. "data/entities/particles/tinyspark_yellow.xml,";
			shot_effects.recoil_knockback = shot_effects.recoil_knockback + 10.0 * multiplier;
			draw_actions( 1, true );
		},
	},
    {
		id          : "LIFETIME",
		name 		: "$action_lifetime",
		type 		: ACTION_TYPE_MODIFIER,
		spawn_level                       : "3,4,5,6",
		spawn_probability                 : "0.5,0.5,0.5,0.5",
		price : 250,
		mana : 40,
		action 		: function(){
			c.lifetime_add 		= c.lifetime_add + 75;
			c.fire_rate_wait = c.fire_rate_wait + 13;
			draw_actions( 1, true );
		},
	},
	{
		id          : "LIFETIME_DOWN",
		name 		: "$action_lifetime_down",
		type 		: ACTION_TYPE_MODIFIER,
		spawn_level                       : "3,4,5,6",
		spawn_probability                 : "0.5,0.5,0.5,0.5",
		mana : 10,
		custom_xml_file : "data/entities/misc/custom_cards/lifetime_down.xml",
		action 		: function(){
			c.lifetime_add 		= c.lifetime_add - 42;
			c.fire_rate_wait = c.fire_rate_wait - 15;
			draw_actions( 1, true );
		},
	},
    {
		id          : "PINGPONG_PATH",
		name 		: "$action_pingpong_path",
		type 		: ACTION_TYPE_MODIFIER,
		spawn_level                       : "1,3,5",
		spawn_probability                 : "0.4,0.4,0.4",
		mana : 0,
		action 		: function(){
			//c.extra_entities = c.extra_entities .. "data/entities/misc/pingpong_path.xml,"
			c.lifetime_add = c.lifetime_add + 25;
			draw_actions( 1, true );
        },
	},
    {
		id          : "SINEWAVE",
		name 		: "$action_sinewave",
		type 		: ACTION_TYPE_MODIFIER,
		spawn_level                       : "2,4,6",
		spawn_probability                 : "0.4,0.4,0.4",
		mana : 0,
		action 		: function(){
			//c.extra_entities = c.extra_entities .. "data/entities/misc/sinewave.xml,";
			c.speed_multiplier = c.speed_multiplier * 2;
			draw_actions( 1, true );
		},
	},
	{
		id          : "CHAOTIC_ARC",
		name 		: "$action_chaotic_arc",
		type 		: ACTION_TYPE_MODIFIER,
		spawn_level                       : "1,3,5",
		spawn_probability                 : "0.4,0.4,0.4",
		mana : 0,
		action 		: function(){
			//c.extra_entities = c.extra_entities .. "data/entities/misc/chaotic_arc.xml,";
			c.speed_multiplier = c.speed_multiplier * 2;
			draw_actions( 1, true );
		},
	},
    {
		id          : "LIGHT_SHOT",
		name 		: "$action_light_shot",
		type 		: ACTION_TYPE_MODIFIER,
		spawn_level                       : "2,3,4",
		spawn_probability                 : "0.4,0.4,0.4",
		mana : 5,
		action 		: function(){
			c.damage_projectile_add = c.damage_projectile_add - 1.0;
			c.explosion_radius = c.explosion_radius - 10.0;
			if (c.explosion_radius < 0) {
				c.explosion_radius = 0;
			}
			c.fire_rate_wait    = c.fire_rate_wait - 3;
			c.speed_multiplier = c.speed_multiplier * 7.5;
			c.spread_degrees = c.spread_degrees - 6;
			shot_effects.recoil_knockback = shot_effects.recoil_knockback - 10.0;
			//c.extra_entities = c.extra_entities + "data/entities/particles/light_shot.xml,";
			draw_actions( 1, true );
		},
	},
    {
		id          : "PIERCING_SHOT",
		name 		: "Piercing Shot",
		type 		: ACTION_TYPE_MODIFIER,
		spawn_level                       : "2,3,4,5,6",
		spawn_probability                 : "0.6,0.6,0.6,0.6,0.6",
		mana : 140,
		action 		: function(){
			//c.extra_entities = c.extra_entities + "data/entities/misc/piercing_shot.xml,";
			c.friendly_fire		= true;
			draw_actions( 1, true );
        },
	},
    {
		id          : "HOMING_ROTATE",
		name 		: "Homing Rotate",
		type 		: ACTION_TYPE_MODIFIER,
		spawn_level                       : "2,3,4,5,6",
		spawn_probability                 : "0.4,0.4,0.4,0.4,0.4",
		mana : 40,
		action 		: function(){
			c.homing_rotate_index = c.homing_rotate_index ?? called_actions.length;
			c.homing_rotates = (c.homing_rotates ?? 0) + 1;
			//c.extra_entities = c.extra_entities + "data/entities/misc/homing_rotate.xml,data/entities/particles/tinyspark_white.xml,";
			draw_actions( 1, true );
        },
	},
    {
		id          : "SPEED",
		name 		: "$action_speed",
		type 		: ACTION_TYPE_MODIFIER,
		spawn_level                       : "1,2,3",
		spawn_probability                 : "1,0.5,0.5",
		mana : 3,
		custom_xml_file : "data/entities/misc/custom_cards/speed.xml",
		action 		: function(){
			c.speed_multiplier = c.speed_multiplier * 2.5;
			draw_actions( 1, true );
        },
	},
    {
		id          : "ACCELERATING_SHOT",
		name 		: "$action_accelerating_shot",
		description : "$actiondesc_accelerating_shot",
		type 		: ACTION_TYPE_MODIFIER,
		spawn_level                       : "2,3,4",
		spawn_probability                 : "0.5,0.5,1",
		mana : 20,
		action 		: function(){
			c.fire_rate_wait    = c.fire_rate_wait + 8;
			c.speed_multiplier = c.speed_multiplier * 0.32;
			shot_effects.recoil_knockback = shot_effects.recoil_knockback + 10.0;
			//c.extra_entities = c.extra_entities + "data/entities/misc/accelerating_shot.xml,";
			draw_actions( 1, true );
		},
	},
    {
		id          : "HITFX_CRITICAL_WATER",
		name 		: "$action_hitfx_critical_water",
		type 		: ACTION_TYPE_MODIFIER,
		spawn_level                       : "1,3,4,5",
		spawn_probability                 : "0.2,0.2,0.2,0.2",
		mana : 10,
		action 		: function(){
			//c.extra_entities = c.extra_entities + "data/entities/misc/hitfx_critical_water.xml,";
            c.fxcrit_chance = c.fxcrit_chance + 1;
			draw_actions( 1, true );
        },
	},
    {
		id          : "DUPLICATE",
		name 		: "$action_duplicate",
		type 		: ACTION_TYPE_MODIFIER,
		recursive	: true,
		spawn_level                       : "5,6,10",
		spawn_probability                 : "0.1,0.1,1",
		mana : 250,
		action 		: function( recursion_level, iteration ){
			let hand_count = hand.length;
			
			//for ( let [i,v] of hand.entries() ){
			for ( let i=0; i < hand.length; i++ ){
                let v = hand[i];
				let rec = check_recursion( v, recursion_level );
				if ( ( rec > -1 ) && ( i < hand_count ) && ( v.id != "DUPLICATE" ) ) {
					v.action( rec );
                }
			}
			
			c.fire_rate_wait = c.fire_rate_wait + 20;
			current_reload_time = current_reload_time + 20;
			
			draw_actions( 1, true );
		},
	},
    {
		id          : "ALPHA",
		name 		: "$action_alpha",
		spawn_requires_flag : "card_unlocked_duplicate",
		type 		: ACTION_TYPE_OTHER,
		recursive	: true,
		spawn_level                       : "5,6,10",
		spawn_probability                 : "0.1,0.1,1",
		mana : 30,
		action 		: function( recursion_level, iteration ){
			c.fire_rate_wait = c.fire_rate_wait + 15;
			
			let data = {};
			
			if ( discarded.length > 0 ) {
				data = discarded[0];
            } else if ( hand.length > 0 ) {
				data = hand[0];
            } else if ( deck.length > 0 ) {
				data = deck[0];
            } else {
				data = null;
            }
			
			let rec = check_recursion( data, recursion_level );
			
			if ( ( data != null ) && ( rec > -1 ) ) {
				data.action( rec );
            }
			
			//draw_actions( 1, true );
		},
	},
	{
		id          : "GAMMA",
		name 		: "$action_gamma",
		description : "$actiondesc_delta",
		sprite 		: "data/ui_gfx/gun_actions/gamma.png",
		sprite_unidentified : "data/ui_gfx/gun_actions/spread_reduce_unidentified.png",
		spawn_requires_flag : "card_unlocked_duplicate",
		type 		: ACTION_TYPE_OTHER,
		recursive	: true,
		spawn_level                       : "5,6,10",
		spawn_probability                 : "0.1,0.1,1",
		price : 200,
		mana : 30,
		action 		: function( recursion_level, iteration ){
			c.fire_rate_wait = c.fire_rate_wait + 15
			
			let data = {};
			
			if ( deck.length > 0 ) {
				data = deck[ deck.length - 1 ];
            } else if ( hand.length > 0 ) {
				data = hand[ hand.length - 1 ];
			} else {
				data = null;
            }
			
			let rec = check_recursion( data, recursion_level );
			
			if ( ( data != null ) && ( rec > -1 ) ) {
				data.action( rec );
            }
			
			//draw_actions( 1, true );
		},
	},
    {
		id          : "OMEGA",
		name 		: "$action_omega",
		spawn_requires_flag : "card_unlocked_duplicate",
		type 		: ACTION_TYPE_OTHER,
		recursive	: true,
		spawn_level                       : "5,6,10",
		spawn_probability                 : "0.1,0.1,1",
		mana : 300,
		action 		: function( recursion_level, iteration ) {
			c.fire_rate_wait = c.fire_rate_wait + 50;
			
			if ( discarded != null ) {
				for ( let data of discarded ) {
					let rec = check_recursion( data, recursion_level );
					if ( ( data != null ) && ( rec > -1 ) && ( data.id != "RESET" ) ) {
						dont_draw_actions = true;
						data.action( rec );
						dont_draw_actions = false;
					}
				}
			}
			
			if ( hand != null ) {
				for ( let data of hand ) {
					let rec = check_recursion( data, recursion_level );
					if ( ( data != null ) && ( ( data.recursive == null ) || ( data.recursive == false ) ) ) {
						dont_draw_actions = true;
						data.action( rec );
						dont_draw_actions = false;
					}
				}
			}
			
			if ( deck != null ) {
				for ( let data of deck ) {
					let rec = check_recursion( data, recursion_level );
					if ( ( data != null ) && ( rec > -1 ) && ( data.id != "RESET" ) ) {
						dont_draw_actions = true;
						data.action( rec );
						dont_draw_actions = false;
					}
				}
			}
        },
	},
    {
		id          : "MU",
		name 		: "Mu",
		type 		: ACTION_TYPE_OTHER,
		recursive	: true,
		spawn_level                       : "5,6,10",
		spawn_probability                 : "0.1,0.1,1",
		mana : 120,
		action 		: function( recursion_level, iteration ){
			c.fire_rate_wait = c.fire_rate_wait + 50;
			
			let firerate = c.fire_rate_wait;
			let reload = current_reload_time;
			let mana_ = mana;
			
			if ( discarded != null ) {
                for ( let i=0; i < discarded.length; i++ ){
                    let data = discarded[i];
					let rec = check_recursion( data, recursion_level );
					if ( ( rec > -1 ) && ( data != null ) && ( data.type == 2 ) ) {
						dont_draw_actions = true;
						data.action( rec );
						dont_draw_actions = false;
                    }
                }
            }
			
			if ( hand != null ) {
                for ( let i=0; i < hand.length; i++ ){
                    let data = hand[i];
					let rec = check_recursion( data, recursion_level );
					if ( ( rec > -1 ) && ( data != null ) && ( data.type == 2 ) ) {
						dont_draw_actions = true;
						data.action( rec );
						dont_draw_actions = false;
					}
                }
            }
			
			if ( deck != null ) {
                for ( let i=0; i < deck.length; i++ ){
                    let data = deck[i];
					let rec = check_recursion( data, recursion_level );
					if ( ( rec > -1 ) && ( data != null ) && ( data.type == 2 ) ) {
						dont_draw_actions = true;
						data.action( rec );
						dont_draw_actions = false;
                    }
                }
            }
			
			c.fire_rate_wait = firerate;
			current_reload_time = reload;
			mana = mana_;
			
			draw_actions( 1, true );
		},
	},
	{
		id          : "MATERIAL_WATER",
		name 		: "$action_material_water",
		//related_projectiles	: {"data/entities/projectiles/deck/material_water.xml"},
		type 		: ACTION_TYPE_MATERIAL,
		spawn_level                       : "1,2,3,4,5",
		spawn_probability                 : "0.4,0.4,0.4,0.4,0.4",
		price : 110,
		mana : 0,
		action 		: function(){
			add_projectile("data/entities/projectiles/deck/material_water.xml")
			c.useless_projectiles = (c.useless_projectiles ?? 0 ) + 1;
			//c.game_effect_entities = c.game_effect_entities .. "data/entities/misc/effect_apply_wet.xml,";
			c.fire_rate_wait = c.fire_rate_wait - 15;
			current_reload_time = current_reload_time - ACTION_DRAW_RELOAD_TIME_INCREASE - 10;
		},
	},
	{
		id          : "ZETA",
		name 		: "$action_zeta",
		type 		: ACTION_TYPE_OTHER,
		spawn_manual_unlock : true,
		recursive	: true,
		spawn_level                       : "5,6,10",
		spawn_probability                 : "0.1,0.1,1",
		price : 200,
		mana : 20,
		action 		: function( recursion_level, iteration ){
			let options = zeta_actions;
			
			if ( options.length > 0 ) {
				let rnd = Random( 0, options.length-1 );
				let action_id = options[rnd];
				
				let rec = check_recursion( actions_map[action_id], recursion_level );
				if ( rec > -1 ) {
					dont_draw_actions = true;
					actions_map[action_id].action( rec );
					dont_draw_actions = false;
				}
			}
			
			draw_actions( 1, true );
		},
	},
    {
		id          : "RUBBER_BALL",
		name 		: "$action_rubber_ball",
		related_projectiles	: [ "data/entities/projectiles/deck/rubber_ball.xml" ],
		type 		: ACTION_TYPE_PROJECTILE,
		spawn_level                       : "0,1,6",
		spawn_probability                 : "1,1,1",
		mana : 5,
		action 		: function(){
			add_projectile("data/entities/projectiles/deck/rubber_ball.xml");
			// damage = 0.3
			c.fire_rate_wait = c.fire_rate_wait - 2;
			c.spread_degrees = c.spread_degrees - 1.0;
        },
	},
    {
		id          : "DIVIDE_2",
		name 		: "Divide 2",
		spawn_requires_flag : "card_unlocked_divide",
		type 		: ACTION_TYPE_OTHER,
		spawn_level                       : "10",
		spawn_probability                 : "1",
		mana : 35,
		action 		: function( recursion_level, iteration ){
			c.fire_rate_wait = c.fire_rate_wait + 20;
			
			let data = {};
			
			let iter = iteration ?? 1;
			let iter_max = iteration ?? 1;
			
			if ( deck.length > 0 ) {
				data = deck[iter-1];
            } else {
				data = null;
            }
			
			let count = 2;
			if ( iter >= 5 ) {
				count = 1;
            }
			
			let rec = check_recursion( data, recursion_level );
			
			if ( ( data != null ) && ( rec > -1 ) && ( ( data.uses_remaining == null ) || ( data.uses_remaining != 0 ) ) ){
				let firerate = c.fire_rate_wait;
				let reload = current_reload_time;
				
				for ( let i=1; i <= count; i++ ){
					if ( i == 1 ) {
						dont_draw_actions = true;
                    }
					let imax = data.action( rec, iter + 1 );
					dont_draw_actions = false;
					if ( imax != null ) {
						iter_max = imax;
                    }
                }
				
				if ( ( data.uses_remaining != null ) && ( data.uses_remaining > 0 ) ) {
					data.uses_remaining = data.uses_remaining - 1;
					
					//let reduce_uses = ActionUsesRemainingChanged( data.inventoryitem_id, data.uses_remaining );
					//if (!reduce_uses) {
					//	data.uses_remaining = data.uses_remaining + 1; -- cancel the reduction
					//}
                }
				
				if ( iter == 1 ) {
					c.fire_rate_wait = firerate
					current_reload_time = reload
					
					for ( let i = 1; i <= iter_max; i++ ) {
						if ( deck.length > 0 ) {
							let d = deck[0];
                            discarded.push( d );
                            deck.shift();
                        }
                    }
                }
            }
			
			c.damage_projectile_add = c.damage_projectile_add - 0.2;
			c.explosion_radius = c.explosion_radius - 5.0;
			if ( c.explosion_radius < 0 ) {
				c.explosion_radius = 0
            }
			
			c.pattern_degrees = 5;
			
			return iter_max;
		}
    },
    {
		id          : "DIVIDE_3",
		name 		: "Divide 3",
		spawn_requires_flag : "card_unlocked_divide",
		type 		: ACTION_TYPE_OTHER,
		spawn_level                       : "10",
		spawn_probability                 : "1",
		mana : 50,
		action 		: function( recursion_level, iteration ){
			c.fire_rate_wait = c.fire_rate_wait + 35;
			
			let data = {};
			
			let iter = iteration ?? 1;
			let iter_max = iteration ?? 1;
			
			if ( deck.length > 0 ) {
				data = deck[iter-1];
            } else {
				data = null;
            }
			
			let count = 3;
			if ( iter >= 4 ) {
				count = 1;
            }
			
			let rec = check_recursion( data, recursion_level );
			
			if ( ( data != null ) && ( rec > -1 ) && ( ( data.uses_remaining == null ) || ( data.uses_remaining != 0 ) ) ){
				let firerate = c.fire_rate_wait;
				let reload = current_reload_time;
				
				for ( let i=1; i <= count; i++ ){
					if ( i == 1 ) {
						dont_draw_actions = true;
                    }
					let imax = data.action( rec, iter + 1 );
					dont_draw_actions = false;
					if ( imax != null ) {
						iter_max = imax;
                    }
                }
				
				if ( ( data.uses_remaining != null ) && ( data.uses_remaining > 0 ) ) {
					data.uses_remaining = data.uses_remaining - 1;
					
					//let reduce_uses = ActionUsesRemainingChanged( data.inventoryitem_id, data.uses_remaining );
					//if (!reduce_uses) {
					//	data.uses_remaining = data.uses_remaining + 1; -- cancel the reduction
					//}
                }
				
				if ( iter == 1 ) {
					c.fire_rate_wait = firerate
					current_reload_time = reload
					
					for ( let i = 1; i <= iter_max; i++ ) {
						if ( deck.length > 0 ) {
							let d = deck[0];
                            discarded.push( d );
                            deck.shift();
                        }
                    }
                }
            }
			
			c.damage_projectile_add = c.damage_projectile_add - 0.4;
			c.explosion_radius = c.explosion_radius - 10.0;
			if ( c.explosion_radius < 0 ) {
				c.explosion_radius = 0
            }
			
			c.pattern_degrees = 5;
			
			return iter_max;
		}
    },
    {
		id          : "DIVIDE_4",
		name 		: "Divide 4",
		spawn_requires_flag : "card_unlocked_divide",
		type 		: ACTION_TYPE_OTHER,
		spawn_level                       : "5,6,10",
		spawn_probability                 : "0.1,0.1,1",
		mana : 70,
		action 		: function( recursion_level, iteration ){
			c.fire_rate_wait = c.fire_rate_wait + 50;
			
			let data = {};
			
			let iter = iteration ?? 1;
			let iter_max = iteration ?? 1;
			
			if ( deck.length > 0 ) {
				data = deck[iter-1];
            } else {
				data = null;
            }
			
			let count = 4;
			if ( iter >= 4 ) {
				count = 1;
            }
			
			let rec = check_recursion( data, recursion_level );
			
			if ( ( data != null ) && ( rec > -1 ) && ( ( data.uses_remaining == null ) || ( data.uses_remaining != 0 ) ) ){
				let firerate = c.fire_rate_wait;
				let reload = current_reload_time;
				
				for ( let i=1; i <= count; i++ ){
					if ( i == 1 ) {
						dont_draw_actions = true;
                    }
					let imax = data.action( rec, iter + 1 );
					dont_draw_actions = false;
					if ( imax != null ) {
						iter_max = imax;
                    }
                }
				
				if ( ( data.uses_remaining != null ) && ( data.uses_remaining > 0 ) ) {
					data.uses_remaining = data.uses_remaining - 1;
					
					//let reduce_uses = ActionUsesRemainingChanged( data.inventoryitem_id, data.uses_remaining );
					//if (!reduce_uses) {
					//	data.uses_remaining = data.uses_remaining + 1; -- cancel the reduction
					//}
                }
				
				if ( iter == 1 ) {
					c.fire_rate_wait = firerate
					current_reload_time = reload
					
					for ( let i = 1; i <= iter_max; i++ ) {
						if ( deck.length > 0 ) {
							let d = deck[0];
                            discarded.push( d );
                            deck.shift();
                        }
                    }
                }
            }
			
			c.damage_projectile_add = c.damage_projectile_add - 0.6;
			c.explosion_radius = c.explosion_radius - 20.0;
			if ( c.explosion_radius < 0 ) {
				c.explosion_radius = 0
            }
			
			c.pattern_degrees = 5;
			
			return iter_max;
		}
    },
    {
		id          : "DIVIDE_10",
		name 		: "$action_divide_10",
		spawn_requires_flag : "card_unlocked_divide",
		type 		: ACTION_TYPE_OTHER,
		spawn_level                       : "10",
		spawn_probability                 : "1",
		mana : 200,
		max_uses : 5,
		action 		: function( recursion_level, iteration ){
			c.fire_rate_wait = c.fire_rate_wait + 80;
			current_reload_time = current_reload_time + 20;
			
			let data = {};
			
			let iter = iteration ?? 1;
			let iter_max = iteration ?? 1;
			
			if ( deck.length > 0 ) {
				data = deck[iter-1];
            } else {
				data = null;
            }
			
			let count = 10;
			if ( iter >= 3 ) {
				count = 1;
            }
			
			let rec = check_recursion( data, recursion_level );
			
			if ( ( data != null ) && ( rec > -1 ) && ( ( data.uses_remaining == null ) || ( data.uses_remaining != 0 ) ) ){
				let firerate = c.fire_rate_wait;
				let reload = current_reload_time;
				
				for ( let i=1; i <= count; i++ ){
					if ( i == 1 ) {
						dont_draw_actions = true;
                    }
					let imax = data.action( rec, iter + 1 );
					dont_draw_actions = false;
					if ( imax != null ) {
						iter_max = imax;
                    }
                }
				
				if ( ( data.uses_remaining != null ) && ( data.uses_remaining > 0 ) ) {
					data.uses_remaining = data.uses_remaining - 1;
					
					//let reduce_uses = ActionUsesRemainingChanged( data.inventoryitem_id, data.uses_remaining );
					//if (!reduce_uses) {
					//	data.uses_remaining = data.uses_remaining + 1; -- cancel the reduction
					//}
                }
				
				if ( iter == 1 ) {
					c.fire_rate_wait = firerate
					current_reload_time = reload
					
					for ( let i = 1; i <= iter_max; i++ ) {
						if ( deck.length > 0 ) {
							let d = deck[0];
                            discarded.push( d );
                            deck.shift();
                        }
                    }
                }
            }
			
			c.damage_projectile_add = c.damage_projectile_add - 1.5;
			c.explosion_radius = c.explosion_radius - 40.0;
			if ( c.explosion_radius < 0 ) {
				c.explosion_radius = 0
            }
			
			c.pattern_degrees = 5;
			
			return iter_max;
		},
	}
];

for ( let action of actions ) {
    actions_map[action.id] = action;
}

function nudge_table( rand, t, amount ){
    let r = Math.ceil( shuffles ** 0.5 ) % t.length;
    for ( let i=1; i <= amount; i++ ) {
        let a = rand( 1, t.length )-1;
        let b = Math.max( 1, Math.min( t.length, a + rand( -r, r ) ) ) - 1;
        [t[a], t[b]] = [t[b], t[a]];
    }
}

function trim_table( rand, t, amount ){
    for ( let i=1; i <= amount; i++ ) {
		if ( t.length > 1 )
		{
			let a = rand( 0, t.length - 1 );
			if ( required_actions[t[a]] != true ) {
				t.splice( a, 1 );
			}
		}
    }
}

function mutate_table( rand, t, amount ){
    let r = Math.ceil( shuffles ** 0.1 ) % t.length;
    let c = rand( 1, t.length ) - 1;
    for ( let i=1; i <= amount; i++ ) {
        let a = Math.max( 0, Math.min( t.length - 1, c + rand( -r, r ) ) );
        if ( required_actions[t[a]] != true ) {
            let b = rand( 1, mutate_actions.length ) - 1;
            t[a] = mutate_actions[b];
        }
    }
}

function score_function( damage, speed_multiplier, lifetime_add, mana, projectiles, fxcrit_chance, actions, accelerative_homing, homing_rotates ){
    let score = 0;
	if ( accelerative_homing === 1 )
	{
		if ( projectiles > 0 && projectiles <= OPTIONS.ProjectileLimit ) {
			if ( fxcrit_chance > 0 ){
				damage = damage * 5 + damage * (fxcrit_chance - 1);
			}
			score = score + (damage * Math.min(OPTIONS.ProjectileScoreThreshold, projectiles)) ** 0.5;
		}
		if ( OPTIONS.ScoreMana && mana > 0 ) {
			score *= 1 - ( mana / ( mana + 5000 ) ) ** 2;
		}
		if ( mana > OPTIONS.ManaLimit ){
			score = 0;
		}
		if ( OPTIONS.ScoreSpeed ){
			if ( Math.abs( speed_multiplier ) > speed_multiplier_floor ) {
				score = score / ( Math.abs( speed_multiplier ) / speed_multiplier_floor );
			} else {
				score = 0;
			}
		}
		if ( lifetime_add > -700 ) {
			if ( lifetime_add < 0 ) {
				score = score + Math.max(0, ( 600 - Math.abs( -600 - lifetime_add ) ) * 10 );
			}
		} else {
			score = 0;
		}
		if ( OPTIONS.MinimizeSpells ) {
			score = score / actions.length;
		}
		score = score * Math.min( 1, homing_rotates / 6 );
	}
    return Math.max( 0, Math.floor( score ) );
}

function register_action( state ){
    if ( OPTIONS.ShuffleWand ) {
        shot_effects.recoil_knockback = 0;
        current_reload_time = 0;
        state.fire_rate_wait = 0;
    }
    state.reload_time = current_reload_time;
	let meaningful_projectiles = shot_projectile_count - c.useless_projectiles;
    let deck_score = score_function( c.damage_projectile_add * 25, c.speed_multiplier, c.lifetime_add, total_shot_mana, meaningful_projectiles, c.fxcrit_chance, last_deck, c.accelerative_homing, c.homing_rotates );
	let improvement = deck_score - last_best_deck_score;
    last_deck_score = deck_score;
    if ( deck_score > best_deck_score ) {
        best_deck_score = deck_score;
        best_deck.length = 0;
        for ( let [k,v] of last_deck.entries() ) {
            best_deck.push( v );
        }
        let velocity_multiplier = Math.min( 1000 / c.speed_multiplier * 0.001, 200);
        let gcedge_multiplier = 75;
        let projected_damage = (c.damage_projectile_add * 25 * velocity_multiplier * 60 * gcedge_multiplier) * meaningful_projectiles;
        if ( c.fxcrit_chance > 1 )
        {
            projected_damage = (projected_damage * 5) * (c.fxcrit_chance - 1);
        } else if ( c.fxcrit_chance == 1 )
        {
            projected_damage = (projected_damage * 5);
        }
        best_deck_data = {
            ["Deck Score"]: FORMATTER.Decimal(last_deck_score),
            //["Deck Hash"]: get_permutation_hash( best_deck.map( action_data => action_data.id ) ),
            ["Projectiles"]: meaningful_projectiles,
            ["Projectile Damage"]: FORMATTER.Integer(c.damage_projectile_add * 25),
            ["Predicted DPS"]: FORMATTER.Integer(projected_damage),
            ["Predicted Boss DPS"]: FORMATTER.Integer(projected_damage * 0.2),
			["Predicted Perkless DPS"]: FORMATTER.Integer(projected_damage / 75),
            ["Predicted Perkless Boss DPS"]: FORMATTER.Integer(projected_damage / 75 * 0.2),
            ["Speed Multiplier"]: FORMATTER.Precision(c.speed_multiplier),
            ["Mana Cost"]: total_shot_mana,
            ["Lifetime Add"]: c.lifetime_add,
            ["Cast Delay"]: c.fire_rate_wait,
            ["Recharge Time"]: current_reload_time,
        };
        if ( OPTIONS.AutoOptimize ) {
			if ( deck_score <= OPTIONS.ImprovementThreshold || improvement >= OPTIONS.ImprovementThreshold )
			{
				last_best_deck_score = best_deck_score;
            	postMessage( { type:"deck", deck: best_deck.map( action => action.id ), data: best_deck_data, score: best_deck_score } );
			}
            shuffles = 0;
            same_deck_shuffles = 0;
        }
    } else {
		//if ( Math.random() < 1/shuffles_since_last_solve ){
		//	best_deck_score *= 0.96;
		//}
    }
    return state;
}

/* 

ACTUAL LOGIC TIME

*/

function Update(){
    if ( wand_deck.length > 0 ) {
        for ( let i = 0; i < OPTIONS.SolverIterations; i++ )
        {
            first_shot = true;
            discarded.length = 0;
            hand.length = 0;
            
            if ( shuffles_since_last_solve <= 100000 || same_deck_shuffles % Math.ceil( shuffles / 50000 ) === 0 ){
                last_wand_deck = wand_deck;
                same_deck_shuffles = 0;
            }
            deck = build_deck( last_wand_deck ?? wand_deck );
            _start_shot( WAND_MANA );
            draw_action( true );
            register_action(c);
            decks_tested++;
        }
    }
    setTimeout( Update, 1 );
}
Update();

function Heartbeat(){
    postMessage( { type: "heartbeat", decks_tested: decks_tested, shuffles: shuffles, same_deck_shuffles: same_deck_shuffles, shuffles_since_last_solve: shuffles_since_last_solve, best_deck_score: best_deck_score } );
    setTimeout( Heartbeat, 100 );
}
Heartbeat();

onmessage = function( e ){
    if ( e.data.type === "deck" ){
        wand_deck = e.data.deck;
        last_wand_deck = wand_deck;
        shuffles = 0;
		shuffles_since_last_solve = 0;
        same_deck_shuffles = 0;
        best_deck_score = 0;
        best_deck = [];
        decks_tested = 0;
		last_best_deck_score = 0;
    }
	else if ( e.data.type === "settings" ) {
        OPTIONS.SolverIterations = e.data.iterations;
        OPTIONS.ProjectileLimit = e.data.projectile_limit;
		active_extra_modifiers = e.data.extra_modifiers;
		OPTIONS.ShuffleWand = e.data.shuffle;
		OPTIONS.MutateWand = e.data.mutate;
		OPTIONS.MinimizeSpells = e.data.minimize;
		OPTIONS.ManaLimit = e.data.mana_limit;
		OPTIONS.ScoreMana = e.data.score_mana;
		OPTIONS.ScoreSpeed = e.data.score_speed;
		OPTIONS.ImprovementThreshold = e.data.improvement_threshold;
	}
}

postMessage( { type: "ready" } );

}