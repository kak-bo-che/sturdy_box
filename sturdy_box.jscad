function getParameterDefinitions() {
var parameters = [
    { name: 'Dimensions', type: 'group', caption: 'Overall Dimensions' },
    // Overall Case Length
     {name: 'case_length',type: 'float', initial: 80, caption: "Box Length:"},

    // Overall Case Height
    {name: 'case_width',type: 'float', initial: 50, caption: "Box Width:"},

    // minimum height of case, case will most likely be greater based on panel thickness
    {name: 'min_height',type: 'float', initial: 20, caption: "Minimum Height of Box:"},

    // number of slots to use in length dimension must be odd
    { name: 'length_slots', type: 'int', initial: 5, min: 1, max: 21, step: 2, caption: 'Number of Length Slots' },

    // number of slots to use in width dimension must be odd
    { name: 'width_slots', type: 'int', initial: 3, min: 1, max: 21, step: 2, caption: 'Number of Width Slots' },

    // Radius to use for corners (rubber feet are 12mm on amazon)
    { name: 'corner_radius', type: 'int', initial: 10, min: 6, max: 15, step: 1, caption: 'Corner Radius' },

    { name: 'Hardware', type: 'group', caption: 'Hardware and Materials' },
    // box material thickness
    {name: 'panel_thickness',type: 'float', initial: 1.57, caption: "Box Material Thickness:"},

    // standoffs are mounted inside of corner pieces
    {name: 'standoff_height',type: 'float', initial: 10, caption: "Standoff Height:"},

    // // hole clearance for mounting corners
    { name: 'hole_diameter', caption: 'Hole Size:', type: 'choice', values: [3.2, 4.3], initial: 1, captions: ["M3", "M4"]},

    { name: 'Presentation', type: 'group', caption: 'Presentation' },
    { name: 'quality', type: 'choice', caption: 'Quality', values: [0, 1], captions: ["Draft","High"], initial: 0 },
    { name: 'flat', caption: 'Flat or 3D:', type: 'choice', values: [0, 1], initial: 0, captions: ["Flat", "3D"]},
  ]
  return parameters;
}

function main(params){
  arc_resolution=(params.quality == "1")? 64:12;
  params.arc_resolution = arc_resolution
  var box = new sturdy_box(params);
 return box.cut_layout([[],[],[],[],[],[]]).center();
}

function sturdy_box(params){
    // Overall Case Length
    this.case_length=params.case_length == null? 80: params.case_length;

    // Overall Case Height
    this.case_width= params.case_width == null? 50: params.case_width;

    // minimum height of case, case will most likely be greater based on panel thickness
    this.min_height= params.min_height == null? 20: params.min_height;

    // box material thickness [ 3.1, 1.55, 5.7 ]
    this.panel_thickness= params.panel_thickness == null? 1.57: params.panel_thickness;

    // standoffs are mounted inside of corner pieces
    this.standoff_height= params.standoff_height == null? 10: params.standoff_height;

    // number of slots to use in length dimension must be odd
    this.length_slots= params.length_slots == null? 5: params.length_slots;

    // number of slots to use in width dimension must be odd
    this.width_slots= params.width_slots == null? 3: params.width_slots;

    // hole clearance for mounting corners
    this.hole_diameter= params.hole_diameter == null? 3.2: params.hole_diameter;
    this.hole_size=this.hole_diameter/2;

    this.hex_hole_diameter= params.hex_hole_diameter == null? 5.4: params.hex_hole_diameter;
    this.hex_hole_size=this.hex_hole_diameter/2;

    // Radius to use for corners (rubber feet are 12mm on amazon)
    this.corner_radius= params.corner_radius == null? 10: params.corner_radius;

    this.fn= params.arc_resolution == null? 16: params.arc_resolution;

    this.slop = 0;
    // display flat or 3D
    this.flat=0; // [0, 1]

    // clearance between parts for cutting
    this.part_separation=10;

    // Convienience value
    this.offset_to_side = 1.5*this.corner_radius;

    // Calculated values for inside dimensions of box
    // (you must subtract corner radius when placing holes!)
    this.inner_length=this.case_length - 2*this.corner_radius - this.panel_thickness;
    this.inner_width=this.case_width - 2*this.corner_radius - this.panel_thickness;

    // Value of front/back and left/right pieces
    this.side_length = this.case_length - 3*this.corner_radius;
    this.side_width = this.case_width - 3*this.corner_radius;

    // number of corners to contain brass standoffs
    this.hex_corners = Math.ceil(this.standoff_height/this.panel_thickness);

    // non standoff corners
    this.corner_pieces = Math.floor(this.min_height/this.panel_thickness) - this.hex_corners;

    // calculated height based on material thickness
    this.case_height=(this.corner_pieces + this.hex_corners)*this.panel_thickness;

    this.corner_piece = function(hex_hole){
      // corner_radius, panel_thickness, hex_hole, hex_hole_size, hole_size
      var cutout = square([this.corner_radius, this.panel_thickness]).center().translate([this.corner_radius, 0]);
      var corner = circle({r:this.corner_radius, fn:this.fn}).center()
        .subtract(cutout)
        .subtract(cutout.rotateZ(90));
      if (hex_hole === true){
          corner = corner.subtract(circle({r:this.hex_hole_size, fn:6}).center().rotateZ(15));
      } else {
          corner = corner.subtract(circle({r:this.hole_size, fn:this.fn}).center());
      }
      return corner;
    }

    this.rounded_square = function(width, height, radius){
      // width, height, radius
      return hull(
        circle({r:radius, fn:this.fn}).center().translate([radius, radius]),
        circle({r:radius, fn:this.fn}).center().translate([width - radius, radius]),
        circle({r:radius, fn:this.fn}).center().translate([radius, height - radius]),
        circle({r:radius, fn:this.fn}).center().translate([width - radius, height - radius]))
    }

    this.rounded_square_clamping_holes = function(length, width, radius){
      // width, height, radius, hole_size
      return union(
        circle({r:this.hole_size, fn:this.fn}).center().translate([radius, radius]),
        circle({r:this.hole_size, fn:this.fn}).center().translate([length - radius, radius]),
        circle({r:this.hole_size, fn:this.fn}).center().translate([radius, width - radius]),
        circle({r:this.hole_size, fn:this.fn}).center().translate([length - radius, width - radius])
      )
    }

    this.make_slots = function(length, slot_count,  panel_thickness, reverse, slop){
      // length, slot_count,  panel_thickness, reverse, slop
      var slot_size=length/slot_count;
      var offset= reverse?slot_size:0;
      var odd = (slot_count%2) == 1?1:0;
      var extra = odd && !reverse?1:0;
      var slots = [];
      for (var x = 0; x < Math.floor((slot_count + extra)/2); x++){
        slots.push(
          CAG.rectangle({corner2:[slot_size + slop, panel_thickness]})
          .translate([2*x*slot_size + offset -slop/2, 0]));
      }
      return union(slots);
    }

    this.side = function(plate_width, slots, children){
        return CAG.rectangle({corner2:[plate_width, this.case_height]})
            .union(this.make_slots(plate_width, slots, this.panel_thickness, true, this.slop).translate([0, this.case_height]))
            .union(this.make_slots(plate_width, slots, this.panel_thickness, true, this.slop).translate([0, -this.panel_thickness]))
            .subtract(children)
    }

    this.width_side = function(children){
      // case_width, corner_radius, width_slots
      return this.side(this.case_width - 3*this.corner_radius, this.width_slots, children);
    }

    this.length_side = function(children){
      // case_length, corner_radius, length_slots
      return this.side(this.case_length - 3*this.corner_radius, this.length_slots, children);
    }

    this.base = function(children){
      // case_length, case_width, length_slots, width_slots, offset_to_side,
      var side_length = this.case_length - 2*this.offset_to_side;
      var side_width = this.case_width - 2*this.offset_to_side;
      var length_cutout = this.make_slots(side_length, this.length_slots, this.panel_thickness, true, this.slop);
      var width_cutout =  this.make_slots(side_width, this.width_slots, this.panel_thickness, true, this.slop).rotateZ(90);

      return this.rounded_square(this.case_length, this.case_width, this.corner_radius)
            .subtract(this.rounded_square_clamping_holes(this.case_length, this.case_width, this.corner_radius))
            .subtract(length_cutout
                        .translate([this.offset_to_side, this.corner_radius - this.panel_thickness/2 ]))
            .subtract(length_cutout
                        .translate([this.offset_to_side, this.case_width -this.corner_radius - this.panel_thickness/2 ]))
            .subtract(width_cutout
                        .translate([this.corner_radius + this.panel_thickness/2, this.offset_to_side]))
            .subtract(width_cutout
                        .translate([this.case_length - this.corner_radius + this.panel_thickness/2, this.offset_to_side]))
            .subtract(children)
    }

    this.corners = function(){
      var rows = 4;
      var x, y;
      var pieces = [];
      var hex_pieces = [];
      for(y=0; y < rows; y++){
        for(x=0; x < this.corner_pieces; x++){
            pieces.push(this.corner_piece().translate([2*x*this.corner_radius + x*this.part_separation/2, -(2*this.corner_radius*y + y*this.part_separation)]));
        }
        for(x=0; x < this.hex_corners; x++){
          hex_pieces.push(this.corner_piece(true).translate([2*x*this.corner_radius + x*this.part_separation/2, -(2*this.corner_radius*y + y*this.part_separation)]));
        }
      }
      pieces = union(pieces);
      hex_pieces = union(hex_pieces).translate([this.corner_pieces*(2*this.corner_radius + this.part_separation/2) + this.part_separation, 0]);
      return union([pieces, hex_pieces]);
    }

    this.cut_layout = function(children){
      return union(
      // Base and Top
      this.base(children[0]).translate([-this.case_length/2, -this.case_width/2]),
      this.base(children[1]).translate([-this.case_length/2, this.case_width/2 + 2*this.part_separation + this.case_height]),

      // Front and Back
      this.length_side(children[2]).translate([this.offset_to_side -this.case_length/2, - this.case_width/2 - this.case_height - this.part_separation]),
      this.length_side(children[3]).rotateZ(180).translate([this.offset_to_side + this.side_length -this.case_length/2, this.case_height + this.case_width/2 + this.part_separation]),

      // Left and Right
      this.width_side(children[4]).rotateZ(270).translate([-this.case_length/2 - this.part_separation - this.case_height, this.side_width -this.case_width/2 + this.offset_to_side]),
      this.width_side(children[5]).rotateZ(90).translate([+this.case_length/2 + this.part_separation + this.case_height, -this.case_width/2 + this.offset_to_side]),

      // Corners
      this.corners().translate([-this.case_length/2 + this.corner_radius, -this.case_width/2 - this.case_height - 3*this.part_separation])
      )
    }

    this.text = function(my_string){
      var z0basis =  CSG.OrthoNormalBasis.Z0Plane();
      var l = vector_text(0,0,my_string);   // l contains a list of polylines to be drawn
      var o = [];
      l.forEach(function(pl) {                   // pl = polyline (not closed)
         o.push(rectangular_extrude(pl, {w: 1, h: 1}).projectToOrthoNormalBasis(z0basis));   // extrude it to 3D
      });
      return union(o);
    }
}
