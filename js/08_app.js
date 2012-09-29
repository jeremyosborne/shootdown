// Nomenclature and style
// g -> if used, refers to a local reference to the JSGameSoup class.
// c -> if used, refers to a local reference to the Canvas drawing context.
window.onload = function() {

    // Shortcut the SimpleClass to just Class for this file.
    var Class = SimpleClass;
    
    // The "world" provides the background, as well as the tracking area
    // for the mouse.
    var World = Class(function() {
        var canvas = document.querySelector("#game");
        this.width = canvas.width;
        this.height = canvas.height;
    }, {
        // Every frame the world is responsible for clearing the canvas of
        // any previous drawings.
        draw: function(c, g) {
            g.clear();
            g.background('rgba(100, 100, 100, 1.0)');
        },
        // To detect mouseclicks in the world, define the bounding box of the
        // world and listen to the click event.
        pointerBox: function() {
            return [0, 0, this.width, this.height];
        },
        pointerDown: function() {
            // Add a new flak explosion everytime we mouse down.
            // The Flak object will manage its own animation, and eventual
            // removal from the map.
            game.addEntity(new Flak(game.pointerPosition[0], game.pointerPosition[1]));
        },
        // In the update of the world, check for collisions.
        update: function(g) {
            var targets = g.entities.filter(function(entity) {
                return entity instanceof Target;
            });
            var flak = g.entities.filter(function(entity) {
                return entity instanceof Flak;
            });
            collide.aabb(targets, flak);
        }
    });

    
    
    
    // Keep track of score in the game.
    var Score = Class(function() {
        this.shotsFired = 0;
        this.targetsAppeared = 0;
        this.targetsDestroyed = 0;
        // Links to on screen display of score.
        this.display = {
            shotsFired: document.querySelector("#score .shots-fired"),
            targetsAppeared: document.querySelector("#score .targets-appeared"),
            targetsDestroyed: document.querySelector("#score .targets-destroyed"),
            net: document.querySelector("#score .net")
        }
    }, {
        // Display the score on the page.
        update: function() {
            this.display.shotsFired.innerHTML = this.shotsFired;
            this.display.targetsAppeared.innerHTML = this.targetsAppeared;
            this.display.targetsDestroyed.innerHTML = this.targetsDestroyed;
            
            this.display.net.innerHTML = -this.shotsFired - this.targetsAppeared + 5*this.targetsDestroyed;
        },
        // Increments a particular score
        increment: function(tallyName) {
            this[tallyName] += 1;
        }
    });
    
    
    
    // Animates an explosion on the game field.
    var Flak = Class(function(x, y) {
        // The center point of the flak explosion.
        this.x = x;
        this.y = y;
        
        // Increase shots fired.
        score.increment("shotsFired");
    }, {
        // The current (and initial) radius in pixels of the explosion.
        radius: 1,
        // The maximum radius in pixels of the explosion.
        maxRadius: 25,
        // Are we expanding or contracting?
        expanding: true,
        // Every frame, increase, or decrease, the size of the flak radius.
        update: function(g) {
            if (this.expanding) {
                this.radius += 1;
                if (this.radius >= this.maxRadius) {
                    this.expanding = false;
                }
            }
            else {
                // Expanding, and might disappear.
                this.radius -= 1;
                if (this.radius < 1) {
                    // Remove the spent flak
                    g.delEntity(this);
                }
            }
        },
        // Draw our flak circle.
        draw: function(c, g) {
            // Modify the color based on radius.
            var green = 5 * this.radius;
            green = green < 255 ? green : 255;
            
            c.fillStyle = "rgba(255, "+ green+", 0, 0.7)";
            // Use default canvas drawing methods.
            c.beginPath();
            c.arc(this.x, this.y, this.radius, 0, Math.PI*2, true);
            c.fill();
        },
        // Use a rectangular collision for the explosion.
        get_collision_aabb: function() {
            // If our radius describes the circle, grab a collision bounding box 
            // that fits within our circle.
            // Bounding box returned is described from the upper left corner as
            // [x, y, w, h].
            var radius = this.radius;
            var radiusSquared = radius * radius;
            var diameter = radius*2;
            var offset = Math.sqrt(radiusSquared + radiusSquared);
            return [this.x-offset, this.y-offset, diameter, diameter];
        }        
    });
    
    
    // Our mouse tracker is not shown as part of the canvas, but we take
    // advantage of the update method to update our mouse coords.
    var MouseCoords = Class(function() {
        this.domX = document.querySelector("#pointer-coords .x");
        this.domY = document.querySelector("#pointer-coords .y");
    }, {
        // The update method "draws" the coordinates into the DOM.
        update: function() {
            // Last mouse position within the game field.
            var pos = game.pointerPosition;
            this.domX.innerHTML = pos[0];
            this.domY.innerHTML = pos[1];
        }        
    });
    
    
    
    // Use a crosshair to track the mouse around the game.
    var Crosshair = Class(function() {
        // Only when we mouse over show the crosshair.
        // Coordinates are always relative to the canvas.
        this.x = undefined;
        this.y = undefined;
        // Radial distance of each hand of the crosshair (in pixels).
        this.radius = 10;
    }, {
        // Called every frame to grab the coordinates of the cross hair.
        update: function() {
            // Last mouse position within the game field.
            var pos = game.pointerPosition;
            this.x = pos[0];
            this.y = pos[1];
        },
        // Called every frame to redraw the crosshair on the game field.
        draw: function(c) {
            var x = this.x,
                y = this.y,
                radius = this.radius;
            // Use canvas methods directly to draw.
            c.strokeStyle = 'rgba(255, 255, 255, 1.0)';
            
            c.beginPath();
            // Vertical line.
            c.moveTo(x, y-radius);
            c.lineTo(x, y+radius);
            // Horizontal line.
            c.moveTo(x-radius, y);
            c.lineTo(x+radius, y);
            c.stroke();
        }        
    });



    // Targets will fly from left to right across the playing field.
    // Targets start at a random height.
    var Target = Class(function(y) {
        // Initial offset is off the screen.
        var x = this.x = -(this.width);
        this.y = y;
        // How fast does the target move (random).
        // Between 1 and 10 pixels per frame.
        this.speed = Math.floor(Math.random() * 10 + 1);
        // The relative shape of the polygon.
        this.poly = [
            [0, 0],
            [20, 10],
            [0, 20]
        ];
        // Set the initial location of the polygon.
        for (var i = 0; i < this.poly.length; i++) {
            this.poly[i][0] += x;
            this.poly[i][1] += y;            
        }
        
        // Increase targets that have appeared.
        score.increment("targetsAppeared");
    }, {
        // How wide and tall is the target (in pixels)?
        height: 20,
        width: 20,
        // Are we currently exploding?
        exploding: false,
        // Move the target from left to right across the game field.
        update: function(g) {
            this.x += this.speed;
            // The target only moves from left to right.
            for (var i = 0; i < this.poly.length; i++) {
                this.poly[i][0] += this.speed;
            }
            if (this.x > world.width) {
                // No longer a target, delete from the playfield.
                g.delEntity(this);
            }
            else if (this.exploding) {
                g.delEntity(this);
                // When the target explodes, add flak where the target was.
                g.addEntity(new Flak(this.x + this.width/2,
                    this.y + this.height/2));
            }
        },
        draw: function(c, g) {
            c.strokeStyle = "rgba(255, 255, 255, 1.0)";
            c.fillStyle = "rgba(255, 255, 255, 1.0)";
            // The polygon method will draw and fill the polygon according to
            // whatever style has been set on the canvas context.
            g.polygon(this.poly);
        },
        // Use a rectangular collision for the target.
        get_collision_aabb: function() {
            return [this.x, this.y, this.width, this.height];
        },
        // Targets respond to collisions.
        collide_aabb: function() {
            this.exploding = true;
            
            // Trigger an explosion sound.
            audio.playExplosion();
            
            // Increase targets we have shot down.
            score.increment("targetsDestroyed");
        }
    });


    //------------------------------------------------------------------- MAIN
    // Early warning if in an old browser that doesn't support certain things.
    if (!document.querySelector || !Array.prototype.filter) {
        alert("This example needs a newer browser that supports document.querySelector.");
    }

    // Initialize the game objects and run the game.
    var game = new JSGameSoup(document.querySelector("#game"), 40);
    // We will need the dimensions provided by world.
    var world = new World();
    // Load the explosion audio.
    var audio = new AudioManager();
    audio.load("audio/explosion1.wav", "explosion1");
    audio.load("audio/explosion2.wav", "explosion2");
    audio.load("audio/explosion3.wav", "explosion3");
    audio.load("audio/explosion4.wav", "explosion4");
    // Add a method to our audio instance that will play
    // a random explosion.
    audio.playExplosion = function() {
        var i = Math.floor(Math.random() * 4 + 1);
        this.play("explosion"+i);
    };
    // We will need access to the score.
    var score = new Score();
    game.addEntity(world);
    game.addEntity(score);
    game.addEntity(new MouseCoords());
    game.addEntity(new Crosshair());
    game.launch();

    // Repeatedly add targets to the game field.
    setInterval(function() {
        // Choose a random height for the target
        var targetY = Math.floor(Math.random() * (world.height-Target.prototype.height) + 1);
        game.addEntity(new Target(targetY));
    }, 1000);
};
