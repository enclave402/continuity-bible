---
id: explainers-a-d-plain-language-answers
title: "Explainers A–D: plain-language help for look-dev, lens, framing and camera moves (raw answers)"
kind: owner-research
subjects: ["cinematography-language", "narrative-ssot"]
constructs: ["plain-language explainer", "look development", "style frame", "turnaround", "color key", "focal length", "35 mm equivalent", "angle of view", "aperture", "depth of field", "bokeh", "tilt-shift", "miniature faking", "lens distortion", "orthographic projection", "camera height", "camera angle", "shot size", "headroom", "lead room", "rule of thirds", "eyeline", "180-degree rule", "pan", "tilt", "dolly", "truck", "pedestal", "crane", "arc", "zoom", "rack focus", "handheld", "parallax", "easing", "safe default"]
evidence: mixed
source_keys: ["brown-cinematography-theory-practice-2016", "mercado-filmmakers-eye-2013", "winder-producing-animation-2019", "lasseter-1987-principles-traditional-animation", "nikon-understanding-focal-length", "nikon-understanding-maximum-aperture", "canon-ts-e-tilt-and-shift", "blender-manual-cameras", "zeiss-distortion-honlinger-nasse"]
origin: "research prompt COA-71 run 2026-10-28 by a coding agent inside this repository; sources checked the same session"
origin_title: "Explainers A-D: plain-language help for look-dev, lens, framing and camera moves (raw answers)"
captured: 2026-10-28
status: reviewed
summary: "Raw answers to the COA-71 research prompt: 73 terms from groups A to D of the COA-69 scope bracket (look development, optics and lens, camera position and framing, camera movement), each with a plain one-sentence meaning, what it does to the picture, when to pick it, a safe default, a sketch description, two beginner mistakes and a source. Checked against two cinematography textbooks, an animation production textbook, a SIGGRAPH paper and camera maker and software camera documentation, all recorded in SOURCES.json. Every explainer read at or below grade 8.9 on the machine's audit script. The reviewed set for readers is docs/3-reference/CAMERA-AND-LOOK-EXPLAINERS-A-D.md."
source_sha256: 94c570e4f0401da6b1dc784bc1a11a7a39dd6641d76ebf0ed1591cb634756ced
source_words: 9575
citations: 9
cited_primary: 4
cited_web: 5
figures: 0
---
# Explainers A–D: plain-language help for look-dev, lens, framing and camera moves (raw answers)

Raw output of the COA-71 research prompt (`research/corpus/prompts/explainers-a-d-plain-language-prompt.md`), run 2026-10-28 by a coding agent inside this repository, with each explainer checked in the same session against the sources listed at the end. Fields per term, as the prompt asked: (1) plain words, (2) what it does to the picture, (3) when to pick it, (4) if you are not sure, (5) sketch, (6) beginner mistakes, (7) source. Field texts are under 25 words. Terms come from the COA-69 scope bracket, groups A to D. Numeric defaults assume a 35 mm-equivalent lens scale and a perspective camera unless the entry says otherwise.

## [A] Look development

### Style frame
1. Plain words: One finished test picture that shows exactly how the film should look before you make the rest.
2. On the picture: Nothing yet. It is the target the real frames must match: colors, line, light, mood.
3. Pick it when: Before you draw scene one, like choosing a paint sample before painting the whole room.
4. Not sure? Make one style frame of your main character in your main place. One is enough to start.
5. Sketch: A small framed picture labeled "target", next to three blank frames with arrows pointing back to it.
6. Mistakes: Making ten frames in ten looks. Skipping it and fixing the look later, one frame at a time.
7. Source: Winder and Dowlatabadi 2019 (pre-production, visual development).

### Mood board
1. Plain words: A page of pictures, colors and textures that together show the feeling you want.
2. On the picture: Not a frame itself. It steers the colors and mood of every frame you make later.
3. Pick it when: At the start, when you can feel the film but cannot describe it yet. Like a collage for a room makeover.
4. Not sure? Collect six to twelve images you love, then write one line on why each one is there.
5. Sketch: A board with nine small squares: photos, color swatches, a texture, one word like "cozy".
6. Mistakes: Fifty images with no theme. Copying one image on the board instead of using the feeling.
7. Source: Winder and Dowlatabadi 2019 (visual development).

### Reference board
1. Plain words: A board of other people's pictures that show one exact thing, such as how rain or a kitchen looks.
2. On the picture: It tells the artist or image tool what to get right. It never gets copied.
3. Pick it when: You need a detail right, like how a bike's gears look, and a quick look saves guessing.
4. Not sure? Make one board per thing, and label each image with what it is there to show.
5. Sketch: Four photos of bikes, each with a label: "gears", "handlebars", "wheel size", "seat".
6. Mistakes: No labels, so no one knows what to take from each picture. Shipping a reference image in the film.
7. Source: Winder and Dowlatabadi 2019 (visual development, rights and clearances).

### Look bible
1. Plain words: The one document that collects every rule about how the film looks: colors, lines, light, characters, places.
2. On the picture: Every frame gets checked against it, so frame one and frame two hundred match.
3. Pick it when: More than one person or one tool makes pictures for the film, like a recipe book for a team.
4. Not sure? Start with one page: style frame, color list, "always" list, "never" list. Grow it as you go.
5. Sketch: A binder cover titled "Look", with tabs: Characters, Places, Colors, Light, Never.
6. Mistakes: Writing it once and never updating it. Keeping rules in chat messages instead of the bible.
7. Source: Winder and Dowlatabadi 2019 (style guide, pre-production).

### Turnaround
1. Plain words: A set of drawings of one character from the front, side, back and three-quarter view, all the same size.
2. On the picture: The character keeps the same shape and height whichever way they face.
3. Pick it when: A character will be seen from more than one side, which is almost always.
4. Not sure? Four views: front, three-quarter, side, back. Line up the eyes and feet across all four.
5. Sketch: Four small figures in a row, same height, with faint lines through head, waist and feet.
6. Mistakes: Different heights in each view. Only a front view, so the back is guessed every time.
7. Source: Winder and Dowlatabadi 2019 (model sheets); this repo's prop and wardrobe reference (four-view turnaround).

### Color key
1. Plain words: One small painting per scene that fixes the colors and light for that scene.
2. On the picture: Every frame in that scene shares the same palette and time of day.
3. Pick it when: A scene changes mood or time, like a sunny morning that turns into a storm.
4. Not sure? One color key per scene, painted small and loose. Pick five main colors.
5. Sketch: A strip of five thumbnails, one per scene, each a different blob of colors with the scene number under it.
6. Mistakes: Painting detail instead of color. Letting two frames in one scene use different sunsets.
7. Source: Winder and Dowlatabadi 2019 (color keys, color script).

### Style lock
1. Plain words: One sentence that names the look and tells the image tool what to keep every time.
2. On the picture: The same line, paint and finish in every frame, because the same sentence goes into every prompt.
3. Pick it when: Always. It already exists in this tool as a field on each render surface.
4. Not sure? Write one sentence: medium, line, color, light. Example: "flat ink lines, soft pastel fills, warm daylight".
5. Sketch: A sticky note with one sentence on it, stuck on the corner of three frames.
6. Mistakes: A paragraph instead of a sentence. Changing it halfway through the film.
7. Source: This repo's continuity card and shot sheet fields; Winder and Dowlatabadi 2019 (style guide).

### Reference-only provenance
1. Plain words: A tag that says where a picture came from and that it is only for looking at, never for copying or showing.
2. On the picture: Nothing should show it. The gate can flag a prompt that names the reference work or its characters.
3. Pick it when: You saved a frame from a show or an artist's page to study. Like a library book you must give back.
4. Not sure? Tag every outside picture "reference only". Write the source link next to it.
5. Sketch: A photo with a red "REF ONLY" stamp and a line underneath: "from: (link)".
6. Mistakes: Naming the show in your prompt. Letting a reference image slip into the final film.
7. Source: Winder and Dowlatabadi 2019 (rights, clearances and legal review).

### License note
1. Plain words: A short line saying who owns a picture or font and what you are allowed to do with it.
2. On the picture: Nothing. It decides whether the picture may appear in your film at all.
3. Pick it when: Every time you bring in something you did not make, like music, a photo, or a font.
4. Not sure? Write "license unknown: reference only, do not ship". Find the answer before it ships.
5. Sketch: A card with four blanks: Owner, License, Allowed, Link.
6. Mistakes: Treating "found on the internet" as free. Forgetting fonts and sound.
7. Source: Winder and Dowlatabadi 2019 (rights and clearances).

### Approval status
1. Plain words: A word on each picture that says whether it is still a try, is approved, or was turned down.
2. On the picture: Only approved pictures get copied into the film. Tries and rejects stay out.
3. Pick it when: Someone has to say yes before art moves on, like a teacher checking a draft.
4. Not sure? Three words: draft, approved, rejected. Everything starts as draft.
5. Sketch: Three frames with a label under each: "draft", "approved" with a green check, "rejected" with a red cross.
6. Mistakes: Using an unapproved frame because it was handy. Deleting rejected tries instead of keeping them labeled.
7. Source: Winder and Dowlatabadi 2019 (approval process, pre-production).

## [B] Optics / lens

### Focal length (mm)
1. Plain words: A number in millimeters that says how zoomed in your camera is. Small number sees wide; big number sees far and close.
2. On the picture: Low numbers fit more in and stretch space. High numbers fit less in and flatten space.
3. Pick it when: A wide room scene wants 24 to 35. A face wants 85. Everyday life looks like 50.
4. Not sure? Use 50. It is closest to how your own eyes see, so nothing looks strange.
5. Sketch: Three frames of the same person: 24 (whole room, big nose), 50 (normal), 85 (face fills frame, flat).
6. Mistakes: Using a wide lens up close, which bloats faces. Changing the number between two shots of the same moment.
7. Source: Nikon, Understanding Focal Length; Brown 2016 (lens chapter).

### 35 mm-equivalent focal length
1. Plain words: The lens number translated so every camera uses the same scale, the one old film cameras used.
2. On the picture: Nothing by itself. It makes "50" mean the same view on a phone, a camera, or a software camera.
3. Pick it when: You are writing lens numbers that another tool or person must read the same way.
4. Not sure? Always write the equivalent number. In this tool the lens field is already the equivalent.
5. Sketch: Two cameras, one big and one small, both pointing at one frame labeled "same view = 50 mm eq."
6. Mistakes: Copying a phone's real lens number (like 6 mm) into the field. Mixing real and equivalent numbers.
7. Source: Nikon, Understanding Focal Length (separate FX and DX ranges); Brown 2016 (sensor size and lens).

### Angle of view / field of view
1. Plain words: How wide a slice of the world the camera sees, measured in degrees like a slice of pie.
2. On the picture: A big angle shows a lot but small. A small angle shows little but big.
3. Pick it when: Some tools ask for degrees instead of millimeters. 50 mm is about 40 degrees across.
4. Not sure? Leave it to the lens number. If a tool wants degrees, use about 40.
5. Sketch: A camera seen from above with two lines making a pie wedge; wide wedge labeled 24 mm, narrow wedge 85 mm.
6. Mistakes: Setting both a lens number and an angle that disagree. Using 90 degrees or more, which warps edges.
7. Source: Nikon, Understanding Focal Length; Blender manual (lens in mm or as field of view).

### Crop factor
1. Plain words: A multiplier that fixes the lens number when a camera's sensor is smaller than the old film size.
2. On the picture: A smaller sensor sees a tighter view from the same lens, as if zoomed in.
3. Pick it when: You copy a lens number from a real small camera and need the equivalent. Phones and small cameras have one.
4. Not sure? Use 1.0, which means full frame and no fixing needed. Write equivalent numbers and forget it.
5. Sketch: A big rectangle (full frame) with a smaller rectangle inside it (cropped), both around the same picture.
6. Mistakes: Applying it twice. Applying it to a number that was already equivalent.
7. Source: Nikon, Understanding Focal Length (separate FX and DX ranges); Brown 2016.

### Aperture (f-stop)
1. Plain words: How big the hole in the lens is, written as f and a number. Small number, big hole; big number, small hole.
2. On the picture: A small number (f/2) blurs the background a lot. A big number (f/11) keeps everything sharp.
3. Pick it when: One face must pop from a busy street: f/2. A whole landscape must stay sharp: f/11.
4. Not sure? Use f/5.6. It gives a little softness behind the subject without hiding the place.
5. Sketch: Two circles, one wide open labeled f/2, one a small dot labeled f/16, each above a frame with blurry or sharp trees.
6. Mistakes: Thinking a bigger number means more blur. Blurring so hard the room disappears.
7. Source: Nikon, Understanding Maximum Aperture; Blender manual (F-Stop: lower values give more blur).

### T-stop
1. Plain words: Like the f-stop, but measured by how much light really gets through the glass. Used on movie lenses.
2. On the picture: Brightness matches from lens to lens. Blur is the same as the f-stop would give.
3. Pick it when: You are matching real movie footage shot with real lenses. Software cameras do not need it.
4. Not sure? Ignore it and use the f-stop. In this tool, only the f-stop matters.
5. Sketch: A lens ring marked "T2.8" next to one marked "f/2.8", with an equals sign and "same blur".
6. Mistakes: Treating T and f numbers as two different settings. Filling both with different values.
7. Source: Brown 2016 (lens chapter, f-stops and T-stops).

### Focus distance
1. Plain words: How far from the camera the sharpest point is, in the scene's own units like meters or feet.
2. On the picture: Whatever sits at that distance is crisp. Things nearer or farther go soft.
3. Pick it when: Always. Put it on the thing that matters, usually the eyes of the character who is talking.
4. Not sure? Set it to the main character's eyes. Many tools let you pick an object instead of a number.
5. Sketch: Camera on the left, a dotted line to a face on the right, a label "focus: 3 m" on the line.
6. Mistakes: Focus on the wall behind the character. Forgetting to move it when the character walks closer.
7. Source: Blender manual (focus object, focus distance); Brown 2016 (lens chapter).

### Focal plane / plane of focus
1. Plain words: An invisible flat wall at the focus distance. Everything touching that wall is sharpest.
2. On the picture: A thin sharp slice of the scene, square to the camera, with softness in front and behind.
3. Pick it when: Two characters must both be sharp: put them the same distance from the camera, on the same wall.
4. Not sure? Let it sit on the main character's face. You rarely set it apart from focus distance.
5. Sketch: Camera seen from above, a straight line in front of it, two figures standing exactly on the line.
6. Mistakes: One character a step closer, so one face is soft. Expecting a tilted or curved wall; it is flat unless the lens tilts.
7. Source: Brown 2016 (lens chapter); Canon, tilt and shift on TS-E lenses (the plane tilts only with tilt).

### Depth of field
1. Plain words: How much of the scene, from near to far, looks sharp at once.
2. On the picture: Shallow: one sharp face, soft everything else. Deep: sharp from the flowers to the mountains.
3. Pick it when: Shallow for feelings and faces. Deep for places, crowds and action you must follow.
4. Not sure? Medium. Use f/5.6 and a 50 lens; the character is sharp and the room still reads.
5. Sketch: A row of fence posts; in one frame only the middle post is sharp, in another all posts are sharp.
6. Mistakes: Shallow focus on a group, so half the faces are soft. Blur that hides where the scene happens.
7. Source: Nikon, Understanding Maximum Aperture; Brown 2016 (depth of field).

### Circle of confusion
1. Plain words: How big a point of light can smear before your eye calls it blurry. It sets where "sharp" ends.
2. On the picture: A bigger allowed smear counts more of the scene as sharp; a smaller one counts less.
3. Pick it when: Almost never by hand. Tools use it inside their depth of field math.
4. Not sure? Leave the tool's default. For full frame it is about 0.03 mm.
5. Sketch: A dot that grows into a soft disc in three steps, with a line marking "still looks sharp" after step two.
6. Mistakes: Changing it to get more blur; use the f-stop instead. Thinking it is a visible circle in the shot.
7. Source: Brown 2016 (depth of field, circle of confusion).

### Hyperfocal distance
1. Plain words: The focus distance where everything from about half that distance to the far horizon stays sharp.
2. On the picture: Nothing soft from the middle ground to the far distance. Good for big places.
3. Pick it when: A landscape or city shot with no single character, like a view from a hill.
4. Not sure? Do not use it. Focus on the character; let the tool handle the rest.
5. Sketch: Camera at left, a bracket from a midpoint to a far mountain labeled "all sharp".
6. Mistakes: Using it for a face scene, so the face is as sharp as the trash can behind it. Mixing it up with "far focus".
7. Source: Brown 2016 (depth of field, hyperfocal distance).

### Bokeh
1. Plain words: The look of the blurry parts of the picture, especially how out-of-focus lights turn into soft discs.
2. On the picture: Street lights behind a face become round glowing circles. Blur looks creamy or busy.
3. Pick it when: Night scenes with lights behind the character, like a city street or fairy lights.
4. Not sure? Round and soft. Most tools do this by default when you add blur.
5. Sketch: A dark frame with a sharp face outline and a cluster of soft glowing circles behind it.
6. Mistakes: Asking for bokeh in a bright, sharp scene; there is nothing to blur. Hexagon shapes when the look is soft.
7. Source: Blender manual (aperture blades shape the bokeh); Brown 2016 (lens chapter).

### Tilt-shift
1. Plain words: A lens that can tip or slide sideways instead of staying square to the camera.
2. On the picture: Tilt moves the sharp slice so it leans, or shrinks to a thin band. Shift straightens tall buildings.
3. Pick it when: Tall buildings whose sides must stay straight, or a "toy town" look with a thin sharp band.
4. Not sure? Off. Keep the lens square. Use the miniature controls below if you want the toy look.
5. Sketch: A camera with its lens pushed up (shift) in one drawing and tipped forward (tilt) in another.
6. Mistakes: Using tilt and expecting straight buildings; that is shift. Overdoing it so the picture looks broken.
7. Source: Canon, The Principles of Tilt and Shift on TS-E lenses.

### Scheimpflug principle
1. Plain words: The geometry rule behind tilt: when the lens tips, the sharp slice tips too, and the three planes meet in one line.
2. On the picture: You can make a table top sharp from near edge to far edge, or make only a thin stripe sharp.
3. Pick it when: You need a tilted sharp slice on purpose, like a long table seen from one end.
4. Not sure? Skip it. It is the "why" behind tilt, not a setting you type in.
5. Sketch: Three lines (lens, sensor, sharp slice) drawn so they all cross at one point.
6. Mistakes: Trying to set it as a number. Using it when a deeper depth of field would do the same job.
7. Source: Canon, tilt and shift on TS-E lenses (tilting the plane of focus); Brown 2016.

### Miniature faking (synthetic tilt-shift)
1. Plain words: A fake tilt-shift blur that makes a real-size scene look like a tiny model, with a sharp band and soft top and bottom.
2. On the picture: Streets look like toys. Only a flat stripe is sharp; above and below melts away.
3. Pick it when: You want a "toy town" or model-railway feeling, like a city seen from a tall roof.
4. Not sure? Off. If you try it, use it from a high angle; it barely works at eye level.
5. Sketch: A city from above: a crisp middle stripe, blurry roofs at top, blurry street at bottom.
6. Mistakes: Using it at eye level, which just looks like bad focus. Making the sharp band too thin to read faces.
7. Source: Canon, tilt and shift on TS-E lenses (tilt to restrict sharpness); Blender manual (depth of field).

### Focus band position
1. Plain words: Where the sharp stripe sits in the frame, from 0 at the bottom to 1 at the top.
2. On the picture: Whatever lies on that stripe is sharp; the picture softens away from it.
3. Pick it when: Your subject is not in the middle, like a character low in the frame at 0.3.
4. Not sure? 0.5, the middle. Then move it until it lands on your character.
5. Sketch: A frame with a flat bar; a ruler at the side marked 0 at the bottom, 1 at the top, bar at 0.5.
6. Mistakes: Leaving it in the middle while the character stands at the bottom. Typing pixels instead of a 0 to 1 number.
7. Source: Canon, tilt and shift (the sharp zone follows the tilted plane); this repo's shot sheet fields.

### Focus band height
1. Plain words: How tall the sharp stripe is, as a share of the frame, from 0 to 1.
2. On the picture: A thin band (0.15) is a strong toy look. A tall band (0.6) is gentle and mostly sharp.
3. Pick it when: A thin band for a model-town feel; a tall band when a face must stay fully sharp.
4. Not sure? About 0.33, one third of the frame. Faces stay readable and the effect still shows.
5. Sketch: Two frames: one with a thin sharp bar, one with a bar a third of the frame tall.
6. Mistakes: A band thinner than the character's head. Setting height but forgetting position.
7. Source: Canon, tilt and shift (tilt restricts sharpness to a narrow part); Blender manual (depth of field).

### Blur falloff
1. Plain words: How fast the picture goes from sharp to blurry as you leave the sharp stripe.
2. On the picture: Soft falloff fades gently. Hard falloff snaps from crisp to mush in a few lines.
3. Pick it when: Gentle for a dreamy look. Hard for a strong toy look or a comic-style focus stripe.
4. Not sure? Medium, and the same on top and bottom. It reads as a real lens.
5. Sketch: A gray bar that fades to white slowly on one side and in a sharp step on the other, labeled soft and hard.
6. Mistakes: Different top and bottom falloff by accident. Hard falloff across a face.
7. Source: Blender manual (depth of field); Brown 2016 (depth of field is a gradual zone, not an edge).

### Lens distortion: barrel
1. Plain words: Straight lines bow outward, as if the picture were wrapped around a barrel. Common on wide lenses.
2. On the picture: Door frames and horizons bulge. Faces near the edge look stretched.
3. Pick it when: You want a cheap action-camera or fisheye feel, like a skateboard video.
4. Not sure? None. Keep lines straight, which is also what most image tools do.
5. Sketch: A square grid whose outer lines bulge outward like a barrel.
6. Mistakes: Adding it to a tidy indoor scene by accident. Combining it with a wide lens on a face.
7. Source: Zeiss, Distortion (Hönlinger and Nasse); Brown 2016 (lens chapter).

### Lens distortion: pincushion
1. Plain words: Straight lines bend inward toward the center, like a cushion pulled tight in the middle. Common on long lenses.
2. On the picture: Edges of walls curve in. Usually small, but it ruins straight buildings.
3. Pick it when: Almost never on purpose. Only when matching real footage from a long zoom lens.
4. Not sure? None. Leave distortion at zero.
5. Sketch: A square grid whose outer lines pinch inward like a pincushion.
6. Mistakes: Confusing it with barrel; the bend goes the other way. Trying to fix it with the lens number.
7. Source: Zeiss, Distortion (Hönlinger and Nasse).

### Projection: perspective vs orthographic / isometric
1. Plain words: Perspective means far things look smaller, like real eyes. Orthographic means size never changes with distance; isometric is one tipped orthographic view.
2. On the picture: Perspective: roads narrow to a point. Orthographic: parallel lines stay parallel, like a map or a game board.
3. Pick it when: Perspective for stories. Orthographic or isometric for maps, diagrams, or a game-like look.
4. Not sure? Perspective. It is how people see, and every other term here assumes it.
5. Sketch: Two cubes: one with edges converging (perspective), one with edges parallel (orthographic), tipped so three faces show.
6. Mistakes: Mixing orthographic frames into a perspective film; the jump is jarring. Setting a lens number on an orthographic camera, which does nothing.
7. Source: Blender manual, camera types (perspective, orthographic).

## [C] Camera position and framing

### Camera height
1. Plain words: How high off the ground the camera sits, in the scene's units, such as meters.
2. On the picture: At eye height, people look like equals. Lower makes them tall; higher makes them small.
3. Pick it when: Always. A child's story at a child's eye height feels like being that child.
4. Not sure? The main character's eye height. For a standing adult that is about 1.6 meters.
5. Sketch: A side view: a figure, a camera on a stand at the figure's eye line, a label with the height.
6. Mistakes: Adult eye height for a scene about a dog or a child. Changing height between two shots of one talk.
7. Source: Brown 2016 (camera angles and height); Mercado 2013.

### Elevation / tilt angle
1. Plain words: How far the camera is tipped up or down, in degrees. Zero means level with the ground.
2. On the picture: Tip down and you see floor and the tops of heads. Tip up and you see ceiling and chins.
3. Pick it when: A tall tower needs tipping up. A tabletop needs tipping down.
4. Not sure? 0 degrees, level. Raise or lower the camera instead of tipping it.
5. Sketch: A camera seen from the side with a curved arrow; "+20" above, "-20" below, "0" in line with the ground.
6. Mistakes: Tipping up at a building so its walls lean inward. Tipping instead of moving the camera up.
7. Source: Brown 2016 (camera angles); Mercado 2013 (high and low angle shots).

### High angle
1. Plain words: The camera looks down on the subject from above their eye height.
2. On the picture: The subject looks smaller, weaker, or alone. You see more floor.
3. Pick it when: A character feels lost or small, like a kid alone in a big hallway.
4. Not sure? Use a gentle one, about 15 degrees down. Big angles shout.
5. Sketch: Camera high at left looking down a slanted line onto a small figure.
6. Mistakes: Using it on the hero in their strong moment. Using it on everyone, so nobody looks strong.
7. Source: Mercado 2013 (high angle); Brown 2016.

### Low angle
1. Plain words: The camera looks up at the subject from below their eye height.
2. On the picture: The subject looks bigger, stronger, or scary. You see more ceiling or sky.
3. Pick it when: A character takes charge or a monster appears, like a giant stepping over you.
4. Not sure? Gentle, about 15 degrees up. Save steep angles for the biggest moments.
5. Sketch: Camera low at left looking up a slanted line at a tall figure against the sky.
6. Mistakes: Low angle on a sad, small moment. Shooting up so close that the nose and chin bloat.
7. Source: Mercado 2013 (low angle); Brown 2016.

### Bird's-eye view
1. Plain words: The camera is very high and looks almost straight down, like a bird flying over.
2. On the picture: People turn into dots and patterns. You see the layout of the whole place.
3. Pick it when: Showing a maze, a crowd, or how far apart two people are.
4. Not sure? Do not use it for talking scenes. Use a wide shot at eye height instead.
5. Sketch: A town square from far above, tiny figures as dots, long shadows.
6. Mistakes: Using it so often it stops feeling special. Faces cannot be read, so no dialogue here.
7. Source: Mercado 2013 (high angle, extreme long shot); Brown 2016.

### Top-down / overhead
1. Plain words: The camera points straight down, 90 degrees, at a flat surface or a person below.
2. On the picture: A table or a bed becomes a flat map. Bodies look squashed.
3. Pick it when: Hands working on a desk, a recipe, a map, or someone lying on a bed.
4. Not sure? Only for flat things like desks and maps. Faces look odd from straight above.
5. Sketch: A camera drawn above a table, arrow straight down, the table shown as a flat rectangle with objects.
6. Mistakes: Trying to show a face this way. Forgetting the camera's shadow would fall into the shot.
7. Source: Brown 2016 (camera angles, overhead); Mercado 2013.

### Azimuth
1. Plain words: Which way around the character the camera stands, in degrees like a compass: 0 is straight in front.
2. On the picture: 0 is a face-on view. 45 shows the face and one cheek. 90 is a profile. 180 is the back.
3. Pick it when: Two people talking: one at 45 to the left, the other at 45 to the right.
4. Not sure? 45 degrees, the three-quarter view. It shows the face and gives it shape.
5. Sketch: A top-down circle around a figure, marks at 0 (front), 45, 90 (side), 180 (back), camera at 45.
6. Mistakes: Face-on at 0 for every shot, which looks like a passport photo. Jumping past 90 and flipping which way people face.
7. Source: Brown 2016 (frontal, three-quarter and profile angles).

### Dutch angle (roll)
1. Plain words: The camera is rolled sideways so the horizon slants.
2. On the picture: Walls and floors tilt. The world feels off balance or dangerous.
3. Pick it when: Something is wrong: a lie, a dream, a villain, a sudden shock.
4. Not sure? 0 degrees, level. Tilting by mistake is the most common framing error.
5. Sketch: A frame with the horizon drawn at a 15 degree slant and a leaning lamppost.
6. Mistakes: A small accidental tilt that just looks sloppy. Using it in a calm scene.
7. Source: Mercado 2013 (canted shot); Brown 2016.

### Extreme close-up (ECU)
1. Plain words: The frame shows one small part, like just the eyes or a hand on a key.
2. On the picture: That detail fills the screen. Nothing else is visible.
3. Pick it when: One tiny thing matters: a tear, a trembling finger, a phone screen.
4. Not sure? Hold it short and use it once. Follow it with a wider shot so viewers know where they are.
5. Sketch: A frame holding only a pair of eyes, eyebrows cut off at the top.
6. Mistakes: Living in it, so the audience loses the room. Cutting through the face at the mouth or chin.
7. Source: Mercado 2013 (extreme close up); Brown 2016 (shot sizes).

### Close-up (CU)
1. Plain words: The frame holds the face from about the shoulders up.
2. On the picture: Every feeling on the face is readable. The background is just a hint.
3. Pick it when: A character hears bad news or decides something. Feelings time.
4. Not sure? Use it for reactions, not for action. Cut the frame at mid chest, not at the neck.
5. Sketch: A frame with a head and the top of the shoulders, a little space above the hair.
6. Mistakes: Cutting at the neck, which looks like a floating head. Too much empty space above the head.
7. Source: Mercado 2013 (close up); Brown 2016.

### Medium close-up (MCU)
1. Plain words: The frame holds the head and chest, cut around mid chest.
2. On the picture: The face still reads clearly and you see a bit of posture and clothes.
3. Pick it when: Ordinary talking scenes, like two friends across a table.
4. Not sure? This or the medium shot are the safest for dialogue. Pick this when the face matters more.
5. Sketch: A frame cut just below the armpits, head near the top third.
6. Mistakes: Cutting exactly at the elbows or the chin. Mixing it with a medium shot of the same person mid-sentence.
7. Source: Mercado 2013 (medium close up); Brown 2016.

### Medium shot (MS)
1. Plain words: The frame holds a person from about the waist up.
2. On the picture: You see the face and the hands. Gestures and props read.
3. Pick it when: Someone talks while doing something, like cooking or holding a map.
4. Not sure? This is the default shot size for most scenes. Start here and move in or out.
5. Sketch: A frame cut at the waist, hands visible, head below the top edge.
6. Mistakes: Cutting at the knees or exactly at the waist joint. Using only medium shots, which feels flat.
7. Source: Mercado 2013 (medium shot); Brown 2016.

### Medium wide / cowboy shot (MWS)
1. Plain words: The frame holds a person from mid thigh up, named for westerns that needed the gun belt in view.
2. On the picture: Body language shows, and anything on the hips or in the hands is visible.
3. Pick it when: Stance matters: a standoff, a dance step, a tool on a belt.
4. Not sure? Use a medium shot unless the hips or a belt item must be seen.
5. Sketch: A frame cut at mid thigh, with a belt and holster clearly inside the frame.
6. Mistakes: Cutting right at the knees. Using it for a close emotional beat.
7. Source: Brown 2016 (shot sizes, cowboy shot); Mercado 2013 (medium long shot).

### Wide shot / long shot (WS / LS)
1. Plain words: The whole person is in the frame, head to feet, with some of the place around them.
2. On the picture: You see where they are and how they move. Faces are small.
3. Pick it when: Showing the place, a walk, a dance, or how two people stand apart.
4. Not sure? Open each scene with one so people know where they are. Then move in.
5. Sketch: A frame with a full standing figure, floor under the feet, a doorway and furniture around.
6. Mistakes: Cutting off the feet. Expecting the audience to read a small face's expression.
7. Source: Mercado 2013 (long shot); Brown 2016.

### Extreme wide shot (EWS / ELS)
1. Plain words: The place is the subject; people are tiny or not even there.
2. On the picture: Sky, land or city fill the frame. A figure is a speck that shows scale.
3. Pick it when: The story moves to a new place, or someone is alone in a big world.
4. Not sure? One per new location, held a few seconds. Skip it inside small rooms.
5. Sketch: A frame of hills and sky with a tiny figure on a road, smaller than a fingernail.
6. Mistakes: Trying to tell a feeling with it; faces are gone. Using it in a tiny room where it cannot exist.
7. Source: Mercado 2013 (extreme long shot); Brown 2016.

### Establishing shot
1. Plain words: The first shot of a scene that shows where and when we are.
2. On the picture: The whole place, often wide, with clues to time of day and weather.
3. Pick it when: The scene jumps to a new place or a new time, like "next morning, at school".
4. Not sure? Start every new location with one wide shot. Two or three seconds is enough.
5. Sketch: A school front at morning, bus pulling up, sun low, frame labeled "Scene 3 start".
6. Mistakes: Skipping it, so viewers do not know they moved. Making it so long the scene stalls.
7. Source: Mercado 2013 (establishing shot); Brown 2016.

### Insert
1. Plain words: A short close shot of an object or detail cut into the scene, like a note or a clock.
2. On the picture: The object fills the frame for a moment so everyone sees it clearly.
3. Pick it when: The audience must read or notice a thing, like a text message or a key turning.
4. Not sure? Keep it under two seconds and match the light of the scene around it.
5. Sketch: A frame of a hand holding a note with big readable words, nothing else.
6. Mistakes: An insert lit differently from the scene. Showing a detail nobody needs.
7. Source: Brown 2016 (shot types, inserts); Mercado 2013.

### Two-shot
1. Plain words: A frame that holds two people at once.
2. On the picture: You see both faces and the space between them. Their distance tells the relationship.
3. Pick it when: Two characters talk or react together, like sharing a secret or an argument.
4. Not sure? Medium two-shot, both from the waist up, a little room between them.
5. Sketch: Two figures side by side from the waist up, slightly angled toward each other.
6. Mistakes: One person cut in half at the edge. Both facing the camera like a photo instead of each other.
7. Source: Mercado 2013 (two shot); Brown 2016.

### Over-the-shoulder (OTS)
1. Plain words: The camera looks past one person's shoulder at the other person's face.
2. On the picture: A blurry shoulder and ear at the edge; the other face clear in the middle.
3. Pick it when: Conversations. Pair it with the mirror shot from the other side.
4. Not sure? Put the shoulder in the left third for one person and the right third for the other.
5. Sketch: A dark shoulder and head edge at lower left, a lit face at right center.
6. Mistakes: Shoulder covering half the frame. Jumping to the other side of the pair, so they swap places (see the 180-degree rule).
7. Source: Mercado 2013 (over the shoulder); Brown 2016.

### Point of view (POV)
1. Plain words: The camera shows exactly what a character sees, as if we were inside their head.
2. On the picture: No sign of the character. Their hands may appear. The view moves as they would.
3. Pick it when: We should feel what they feel: peeking through a door, reading a letter, falling.
4. Not sure? Show the character looking first, then the POV, then their reaction. That tells us whose eyes these are.
5. Sketch: Three small frames: a face looking left; what they see; the face reacting.
6. Mistakes: A POV with no shot of who is looking. Camera height that does not match the character's eyes.
7. Source: Mercado 2013 (subjective shot); Brown 2016 (POV).

### Headroom
1. Plain words: The empty space between the top of the head and the top of the frame.
2. On the picture: A little space looks natural. Too much makes the person sink; none makes them cramped.
3. Pick it when: Every shot with a person in it. Tighter shots need less; wider shots need more.
4. Not sure? Eyes about one third down from the top. That gives the right headroom in most sizes.
5. Sketch: Three frames: too much space above the head, none at all, and a correct small gap with a check mark.
6. Mistakes: Centering the head, which leaves a huge gap above it. Chopping off the top of the hair in a medium shot.
7. Source: Mercado 2013 (headroom, composition basics); Brown 2016.

### Lead room / nose room
1. Plain words: Extra space in front of a face or a moving thing, on the side it looks or travels toward.
2. On the picture: A person looking right sits a bit left, so they have room to look into.
3. Pick it when: Someone looks or walks sideways, like a cyclist or a character in profile.
4. Not sure? Put the character on the third away from where they face. Leave the open side for their gaze.
5. Sketch: A profile face on the left third, empty space on the right, arrow from nose into the space.
6. Mistakes: Face jammed against the edge it looks at. Lead room on the wrong side, so they look out of frame.
7. Source: Mercado 2013 (lead room, look room); Brown 2016.

### Rule of thirds
1. Plain words: Split the frame into three columns and three rows, and put important things on the lines or crossings.
2. On the picture: Eyes sit on the top line, horizons on the top or bottom line. Nothing is dead center.
3. Pick it when: Any shot you are unsure how to arrange. It is the starter grid.
4. Not sure? Eyes on the top third line, horizon on a third line. Center only on purpose.
5. Sketch: A frame with two vertical and two horizontal lines, a face at the top-left crossing.
6. Mistakes: Horizon across the exact middle. Treating it as a law and never breaking it for effect.
7. Source: Mercado 2013 (rule of thirds); Brown 2016 (composition).

### Eyeline
1. Plain words: The direction a character's eyes point, which tells us what they are looking at.
2. On the picture: If two people talk, one looks slightly right and the other slightly left, so they seem to see each other.
3. Pick it when: Every cut between two people, or between a person and a thing.
4. Not sure? Make each person look toward the other's side of the frame, a little off the lens, never into it.
5. Sketch: Two frames side by side: left face looks right, right face looks left, a dotted line joining their eyes.
6. Mistakes: Both looking the same way, so they seem to look at a third thing. Looking straight into the lens by accident.
7. Source: Brown 2016 (eyelines, cinematic continuity); Mercado 2013.

### 180-degree rule / screen direction
1. Plain words: Draw a line between two characters and keep the camera on one side of it. Left stays left and right stays right.
2. On the picture: The two people never swap sides between cuts. Anyone walking keeps going the same way.
3. Pick it when: Any scene with two people, or a journey across the frame.
4. Not sure? Pick a side at the start of the scene and stay there. Cross only with a visible camera move.
5. Sketch: Top view: two figures, a dashed line through them, a shaded half circle on one side holding all camera positions.
6. Mistakes: One shot from the far side, so the characters flip. A car driving right, then left, in the same trip.
7. Source: Brown 2016 (the 180 degree line, screen direction); Mercado 2013; this repo's laterality reference.

## [D] Camera movement

### Pan
1. Plain words: The camera stays in one spot and turns left or right, like turning your head.
2. On the picture: The view slides sideways. Near things move faster than far things.
3. Pick it when: Following someone walking past, or showing a room from one place.
4. Not sure? Slow, and finish on something that matters. Start still, end still.
5. Sketch: A camera on a dot with a curved arrow left to right, two frames showing the start and end views.
6. Mistakes: Panning fast, which smears the picture. Panning across nothing with no reason to stop.
7. Source: Brown 2016 (camera movement); Mercado 2013 (pan shot).

### Tilt
1. Plain words: The camera stays in one spot and tips up or down, like nodding.
2. On the picture: The view climbs a tower or slides from a face down to hands.
3. Pick it when: Revealing something tall, or moving from feet to face as a character enters.
4. Not sure? Slow, and end level if people will talk next.
5. Sketch: A camera on a dot with a curved arrow up and down, frames showing floor then ceiling.
6. Mistakes: Confusing it with crane up; tilt turns, crane lifts. Ending on a slanted, empty frame.
7. Source: Brown 2016 (camera movement); Mercado 2013 (tilt shot).

### Dolly push-in
1. Plain words: The whole camera rolls forward toward the subject.
2. On the picture: The subject grows and the background slides past them. It feels like leaning in.
3. Pick it when: A realization, a secret, a moment that tightens, like reading a hidden message.
4. Not sure? Slow and short: from a medium shot to a close-up over three to five seconds.
5. Sketch: Camera on wheels with an arrow toward a figure, two frames: smaller figure, then larger.
6. Mistakes: Pushing in on nothing happening. Using zoom instead; zoom does not move the background the same way.
7. Source: Brown 2016 (move in, dolly); Mercado 2013 (dolly shot).

### Dolly pull-out
1. Plain words: The whole camera rolls backward, away from the subject.
2. On the picture: The subject shrinks and the place grows around them. It feels like letting go or being left alone.
3. Pick it when: An ending, a loss, or revealing where someone really is.
4. Not sure? Slow. End on a wide shot that could be the last shot of the scene.
5. Sketch: Camera on wheels with an arrow away from a figure, two frames: large figure, then small in a big room.
6. Mistakes: Pulling out in the middle of a conversation. Backing into a wall in the scene's layout.
7. Source: Brown 2016 (move out, dolly); Mercado 2013 (dolly shot).

### Truck
1. Plain words: The whole camera slides sideways, left or right, keeping its facing.
2. On the picture: Like looking out a train window: near things rush, far things crawl.
3. Pick it when: Walking beside a character, or passing along a row of things.
4. Not sure? Match the character's walking speed and keep them in the same spot in frame.
5. Sketch: Camera on a rail with an arrow sideways, a figure walking in the same direction beside it.
6. Mistakes: Mixing it up with pan; truck moves, pan turns. Letting the character drift out of frame.
7. Source: Brown 2016 (tracking and crab moves); Mercado 2013 (tracking shot).

### Pedestal
1. Plain words: The whole camera rises or lowers straight up or down, staying level, like an elevator.
2. On the picture: The view rises along a body or a shelf without tipping. Horizons stay level.
3. Pick it when: Moving from a child's eye height to an adult's, or climbing a bookshelf.
4. Not sure? Use tilt instead unless lines must stay straight. Keep it slow.
5. Sketch: A camera on a pole with an up-down arrow, frames showing shoes then face, both level.
6. Mistakes: Confusing it with tilt. Rising so high the character's head leaves the frame.
7. Source: Brown 2016 (boom up and down, camera movement).

### Crane / jib
1. Plain words: The camera swings on a long arm, so it can fly up, over, and down in one move.
2. On the picture: A sweeping lift from a face to a whole street, or a drop from the sky to a door.
3. Pick it when: Big openings and endings, or revealing how big a place is.
4. Not sure? Use one at the start or end of the film only. Keep the move smooth and slow.
5. Sketch: A camera on a long arm with a pivot, a curved arrow from low to high, two frames: a face, a rooftop view.
6. Mistakes: Craning in a small talking scene. Fast swings that make the picture swim.
7. Source: Brown 2016 (crane moves); Mercado 2013 (crane shot).

### Arc / orbit
1. Plain words: The camera circles around the subject while keeping it in the middle of the frame.
2. On the picture: The background spins behind a steady subject. It feels like a big moment or a trap.
3. Pick it when: A character stands in the eye of a storm: a decision, a dance, a surrounded hero.
4. Not sure? A quarter circle, slow. Full circles get dizzy fast.
5. Sketch: Top view: a figure in the center, a camera on a circle around them with an arrow along the circle.
6. Mistakes: Crossing the 180 line without meaning to; it flips left and right. Spinning twice.
7. Source: Brown 2016 (circle track, arc); Mercado 2013.

### Zoom (optical)
1. Plain words: The camera stays still and the lens changes its number, so the view magnifies without the camera moving.
2. On the picture: Everything gets bigger together and space flattens. The background does not slide like a dolly.
3. Pick it when: A quick jab of attention, like a news camera finding a face in a crowd.
4. Not sure? Use a dolly instead for most shots. If you zoom, keep it short.
5. Sketch: A still camera, a frame with a small face, then the same frame with the face big and the background big too.
6. Mistakes: Zooming in a dreamy scene where a dolly would feel real. Slow zooms that nobody notices but that flatten the picture.
7. Source: Brown 2016 (zoom versus dolly); Mercado 2013 (zoom shot).

### Digital zoom
1. Plain words: Cropping the picture and stretching it bigger, with no lens change.
2. On the picture: The same picture gets grainy and soft. Nothing about the view actually changes.
3. Pick it when: Only when fixing a frame later and you have more pixels than you need.
4. Not sure? Never in the plan. Change the lens number or move the camera instead.
5. Sketch: A frame, then a small rectangle inside it blown up to full size with jagged edges.
6. Mistakes: Treating it like a real zoom. Zooming past the size your delivery needs.
7. Source: Brown 2016 (punch-in versus optical zoom; image resolution).

### Rack focus / focus pull
1. Plain words: The sharp point moves from one thing to another during the shot, like your eyes refocusing.
2. On the picture: A face goes soft as the phone behind it turns sharp, or the other way around.
3. Pick it when: Two things in one frame matter one after the other, like a face and then what it sees.
4. Not sure? One rack per shot, slow enough to see. Start sharp on what matters first.
5. Sketch: Two frames: sharp face and blurry phone, then blurry face and sharp phone, with an arrow between.
6. Mistakes: Racking in a deep-focus shot, where nothing changes. Racking so fast it reads as a mistake.
7. Source: Brown 2016 (focus pulls); Blender manual (focus object, focus distance).

### Handheld
1. Plain words: The camera is carried by a person, so it shakes and drifts a little.
2. On the picture: A nervous, real, "I was there" feeling. Lines wobble slightly.
3. Pick it when: Panic, chases, news, or a scene that should feel raw.
4. Not sure? Off. Use a steady camera. If you want a little life, add a tiny slow drift.
5. Sketch: A frame with slightly wavy edges and a small arrow cluster showing jitter.
6. Mistakes: So much shake that viewers feel sick. Handheld in a calm scene for no reason.
7. Source: Brown 2016 (handheld and Steadicam); Mercado 2013.

### Locked-off
1. Plain words: The camera sits on a stand and does not move at all during the shot.
2. On the picture: A perfectly still frame. Only the characters move. It feels calm and clear.
3. Pick it when: Most dialogue scenes, jokes that need a still frame, and any time in doubt.
4. Not sure? This is the safe default for every shot. Add movement only with a reason.
5. Sketch: A camera on a three-legged stand with a small padlock icon, a frame with a still room.
6. Mistakes: Thinking a still camera is boring; still frames make movement inside them stronger. Adding a drift on the next shot without meaning to.
7. Source: Brown 2016 (static shots, motivated movement).

### Drone / aerial
1. Plain words: The camera flies high above the ground, moving freely over the scene.
2. On the picture: Rooftops, roads and fields sweep by. People are tiny.
3. Pick it when: Opening a film over a town, or a journey across land.
4. Not sure? One at the start, slow and straight. Do not fly during conversations.
5. Sketch: A camera with small propellers above a town, an arrow forward, a frame of rooftops.
6. Mistakes: Flying in a scene with faces that must be read. A spinning camera that loses the direction of the journey.
7. Source: Brown 2016 (aerial shots, camera movement).

### Parallax
1. Plain words: When the camera moves, near things slide across the picture faster than far things.
2. On the picture: Depth you can feel: a fence whips past, hills barely move. This is what makes a dolly feel real.
3. Pick it when: You want a flat scene to feel deep: place something near, something mid, something far, then move.
4. Not sure? Let it happen. Put at least one object close to the camera before any dolly or truck.
5. Sketch: Two frames of a sideways move: the near post jumps a long way, the far tree barely moves, arrows of different length.
6. Mistakes: Moving the camera in a scene with nothing near, so it feels like a zoom. Painting layers that all slide at one speed.
7. Source: Brown 2016 (dolly versus zoom; depth cues in camera movement).

### Move speed
1. Plain words: How fast the camera moves, written as a word like slow, or as units per second.
2. On the picture: Slow feels calm or tense. Fast feels urgent or playful. Too fast smears the picture.
3. Pick it when: Every moving shot. Match the speed to the mood and to the character's own speed.
4. Not sure? Slow. For a push-in, cover the distance in three to five seconds.
5. Sketch: A frame with three arrows labeled slow, medium, fast, the fast one with a blur trail.
6. Mistakes: Fast moves on a soft lens, which smears. Different speeds for the same kind of move in one scene.
7. Source: Brown 2016 (camera movement, motivated moves); Lasseter 1987 (timing).

### Easing (ease-in / ease-out)
1. Plain words: The move starts slowly, speeds up, then slows to a stop, instead of jerking on and off.
2. On the picture: Smooth, natural motion, like a real hand pushing a cart. No sudden jolts.
3. Pick it when: Every camera move that starts or stops inside the shot.
4. Not sure? On, at both ends. Most tools call it "ease in and out" or "slow in, slow out".
5. Sketch: A speed curve shaped like a gentle hill next to a boxy curve with sharp corners labeled "no easing".
6. Mistakes: Turning it off, so moves snap. Easing so long the camera never reaches speed.
7. Source: Lasseter 1987 (slow in and slow out); Brown 2016 (camera movement).

## How the sources were checked

- The four books and the paper were located through Crossref by DOI and recorded in `research/SOURCES.json` by `scripts/research/verify.mjs`. Chapter pointers in the Source fields come from the agent's knowledge of those texts; page numbers were not verified and are not given.
- The Nikon, Canon and Blender pages were fetched and read in this session; the claims used (focal length ranges, aperture and depth of field, tilt and shift, perspective and orthographic cameras, depth of field settings) were taken from the page text. The Zeiss paper was located and recorded; its summary here (barrel bows outward, pincushion inward) is the standard definition the paper gives in its introduction.
- Numeric defaults that are not in a source (focus band 0.5 and 0.33, 15 degree gentle angles, three to five seconds for a push-in, 1.6 meters eye height) are the agent's working defaults for a planning tool, chosen to be conservative. They are marked `expert-opinion` where they enter `research/FINDINGS.jsonl`.

## Works cited

- Brown, Blain. *Cinematography: Theory and Practice*, 3rd ed. Routledge, 2016. (https://doi.org/10.4324/9781315667829)
- Mercado, Gustavo. *The Filmmaker's Eye*. Routledge, 2013. (https://doi.org/10.4324/9780080959344)
- Winder, Catherine, and Zahra Dowlatabadi. *Producing Animation*, 3rd ed. CRC Press, 2019. (https://doi.org/10.1201/9780429490521)
- Lasseter, John. "Principles of traditional animation applied to 3D computer animation." SIGGRAPH 1987. (https://doi.org/10.1145/37401.37407)
- Nikon USA. "Understanding Focal Length." Learn and Explore. (https://www.nikonusa.com/learn-and-explore/a/tips-and-techniques/understanding-focal-length.html)
- Nikon USA. "Understanding Maximum Aperture." Learn and Explore. (https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/understanding-maximum-aperture)
- Canon USA. "The Principles of Tilt and Shift on TS-E lenses." Support article ART174524. (https://support.usa.canon.com/kb/s/article/ART174524)
- Blender Foundation. "Cameras." Blender Manual. (https://docs.blender.org/manual/en/latest/render/cameras.html)
- Hönlinger, B., and H. H. Nasse. "Distortion." Carl Zeiss Camera Lens Division technical article. (https://lenspire.zeiss.com/photo/app/uploads/2022/02/technical-article-distortion.pdf)
