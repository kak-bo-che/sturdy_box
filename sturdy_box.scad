// Overall Case Length
case_length=200;

// Overall Case Height
case_width=100;

// minimum height of case, case will most likely be greater based on panel thickness
min_height=50;

// box material thickness
panel_thickness=3.1; // [ 3.1, 1.55, 5.7 ]

// standoffs are mounted inside of corner pieces
standoff_height=12;

// number of slots to use in length dimension must be odd
length_slots=13;

// number of slots to use in width dimension must be odd
width_slots=7;

// hole clearance for mounting corners
hole_size=3.2;

// display flat or 3D
flat=0; // [0, 1]

/* [Hidden] */

// Smoothing of Rounds
$fn=20;

// clearance between parts for cutting
part_separation=10;

// Radius to use for corners (rubber feet are 12mm on amazon)
corner_radius=10;

// Convienience value
offset_to_side = 1.5*corner_radius;

// Calculated values for inside dimensions of box
// (you must subtract corner radius when placing holes!)
inner_length=case_length - 2*corner_radius - panel_thickness;
inner_width=case_width - 2*corner_radius - panel_thickness;

// Value of front/back and left/right pieces
side_length = case_length - 3*corner_radius;
side_width = case_width - 3*corner_radius;

// number of corners to contain brass standoffs
hex_corners = ceil(standoff_height/panel_thickness);

// non standoff corners
corner_pieces = floor(min_height/panel_thickness) - hex_corners;

// calculated height based on material thickness
case_height=(corner_pieces + hex_corners)*panel_thickness;

module corner_piece(hex_hole=false){
  hex_hole_size=5.4;
  radius = corner_radius;
  difference() {
    circle(r=radius);
    translate([radius, 0]) square([radius, panel_thickness], center=true);
    rotate(90) translate([radius, 0]) square([radius, panel_thickness], center=true);
    if (hex_hole){
      circle(d=hex_hole_size, $fn=6);
    } else {
      circle(d=hole_size);
    }
  }
}

module make_slots(length, slot_count,  panel_thickness, reverse=false, slop=0){

  slot_size=length/slot_count;
  offset= reverse?slot_size:0;
  odd= (slot_count%2) == 1?1:0;
  extra = odd && !reverse?1:0;

  for(x=[0:floor((slot_count + extra)/2) - 1]){
    translate([2*x*slot_size + offset -slop/2, 0])
        square([slot_size + slop, panel_thickness]);
  }
}

module rounded_square(width, height, radius){
  hull(){
    translate([radius,         radius]) circle(r=radius);
    translate([width - radius, radius]) circle(r=radius);
    translate([radius,         height - radius]) circle(r=radius);
    translate([width - radius, height - radius]) circle(r=radius);
  }
}

module rounded_square_clamping_holes(length, width, radius, hole_size){
  translate([radius, radius]) circle(d=hole_size);
  translate([length - radius, radius]) circle(d=hole_size);
  translate([radius, width - radius]) circle(d=hole_size);
  translate([length - radius, width - radius]) circle(d=hole_size);
}


module side(plate_width, slots){
  difference(){
    union(){
      square([plate_width, case_height]);
      translate([0, case_height])
          make_slots(plate_width, slots, panel_thickness, true);
      translate([0, -panel_thickness])
          make_slots(plate_width, slots, panel_thickness, true);
    }
    children();
  }
}

module width_side(){
  side(case_width - 3*corner_radius, width_slots) children();
}

module length_side(){
  side(case_length - 3*corner_radius, length_slots) children();
}

module base(){
  side_length = case_length - 2*offset_to_side;
  side_width = case_width - 2*offset_to_side;
  difference() {
    rounded_square(case_length, case_width, corner_radius);
    rounded_square_clamping_holes(case_length, case_width, corner_radius);

    translate([offset_to_side, corner_radius - panel_thickness/2 ])
        make_slots(side_length, length_slots, panel_thickness, true);
    translate([offset_to_side, case_width -corner_radius - panel_thickness/2 ])
        make_slots(side_length, length_slots, panel_thickness, true);
    translate([corner_radius + panel_thickness/2, offset_to_side]) rotate(90)
        make_slots(side_width, width_slots, panel_thickness, true);
    translate([case_length - corner_radius + panel_thickness/2, offset_to_side]) rotate(90)
        make_slots(side_width, width_slots, panel_thickness, true);
    translate([corner_radius + panel_thickness/2, corner_radius + panel_thickness/2])
        children();
  }
}

module corners(){
  rows = 4;
  for(y=[0:rows -1]){
    for(x=[0:corner_pieces -1]){
        translate([2*x*corner_radius + x*part_separation/2, -(2*corner_radius*y + y*part_separation)]) corner_piece();
    }
    translate([corner_pieces*(2*corner_radius + part_separation/2) + part_separation, 0]){
      for(x=[0:hex_corners - 1]){
        translate([2*x*corner_radius + x*part_separation/2, -(2*corner_radius*y + y*part_separation)]) corner_piece(true);
      }
    }
  }
}

module show_height_pieces(){
  for(x=[0:corner_pieces + hex_corners - 1]){
    translate([0, x*panel_thickness]) square([panel_thickness, panel_thickness]);
  }
}

module acrylic(){
  color( "PaleTurquoise", 0.5 ) linear_extrude(height=panel_thickness) children();
}

module hex_acrylic(){
  color("Coral", 0.5) linear_extrude(height=panel_thickness) children();
}

module corner_stack(){
    for(x=[0:floor(corner_pieces/2 - 1)]){
      translate([0,0,x*panel_thickness]) acrylic() corner_piece();
    }

    for(x=[0:floor(corner_pieces/2 - 1)]){
      translate([0,0,floor(corner_pieces/2 + hex_corners)*panel_thickness]) translate([0,0,x*panel_thickness])
          acrylic() corner_piece();
    }

    for(x=[0:hex_corners - 1]){
      translate([0,0, floor(corner_pieces/2 - 1)*panel_thickness]) translate([0,0,panel_thickness+ x*panel_thickness])
          hex_acrylic() corner_piece(true);
    }
}

module box_3d(){
  // Base and Top
  acrylic() base() children(0);
  translate([0, 0, case_height+panel_thickness])
      acrylic() base() children(1);

  // Front and Back
  translate([offset_to_side, corner_radius + panel_thickness/2,panel_thickness])
      rotate([90, 0, 0]) acrylic() length_side() children(2);
  translate([offset_to_side + side_length,case_width - corner_radius + panel_thickness/2,panel_thickness])
      rotate([90, 0, 180]) acrylic() length_side() children(3);

  // Left and Right
  translate([corner_radius - panel_thickness/2, offset_to_side + side_width, panel_thickness])
      rotate([90, 0, 270]) acrylic() width_side() children(4);
  translate([case_length - corner_radius - panel_thickness/2, offset_to_side, panel_thickness])
      rotate([90, 0, 90]) acrylic() width_side() children(5);

  // Corners
  translate([corner_radius, corner_radius, panel_thickness]) corner_stack();
  translate([case_length - corner_radius, corner_radius, panel_thickness]) rotate([0,0,90]) corner_stack();
  translate([corner_radius, case_width - corner_radius, panel_thickness]) rotate([0,0,270]) corner_stack();
  translate([case_length - corner_radius, case_width - corner_radius, panel_thickness]) rotate([0,0,180]) corner_stack();

}

module cut_layout(){
  // Base and Top
  translate([-case_length/2, -case_width/2])
      base() children(0);
  translate([-case_length/2, case_width/2 + 2*part_separation + case_height])
      base() children(1);

  // Front and Back
  translate([offset_to_side -case_length/2, - case_width/2 - case_height - part_separation])
      length_side() children(2);
  translate([offset_to_side + side_length -case_length/2, case_height + case_width/2 + part_separation])
      rotate(180) length_side() children(3);

  // Left and Right
  translate([-case_length/2 - part_separation - case_height, side_width -case_width/2 + offset_to_side])
      rotate(270) width_side() children(4);
  translate([+case_length/2 + part_separation + case_height, -case_width/2 + offset_to_side])
      rotate(90) width_side() children(5);

  // Corners
  translate([-case_length/2 + corner_radius, -case_width/2 - case_height - 3*part_separation])
      corners();
}

if (flat == 1){
  acrylic() cut_layout() {
    translate([inner_length/2, inner_width/2])
        text(text="Bottom", halign = "center", valign = "center");
    translate([inner_length/2, inner_width/2])
        text(text="Top", halign = "center", valign = "center");
    translate([(side_length)/2, case_height/2])
        text(text="Front", halign = "center", valign = "center");
    translate([(side_length)/2, case_height/2])
        text(text="Back", halign = "center", valign = "center");

    translate([(side_width)/2, case_height/2])
        text(text="Left", halign = "center", valign = "center");
    translate([(side_width)/2, case_height/2])
        text(text="Right", halign = "center", valign = "center");
  }
} else {
  box_3d() {
    translate([inner_length/2, inner_width/2])
        text(text="Bottom", halign = "center", valign = "center");
    translate([inner_length/2, inner_width/2])
        text(text="Top", halign = "center", valign = "center");
    translate([(side_length)/2, case_height/2])
        text(text="Front", halign = "center", valign = "center");
    translate([(side_length)/2, case_height/2])
        text(text="Back", halign = "center", valign = "center");

    translate([(side_width)/2, case_height/2])
        text(text="Left", halign = "center", valign = "center");
    translate([(side_width)/2, case_height/2])
        text(text="Right", halign = "center", valign = "center");
  }
}

