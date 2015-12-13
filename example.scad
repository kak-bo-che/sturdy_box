include <sturdy_box.scad>
case_length=80;
case_width=50;
min_height=20;
panel_thickness=1.57; // [ 3.1, 1.55, 5.7 ]
standoff_height=10;
length_slots=5;
width_slots=3;
flat=1; // [0, 1]

cut_layout() {
  translate([inner_length/2, inner_width/2])
      text(text="Bottom", halign = "center", valign = "center");
  translate([inner_length/2, inner_width/2])
      text(text="Top", halign = "center", valign = "center");
  translate([(side_length)/2, case_height/2])
      text(text="Front", halign = "center", valign = "center");
  translate([(side_length)/2, case_height/2])
      text(text="Back", halign = "center", valign = "center");
}