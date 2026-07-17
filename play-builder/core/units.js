// Yards <-> world units. Confirmed from war_room_test.html: the field is a real
// plane in field units. We use a clean 1 yard = 1 world unit, midfield (the 50)
// at z = 0. Every placement/drop is specified in YARDS and lands correctly.
export const FIELD = {
  HALF_WIDTH: 26.667,   // 53.33 yd wide -> x = ±26.667
  MARGIN_X: 28,         // sideline apron edge
  GOAL_Z: 50,           // goal lines at z = ±50 (100 yд between them, 50 = midfield)
  BACK_Z: 60,           // back of end zones at z = ±60 (10 yд end zones)
  EDGE_Z: 63,           // plane edge (a little past the end zones)
};

// A yard-line number (0..100, goal line to goal line; 50 = midfield) -> world z.
// Offense drives toward +z (the far goal at z = +50).
export const yardLineToZ = (yardLine) => yardLine - 50;

// The offense line of scrimmage: the offense's own 25 (backed up from midfield),
// still driving toward +z (the Jumbotron end). More runway for short-form clips.
export const LOS_YARD = 25;
export const LOS_Z = yardLineToZ(LOS_YARD); // -25

// The ball spot (left hash). Formation + ball shift onto it; the O-line/D-line
// center on it too. Shared so offense + defense line up nose-to-nose.
export const SNAP_X = -6.67;

// Depth in yards from the LOS, toward the defense (+) or the QB/backfield (-).
export const depthToZ = (yards, losZ = LOS_Z) => losZ + yards;

// Across-the-field position from a normalized t in [-1, 1] (sideline to sideline).
export const acrossToX = (t) => t * FIELD.HALF_WIDTH;
export const xToAcross = (x) => x / FIELD.HALF_WIDTH;

// Clamp a world x inside the sidelines.
export const clampX = (x) => Math.max(-FIELD.HALF_WIDTH, Math.min(FIELD.HALF_WIDTH, x));
