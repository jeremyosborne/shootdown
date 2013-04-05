(function(exports) {



// The end.
exports.end = {
    id: "end",
    enter: function() {
        var game = this.game;
        var defaultFont = game.local("defaultFont");
        var TextOverlay = game.TextOverlay;

        this.theEndText = new TextOverlay({
            alignx: "center",
            aligny: "center",
            text: "this is the end.",
            font: defaultFont,
        });
        this.theEndText2 = new TextOverlay({
            alignx: "center",
            aligny: "center",
            paddingy: 25,
            text: "thank you for playing shootdown.",
            font: defaultFont,
        });
        this.finalScoreText = new TextOverlay({
            alignx: "center",
            aligny: "center",
            paddingy: 50,
            text: "Your final score is: " + game.local.score.sum(),
            font: defaultFont,
        });
        this.restartMessage = new TextOverlay({
            alignx: "center",
            aligny: "center",
            // Skip a line.
            paddingy: 100,
            text: "Click to restart.",
            font: defaultFont,
        });
    },
    heartbeat: function(msDuration) {
        var game = this.game;
        var display = game.display;
        var event = game.gamejs.event;
        var MOUSE_DOWN = event.MOUSE_DOWN;

        event.get().forEach(function(e) {
            if (e.type === MOUSE_DOWN) {
                // Transition back to game.
                game.activateStage("thegame");
            }
        });

        display.fill('#000000');
        this.theEndText.draw(display);
        this.theEndText2.draw(display);
        this.finalScoreText.draw(display);
        this.restartMessage.draw(display);
    },
    // Text Overlays, created during enter initialization.
    theEndText: null,
    theEndTest2: null,
    finalScoreText: null,
    restartMessage: null,
};



})($g.local.Stages);
