function getParameterDefinitions() {
var parameters = [
    { name: 'Dimensions', type: 'group', caption: 'Overall Dimensions' },
    // Overall Case Length
     {name: 'case_length',type: 'float', initial: 80, caption: "Box Length:"},

    // Overall Case Height
    {name: 'case_width',type: 'float', initial: 50, caption: "Box Width:"},

    // minimum height of case, case will most likely be greater based on panel thickness
    {name: 'min_height',type: 'float', initial: 20, caption: "Minimum Internal Height of Box:"},

    // number of slots to use in length dimension must be odd
    { name: 'length_slots', type: 'int', initial: 5, min: 1, max: 21, step: 2, caption: 'Number of Length Slots' },

    // number of slots to use in width dimension must be odd
    { name: 'width_slots', type: 'int', initial: 3, min: 1, max: 21, step: 2, caption: 'Number of Width Slots' },

    // Radius to use for corners (rubber feet are 12mm on amazon)
    { name: 'corner_radius', type: 'int', initial: 10, min: 6, max: 15, step: 1, caption: 'Corner Radius' },

    { name: 'Hardware', type: 'group', caption: 'Hardware and Materials' },

    // box material thickness
    {name: 'panel_thickness',type: 'float', initial: 3, caption: "Box Material Thickness:"}, //1.57

    // standoffs are mounted inside of corner pieces
    {name: 'standoff_height',type: 'float', initial: 10, caption: "Standoff Height:"},

    // // hole clearance for mounting corners
    { name: 'hole_diameter', caption: 'Hole Size:', type: 'choice', values: [3.2, 4.3], initial: 1, captions: ["M3", "M4"]},

    { name: 'Presentation', type: 'group', caption: 'Presentation' },
    { name: 'quality', type: 'choice', caption: 'Quality', values: [0, 1], captions: ["Draft","High"], initial: 0 },
    { name: 'flat', caption: 'Display:', type: 'choice', values: [0, 1, 2], initial: 0, captions: ["Flat", "3D", "Exploded"]},
  ]
  return parameters;
}

function main(params){
  arc_resolution=(params.quality == "1")? 64:12;
  params.arc_resolution = arc_resolution
  var box = new sturdy_box(params);

  if (params.flat === '0'){
    return box.cut_layout().center();
  } else if (params.flat === '1') {
    return box.box_3d(false).center();
  } else {
    return box.box_3d(true).center();
  }
}
function text(my_string){
  var z0basis =  CSG.OrthoNormalBasis.Z0Plane();
  var l = vector_text(0,0,my_string);   // l contains a list of polylines to be drawn
  var o = [];
  l.forEach(function(pl) {
     o.push(rectangular_extrude(pl, {w: 1, h: 1}).projectToOrthoNormalBasis(z0basis));   // extrude it to 3D
  });
  return union(o);
}

function explode(args){
  this.get_center = function(obj){
    var bounds = obj.getBounds();
    return new CSG.Vector3D((bounds[1].x + bounds[0].x)/2,
                            (bounds[1].y + bounds[0].y)/2,
                            (bounds[1].z + bounds[0].z)/2);
  }

  var solid = union(args);
  var origin = solid.getBounds()[0].z;
  var center = this.get_center(solid);

  var new_objects = [];

  for (var i = 0; i < args.length; i++) {
    var bounds = args[i].getBounds();
    var order = 0;
    if (Math.round((bounds[0].z + bounds[1].z)/2*10) == Math.round(center.z*10)){
      order = Math.abs(origin - center.z);
    } else if (Math.abs(center.z - bounds[0].z) > Math.abs(center.z - bounds[1].z)){
      order = Math.abs(origin - bounds[0].z);
    } else {
      order = Math.abs(origin - bounds[1].z);
    }
    new_objects.push(args[i].translate([0,0, 2.5*(order)]));
  };
  return new_objects;
}

function sides(length, width, height){
    this.top = function(){return []}
    this.bottom = function(){return []}
    this.front = function(){return []}
    this.back = function(){return []}
    this.left = function(){return []}
    this.right = function(){return []}
}

function sturdy_box(params){
    this.sides = new sides();

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
    this.flat = params.flat == null? 0: params.flat; // [0, 1]

    // clearance between parts for cutting
    this.part_separation=10;

    // Convenience value
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

    // non-standoff corners
    this.corner_pieces = Math.ceil(this.min_height/this.panel_thickness) - this.hex_corners;

    // calculated height based on material thickness
    this.case_height=(this.corner_pieces + this.hex_corners)*this.panel_thickness;

    CAG.prototype.acrylic = function(thickness){
      return this.extrude({offset:[0,0,thickness]}).setColor(0.7,1,1,0.9);
    }
  }
  sturdy_box.prototype = {
    screw: function(){
      // measured
      if (Math.floor(this.hole_diameter) === 3){
        var screw_diameter = 3;
        var head_height = 3;
        var head_diameter = 5.3;
        var key_diameter = 2.5;
      } else {
        // these are all BS values for demonstration
        var screw_diameter = 4;
        var head_height = 4;
        var head_diameter = 6.3;
        var key_diameter = 3;
      }
      return union(
       circle({r:head_diameter/2}).center().extrude({offset:[0,0,head_height]})
                                  .subtract(circle({r:key_diameter/2, fn:6}).center()
                                                                            .extrude({offset:[0,0,head_height]})
                                                                            .translate([0,0,head_height/3])),
       circle({r:screw_diameter/2}).center().extrude({offset:[0,0,-Math.floor(this.case_height/2)]})
      ).setColor(0.5,0.5,0.5);
    },

    standoff: function(){
      var hex_radius = 5.26/2;
      return circle({r:hex_radius, fn:6}).center()
                  .subtract(circle({r:this.hole_size}).center())
                  .extrude({offset:[0,0,this.standoff_height]})
                  .center().setColor(1, 0.75, 0);
    },

    corner_piece: function(hex_hole){
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
    },

    clamping_holes: function(part){
      if (!part){
        part = circle({r:this.hole_size, fn:this.fn}).center();
      }
      return union(
        part.translate([this.corner_radius, this.corner_radius]),

        part.translate([this.case_length - this.corner_radius, this.corner_radius]),

        part.translate([this.corner_radius, this.case_width - this.corner_radius]),

        part.translate([this.case_length - this.corner_radius, this.case_width - this.corner_radius])
      )
    },

    make_slots: function(length, slot_count,  panel_thickness, reverse, slop){
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
    },

    side: function(plate_width, slots, children){
        return CAG.rectangle({corner2:[plate_width, this.case_height]})
            .union(this.make_slots(plate_width, slots, this.panel_thickness, true, this.slop).translate([0, this.case_height]))
            .union(this.make_slots(plate_width, slots, this.panel_thickness, true, this.slop).translate([0, -this.panel_thickness]))
            .subtract(children)
    },

    width_side: function(children){
      return this.side(this.case_width - 3*this.corner_radius, this.width_slots, children);
    },

    length_side: function(children){
      return this.side(this.case_length - 3*this.corner_radius, this.length_slots, children);
    },

    base: function(children){
      var side_length = this.case_length - 2*this.offset_to_side;
      var side_width = this.case_width - 2*this.offset_to_side;
      var length_cutout = this.make_slots(side_length, this.length_slots, this.panel_thickness, true, this.slop);
      var width_cutout =  this.make_slots(side_width, this.width_slots, this.panel_thickness, true, this.slop).rotateZ(90);

      var box = CAG.roundedRectangle({corner2: [this.case_length, this.case_width], roundradius: this.corner_radius, resolution: this.fn});
      return box
            .subtract(this.clamping_holes())
            .subtract(length_cutout
                        .translate([this.offset_to_side, this.corner_radius - this.panel_thickness/2 ]))
            .subtract(length_cutout
                        .translate([this.offset_to_side, this.case_width -this.corner_radius - this.panel_thickness/2 ]))
            .subtract(width_cutout
                        .translate([this.corner_radius + this.panel_thickness/2, this.offset_to_side]))
            .subtract(width_cutout
                        .translate([this.case_length - this.corner_radius + this.panel_thickness/2, this.offset_to_side]))
            .subtract(children)
    },

    corners: function(){
      var rows = 4;
      var x, y;
      var pieces = [];
      var hex_pieces = [];
      for(y=0; y < rows; y++){
        for(x=0; x < this.corner_pieces; x++){
            pieces.push(this.corner_piece()
                            .translate([2*x*this.corner_radius + x*this.part_separation/2, -(2*this.corner_radius*y + y*this.part_separation)]));
        }
        for(x=0; x < this.hex_corners; x++){
          hex_pieces.push(this.corner_piece(true)
                              .translate([2*x*this.corner_radius + x*this.part_separation/2, -(2*this.corner_radius*y + y*this.part_separation)]));
        }
      }
      pieces = union(pieces);
      hex_pieces = union(hex_pieces)
                      .translate([this.corner_pieces*(2*this.corner_radius + this.part_separation/2) + this.part_separation, 0]);
      return union([pieces, hex_pieces]);
    },

    // An insert for printing graphics or 3D cut patterns
    paper_insert: function(){
      var box = new CAG();
      var corner_length = this.case_length - 2*this.corner_radius;
      var corner_width = this.case_width - 2*this.corner_radius;

      var bottom_l = this.corner_piece(true).translate([-corner_length/2, -corner_width/2]);
      var bottom_r = this.corner_piece(true).rotateZ(90).translate([corner_length/2, -corner_width/2]);
      var top_l = this.corner_piece(true).rotateZ(-90).translate([-corner_length/2, corner_width/2]);
      var top_r = this.corner_piece(true).rotateZ(-180).translate([corner_length/2, corner_width/2]);

      var inside_rectangle = CAG.rectangle({center:[0,0], radius: [(corner_length)/2 - this.panel_thickness/2 , (corner_width)/2 - this.panel_thickness/2]})
                                .subtract(circle({r:5}).center().translate([-corner_length/2, -corner_width/2]))
                                .subtract(circle({r:5}).center().translate([corner_length/2, -corner_width/2]))
                                .subtract(circle({r:5}).center().translate([-corner_length/2, corner_width/2]))
                                .subtract(circle({r:5}).center().translate([corner_length/2, corner_width/2]))
                                .subtract(CAG.rectangle({center:[0,0], radius: [(corner_length)/2 - 4 , (corner_width)/2 - 4]}));
      var box = box
                .union(bottom_l)
                .union(bottom_r)
                .union(top_l)
                .union(top_r)
                .union(inside_rectangle);

      return box;
    },

    box_3d: function(exploded){
      function corner_stack(obj){
        var stack = [];
        var x = 0;
        var hex_offset = obj.hex_corners*obj.panel_thickness;
        var first_offset = floor(obj.corner_pieces/2)*obj.panel_thickness;
        for(x=0; x < Math.floor(obj.corner_pieces/2); x++){
            stack.push(obj.corner_piece()
                          .acrylic(obj.panel_thickness)
                          .translate([0,0,x*obj.panel_thickness]));
        }

        for(x=0; x < Math.ceil(obj.corner_pieces/2); x++){
            stack.push(obj.corner_piece()
                          .acrylic(obj.panel_thickness)
                          .translate([0,0,first_offset + hex_offset + x*obj.panel_thickness]));
        }

        // hex
        for(x=0; x < obj.hex_corners; x++){
            stack.push(obj.corner_piece(true)
                          .acrylic(obj.panel_thickness)
                          .translate([0,0,first_offset + x*obj.panel_thickness]));
        }
        stack.push(obj.standoff().rotateZ(15).translate([0,0,(obj.case_height)/2]));
        return stack;
      }
      var box = []
      // Base and Top
      box.push(
        this.base(this.sides.top(this))
            .acrylic(this.panel_thickness)
            .translate([0,0,this.case_height + this.panel_thickness]))
      box.push(
        this.base(this.sides.bottom(this))
            .acrylic(this.panel_thickness))

      // Front and Back
      box.push(
        this.length_side(this.sides.front(this))
            .acrylic(this.panel_thickness)
            .rotateX(90)
            .translate([this.offset_to_side, this.corner_radius + this.panel_thickness/2,this.panel_thickness]))

      box.push(
        this.length_side(this.sides.back(this))
            .acrylic(this.panel_thickness)
            .rotateX(90).rotateZ(180)
            .translate([this.offset_to_side + this.side_length, this.case_width - this.corner_radius - this.panel_thickness/2,this.panel_thickness]))

      // Left and Right
      box.push(
        this.width_side(this.sides.left(this))
            .acrylic(this.panel_thickness)
            .rotateX(90).rotateZ(270)
            .translate([this.corner_radius + this.panel_thickness/2, this.offset_to_side + this.side_width, this.panel_thickness]))
      box.push(
        this.width_side(this.sides.right(this))
            .acrylic(this.panel_thickness)
            .rotateX(90).rotateZ(90)
            .translate([this.case_length - this.corner_radius - this.panel_thickness/2, this.offset_to_side, this.panel_thickness]))

      box.push(this.clamping_holes(this.screw().rotateX(180)));
      box.push(this.clamping_holes(this.screw()).translate([0,0,this.case_height + 2*this.panel_thickness]));

      // Corners
           box = box.concat(
            corner_stack(this).map(
              function(piece){return piece.translate([this.corner_radius,
                                                      this.corner_radius,
                                                      this.panel_thickness])},
              this
              )
           )
         box = box.concat(
          corner_stack(this).map(
            function(piece){return piece.rotateZ(90)
                                        .translate([this.case_length - this.corner_radius,
                                                    this.corner_radius,
                                                    this.panel_thickness])},
            this
            )
         )
         box = box.concat(
          corner_stack(this).map(
            function(piece){return piece.rotateZ(270)
                                        .translate([this.corner_radius,
                                                    this.case_width - this.corner_radius,
                                                    this.panel_thickness])},
            this
            )
         )
         box = box.concat(
          corner_stack(this).map(
            function(piece){return piece.rotateZ(180)
                                        .translate([this.case_length - this.corner_radius,
                                                    this.case_width - this.corner_radius,
                                                    this.panel_thickness])},
            this
            )
         )
      if (exploded === true){
        box  = explode(box);
      }
      return union(box);
    },

    cut_layout: function(){
      var half_length = this.case_length/2;
      var half_width =  this.case_width/2;
      var space = this.part_separation

      return union(
      // Base and Top
      this.base(this.sides.top(this))
          .translate([-half_length, half_width + 2*space + this.case_height]),

      this.base(this.sides.bottom(this))
          .translate([-half_length, -half_width]),

      // Front and Back
      this.length_side(this.sides.front(this))
          .translate([this.offset_to_side -half_length, - half_width - this.case_height - space]),
      this.length_side(this.sides.back(this))
          .rotateZ(180)
          .translate([this.offset_to_side + this.side_length -half_length, this.case_height + half_width + space]),

      // Left and Right
      this.width_side(this.sides.left(this))
          .rotateZ(270)
          .translate([-half_length - space - this.case_height, this.side_width -half_width + this.offset_to_side]),
      this.width_side(this.sides.right(this))
          .rotateZ(90)
          .translate([+half_length + space + this.case_height, -half_width + this.offset_to_side]),

      // Corners
      this.corners()
          .translate([-half_length + this.corner_radius , -(half_width + this.case_height + this.corner_radius + 2*space )])
      )
    }
}
