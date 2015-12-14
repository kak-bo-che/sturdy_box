// Overall Case Length
var case_length=80;

// Overall Case Height
var case_width=50;

// minimum height of case, case will most likely be greater based on panel thickness
var min_height=20;

// box material thickness
var panel_thickness=1.57; // [ 3.1, 1.55, 5.7 ]

// standoffs are mounted inside of corner pieces
var standoff_height=10;

// number of slots to use in length dimension must be odd
var length_slots=5;

// number of slots to use in width dimension must be odd
var width_slots=3;

// hole clearance for mounting corners
var hole_diameter=3.2;
var hole_size=hole_diameter/2;

var hex_hole_diameter=5.4;
var hex_hole_size=hex_hole_diameter/2;

var slop = 0;
// display flat or 3D
var flat=0; // [0, 1]

/* [Hidden] */

// clearance between parts for cutting
var part_separation=10;

// Radius to use for corners (rubber feet are 12mm on amazon)
var corner_radius=10;

// Convienience value
var offset_to_side = 1.5*corner_radius;

// Calculated values for inside dimensions of box
// (you must subtract corner radius when placing holes!)
var inner_length=case_length - 2*corner_radius - panel_thickness;
var inner_width=case_width - 2*corner_radius - panel_thickness;

// Value of front/back and left/right pieces
var side_length = case_length - 3*corner_radius;
var side_width = case_width - 3*corner_radius;

// number of corners to contain brass standoffs
var hex_corners = Math.ceil(standoff_height/panel_thickness);

// non standoff corners
var corner_pieces = Math.floor(min_height/panel_thickness) - hex_corners;

// calculated height based on material thickness
var case_height=(corner_pieces + hex_corners)*panel_thickness;

var w = [];

function corner_piece(hex_hole){
  var cutout = square([corner_radius, panel_thickness]).center().translate([corner_radius, 0]);
  var corner = circle({r:corner_radius}).center()
    .subtract(cutout)
    .subtract(cutout.rotateZ(90));
  if (hex_hole === true){
      corner = corner.subtract(circle({r:hex_hole_size, fn:6}).center().rotateZ(15));
  } else {
      corner = corner.subtract(circle({r:hole_size}).center());
  }
  return corner;
}

function rounded_square(width, height, radius){
  return hull(
    circle({r:radius}).center().translate([radius, radius]),
    circle({r:radius}).center().translate([width - radius, radius]),
    circle({r:radius}).center().translate([radius, height - radius]),
    circle({r:radius}).center().translate([width - radius, height - radius]))
}

function rounded_square_clamping_holes(length, width, radius){
  return union(
    circle({r:hole_size}).center().translate([radius, radius]),
    circle({r:hole_size}).center().translate([length - radius, radius]),
    circle({r:hole_size}).center().translate([radius, width - radius]),
    circle({r:hole_size}).center().translate([length - radius, width - radius])
  )
}

function make_slots(length, slot_count,  panel_thickness, reverse, slop){

  var slot_size=length/slot_count;
  var offset= reverse?slot_size:0;
  var odd = (slot_count%2) == 1?1:0;
  var extra = odd && !reverse?1:0;
  var slots = [];
  for (var x = 0; x < Math.floor((slot_count + extra)/2); x++){
    // console.log("length: " + length + " slot_count: " + slot_count + " slop: " + slop + " x: " + x);
    slots.push(
      CAG.rectangle({corner2:[slot_size + slop, panel_thickness]})
      .translate([2*x*slot_size + offset -slop/2, 0]));
  }
  return union(slots);
}

function side(plate_width, slots, children){
    return CAG.rectangle({corner2:[plate_width, case_height]})
        .union(make_slots(plate_width, slots, panel_thickness, true, slop).translate([0, case_height]))
        .union(make_slots(plate_width, slots, panel_thickness, true, slop).translate([0, -panel_thickness]))
        .subtract(children)
}

function width_side(children){
  return side(case_width - 3*corner_radius, width_slots, children);
}

function length_side(children){
  return side(case_length - 3*corner_radius, length_slots, children);
}

function base(children){
  var side_length = case_length - 2*offset_to_side;
  var side_width = case_width - 2*offset_to_side;
  var length_cutout = make_slots(side_length, length_slots, panel_thickness, true, slop);
  var width_cutout =  make_slots(side_width, width_slots, panel_thickness, true, slop).rotateZ(90);

  return rounded_square(case_length, case_width, corner_radius)
        .subtract(rounded_square_clamping_holes(case_length, case_width, corner_radius))
        .subtract(length_cutout
                    .translate([offset_to_side, corner_radius - panel_thickness/2 ]))
        .subtract(length_cutout
                    .translate([offset_to_side, case_width -corner_radius - panel_thickness/2 ]))
        .subtract(width_cutout
                    .translate([corner_radius + panel_thickness/2, offset_to_side]))
        .subtract(width_cutout
                    .translate([case_length - corner_radius + panel_thickness/2, offset_to_side]))
        .subtract(children)
}

function corners(){
  var rows = 4;
  var x, y;
  var pieces = [];
  var hex_pieces = [];
  for(y=0; y < rows; y++){
    for(x=0; x < corner_pieces; x++){
        pieces.push(corner_piece().translate([2*x*corner_radius + x*part_separation/2, -(2*corner_radius*y + y*part_separation)]));
    }
    for(x=0; x < hex_corners; x++){
      hex_pieces.push(corner_piece(true).translate([2*x*corner_radius + x*part_separation/2, -(2*corner_radius*y + y*part_separation)]));
    }
  }
  pieces = union(pieces);
  hex_pieces = union(hex_pieces).translate([corner_pieces*(2*corner_radius + part_separation/2) + part_separation, 0]);
  return union([pieces, hex_pieces]);
}

function cut_layout(children){
  return union(
  // Base and Top
  base(children[0]).translate([-case_length/2, -case_width/2]),
  base(children[1]).translate([-case_length/2, case_width/2 + 2*part_separation + case_height]),

  // Front and Back
  length_side(children[2]).translate([offset_to_side -case_length/2, - case_width/2 - case_height - part_separation]),
  length_side(children[3]).rotateZ(180).translate([offset_to_side + side_length -case_length/2, case_height + case_width/2 + part_separation]),

  // Left and Right
  width_side(children[4]).rotateZ(270).translate([-case_length/2 - part_separation - case_height, side_width -case_width/2 + offset_to_side]),
  width_side(children[5]).rotateZ(90).translate([+case_length/2 + part_separation + case_height, -case_width/2 + offset_to_side]),

  // Corners
  corners().translate([-case_length/2 + corner_radius, -case_width/2 - case_height - 3*part_separation])
  )
}

function text(my_string){
  var z0basis =  CSG.OrthoNormalBasis.Z0Plane();
  var l = vector_text(0,0,my_string);   // l contains a list of polylines to be drawn
  var o = [];
  l.forEach(function(pl) {                   // pl = polyline (not closed)
     o.push(rectangular_extrude(pl, {w: 1, h: 1}).projectToOrthoNormalBasis(z0basis));   // extrude it to 3D
  });
  return union(o);
}

function main(){
 var box = rounded_square(100, 100, 10).subtract(rounded_square_clamping_holes(100, 100, 10))
 box = box.subtract(make_slots(80, 5, 2, false, 0).translate([10, 10]));
 var left = width_side([text("hello").scale([0.3, 0.3, 0.3]).translate([10,10])]);
//   extruded = extruded.projectToOrthoNormalBasis(z0basis);
 var bottom = base(text('hello').translate([10, 10]));
 return cut_layout([[],[],[],[],[],[]]).center();
}