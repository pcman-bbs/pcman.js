// Listen the input events and handle the typed words

function InputHandler(view) {
    this.view = view;
    this.isComposition = false; // Fix for FX 12+

    this.load();
}

InputHandler.prototype = {
    load: function() {
        var input = this.view.input;

        this.composition_start = {
            view: this,
            handleEvent: function(e) {
                this.view.compositionStart(e);
            }
        };
        input.addEventListener('compositionstart', this.composition_start, false);

        this.composition_end = {
            view: this,
            handleEvent: function(e) {
                this.view.compositionEnd(e);
            }
        };
        input.addEventListener('compositionend', this.composition_end, false);

        this.key_press = {
            view: this.view,
            handleEvent: function(e) {
                this.view.onkeyPress(e);
            }
        };
        if(typeof(Components) !== 'undefined') // FX only
            addEventListener('keypress', this.key_press, false);
        else // GC, IE, etc.
            addEventListener('keydown', this.key_press, false);

        this.text_input = {
            view: this,
            handleEvent: function(e) {
                this.view.textInput(e);
            }
        };
        input.addEventListener('input', this.text_input, false);
    },

    unload: function() {
        var input = this.view.input;
        input.removeEventListener('compositionstart', this.composition_start, false);
        input.removeEventListener('compositionend', this.composition_end, false);
        if(typeof(Components) !== 'undefined') // FX only
            removeEventListener('keypress', this.key_press, false);
        else // GC, IE, etc.
            removeEventListener('keydown', this.key_press, false);
        input.removeEventListener('input', this.text_input, false);
        this.compositionEnd({target: {}}); // Hide the input proxy
    },

    compositionStart: function(e) {
        this.isComposition = true; // Fix for FX 12+
        this.view.onCompositionStart(e); // Show the input proxy
    },

    compositionEnd: function(e) {
        this.view.onCompositionEnd(e); // Hide the input proxy
        this.isComposition = false; // Fix for FX 12+

        // For compatibility of FX 10 and before
        //this.textInput(e);
        //if(isBrowser(['IE']))
        //    this.textInput(e);
    },

    textInput: function(e) {
        if(this.isComposition) // Fix for FX 12+
            return;
        if(e.target.value) {
            this.view.onTextInput(e.target.value);
        }
        e.target.value='';
    }
}

module.exports = InputHandler;
