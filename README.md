# wand_solver
For solving Noita wands. Supports multi-threading as well.

This is used by changing the URL. It has support for a lot of flags but isn't user-friendly in the slightest.

Example Queries:

?flags=quick_mutate,spells_to_power,gravity&score_these=spells_to_power,fxcrit,homing_rotate&solver=solver_accelerative_homing&projectile_limit=10&solvers=10&iterations=200&deck=HOMING_ROTATE,DIVIDE_10,HITFX_CRITICAL_WATER,RUBBER_BALL,DUPLICATE,DIVIDE_10,DIVIDE_10,DIVIDE_10,DIVIDE_4,DIVIDE_2,DIVIDE_10,HITFX_CRITICAL_WATER,PIERCING_SHOT,DUPLICATE,DUPLICATE,DUPLICATE,DIVIDE_10,DIVIDE_10,DIVIDE_4,DIVIDE_2,DIVIDE_10,SPELLS_TO_POWER,ACCELERATING_SHOT,DUPLICATE,GRAVITY
?score_these=damage&solver=solver_accelerative_homing&projectile_limit=10&solvers=10&iterations=200&deck=DIVIDE_10,HEAVY_SHOT,HEAVY_SHOT,HEAVY_SHOT,HEAVY_SHOT,HEAVY_SHOT,HEAVY_SHOT,HEAVY_SHOT,HEAVY_SHOT,HEAVY_SHOT,DUPLICATE,HEAVY_SHOT,DUPLICATE,HEAVY_SHOT,MU,MU,MU,MU,MU,MU,MU,MU,MU,HEAVY_SHOT,PIPE_BOMB

Flags:

solver
solvers
iterations
projectile_limit
mana_limit
action_limit
extra_modifiers
faster_projectiles
improvement
deck_size
decks_to_test
score_these
flags
fast_projectiles
zeta_deck
deck
info
