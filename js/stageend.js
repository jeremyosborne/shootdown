(function(exports) {



// The end.
exports.end = {
    id: "end",
    enter: function() {
        var game = this.game;
        var defaultFont = game.defaultFont;
        var TextOverlay = game.TextOverlay;

        // TODO calculate the final score here for display.
        this.theEndText = new TextOverlay({
            alignx: "center",
            aligny: "center",
            text: "the end. thank you for playing.",
            font: defaultFont,
        });
        this.finalScoreText = new TextOverlay({
            alignx: "center",
            aligny: "center",
            paddingy: 25,
            text: "Your final score is: " + "N/A",
            font: defaultFont,
        });
    },
    heartbeat: function(msDuration) {
        var display = this.game.display;
        display.fill('#000000');
        this.theEndText.draw(display);
        this.finalScoreText.draw(display);
    },
    // Text Overlays, created during enter initialization.
    theEndText: null,
    finalScoreText: null,
};



})(Stages);